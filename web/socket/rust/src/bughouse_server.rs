use actix::prelude::*;
use actix::{Actor, Context, Handler, ResponseFuture};
use actix_web::*;
use bughouse::{BoardID, BughouseMove};
use bytestring::ByteString;
use chrono::prelude::*;
// use actix_web_actors::ws::WebsocketContext;
use std::collections::HashMap;
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::{Arc, RwLock};
// use timer::Timer;
// use std::thread;

use crate::connection_mgr::{ConnID, ConnectionMgr, UserID};
use crate::db::{Db, PregameRatingSnapshot, UserRatingSnapshot};
use crate::error::Error;
use crate::firebase::*;
use crate::game::{Game, GameID, GamePlayers, GameResult};
use crate::game_json::{GameJson, GameJsonKind};
use crate::games::Games;
use crate::messages::{
    ClientMessage, ClientMessageKind, ServerMessage, ServerMessageKind,
};
use crate::seeks::{SeekMap, Seeks};
use crate::time_control::TimeControl;
use crate::users::{User, Users};
use once_cell::sync::OnceCell;

// pub type ChanMsg = (Recipient<ClientMessage>, String);

pub struct BughouseServer {
    users: Arc<Users>,
    conns: Arc<ConnectionMgr>,
    seeks: Seeks,
    loopback: Recipient<ServerMessage>,
    games: Games,
    partners: HashMap<UserID, UserID>,
    db: Arc<Db>,
    // timer: Arc<Timer>,
    // tx: Mutex<Sender<ChanMsg>>,
}

pub struct ServerHandler {
    db: Arc<Db>,
    game_checkers: RwLock<HashMap<GameID, SpawnHandle>>,
    // timer: Arc<Timer>
    // server: &'static BughouseServer,
}

impl ServerHandler {
    pub fn new(
        db: Arc<Db>,
        // timer: Arc<Timer>
    ) -> Self {
        ServerHandler {
            db,
            game_checkers: RwLock::new(HashMap::new()),
            // timer
        }
    }
}

impl Actor for ServerHandler {
    /// Just need ability to communicate with other actors.
    type Context = Context<Self>;
}

impl ServerHandler {
    fn srv(&self, ctx: &mut Context<Self>) -> &'static BughouseServer {
        BughouseServer::get(
            self.db.clone(),
            ctx.address().recipient(),
            // self.timer.clone(),
        )
    }
}

fn get_result(game: Arc<RwLock<Game>>) -> Option<GameResult> {
    let rgame = game.read().unwrap();
    rgame.get_result()
}

fn get_game_status(game: Arc<RwLock<Game>>) -> (Option<GameResult>, i32) {
    let result = get_result(game.clone());
    if result.is_none() {
        let mut wgame = game.write().unwrap();
        wgame.update_all_clocks();
        (None, wgame.get_min_to_move_clock_ms())
    } else {
        (result, 0)
    }
}

impl Handler<ServerMessage> for ServerHandler {
    type Result = ResponseFuture<Result<ClientMessage, Error>>;

    fn handle(
        &mut self,
        msg: ServerMessage,
        ctx: &mut Context<Self>,
    ) -> Self::Result {
        match msg.kind {
            ServerMessageKind::Auth(recipient, token) => {
                // Authenticate token uid
                let fut = self.srv(ctx).authenticate(recipient, token);
                Box::pin(async move { fut.await })
            }
            ServerMessageKind::CreateGame(time_ctrl, rated, players) => {
                let fut = self.srv(ctx).start_new_game(time_ctrl, rated, players);
                Box::pin(async move { fut.await })
            }
            ServerMessageKind::FormTable(time_ctrl, rated, uid) => {
                let fut = self.srv(ctx).form_table(time_ctrl, rated, uid);
                Box::pin(async move { fut.await })
            }
            ServerMessageKind::CheckGame(game_id) => {
                println!("checking game_id: {}", game_id);
                let srv = self.srv(ctx);
                if let Some(lgame) = srv.get_game(&game_id) {
                    let (result, min_clock_ms) = get_game_status(lgame.clone());
                    if min_clock_ms > 0 {
                        let dur = std::time::Duration::from_millis(
                            min_clock_ms as u64,
                        );
                        let mut checkers = self.game_checkers.write().unwrap();
                        if let Some(handle) = checkers.get(&game_id) {
                            ctx.cancel_future(*handle);
                        }
                        let checker = ctx.run_later(dur, move |_self, c| {
                            c.address().do_send(ServerMessage::new(
                                ServerMessageKind::CheckGame(game_id),
                            ));
                        });
                        checkers.insert(game_id, checker);
                        srv.notify_game_observers(lgame);
                    } else if result.is_none() {
                        srv.end_game(lgame);
                    }
                }
                Box::pin(async {
                    Ok(ClientMessage::new(ClientMessageKind::Empty))
                })
            }
            ServerMessageKind::RecordMove(duration, game_id, board_id, mv) => {
                let fut =
                    self.srv(ctx).record_move(duration, game_id, board_id, mv);
                Box::pin(async move { fut.await })
            }
        }
    }
}

static INSTANCE: OnceCell<BughouseServer> = OnceCell::new();

impl BughouseServer {
    pub fn get(
        db: Arc<Db>,
        loopback: Recipient<ServerMessage>,
        // timer: Arc<Timer>,
    ) -> &'static BughouseServer {
        // let timer = Arc::new(Timer::new());
        INSTANCE.get_or_init(move || BughouseServer::new(db, loopback))
    }

    fn new(
        db: Arc<Db>,
        loopback: Recipient<ServerMessage>, // , timer: Arc<Timer>
    ) -> Self {
        // let (tx, rx): (Sender<ChanMsg>, Receiver<ChanMsg>) = mpsc::channel();
        // let _receiver = thread::spawn(move || {
        //     for (recipient, msg) in rx {
        //         let res = block_on(async {
        //             BughouseServer::authenticate(Auth {
        //                 token: msg,
        //                 recipient,
        //             }).await
        //         });
        //     }
        // });
        //
        // let db = Db::new().await?;
        let users = Arc::new(Users::new(db.clone()));
        let conns = Arc::new(ConnectionMgr::new(db.clone(), users.clone()));
        BughouseServer {
            conns: conns.clone(),
            users: users.clone(),
            loopback,
            seeks: Seeks::new(users),
            games: Games::new(conns),
            partners: HashMap::new(),
            db,
            // timer,
            // tx: Mutex::new(tx),
        }
    }

    pub fn get_seeks(&'static self) -> SeekMap {
        self.seeks.get_seeks()
    }

    pub fn get_conns(&self) -> Arc<ConnectionMgr> {
        self.conns.clone()
    }

    pub fn add_seek(
        &'static self,
        time_ctrl: TimeControl,
        rated: bool,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        let conn_id = ConnectionMgr::get_conn_id(&recipient);
        let user_lock =
            self.user_from_conn(conn_id).ok_or(Error::AuthError {
                reason: "User not yet authenticated".to_string(),
            })?;
        let user = user_lock.read().unwrap();
        if self.games.is_in_game(user.get_uid()) {
            return Err(Error::InGame(user.handle.to_string()));
        }
        println!("adding seeker");
        self.seeks.add_seeker(&time_ctrl, &user.id)?;
        if let Some(players) = self.seeks.form_game(&time_ctrl) {
            println!("forming game...");
            // Send message to self and attempt async DB game creation
            let msg = ServerMessage::new(ServerMessageKind::CreateGame(
                time_ctrl, rated, players,
            ));
            self.loopback.try_send(msg)?;
        }
        Ok(())
    }

    pub fn notify_game_observers(&'static self, game: Arc<RwLock<Game>>) {
        self.games.notify_game_observers(game);
    }

    pub fn is_authenticated(&'static self, conn_id: ConnID) -> bool {
        self.conns.user_from_conn(conn_id).is_some()
    }

    pub async fn authenticate(
        &'static self,
        recipient: Recipient<ClientMessage>,
        token: String,
    ) -> Result<ClientMessage, Error> {
        // ) -> impl Future<Output = Result<ClientMessage, Error>> {
        let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
        write!(stream, "{}\n{}\n", FIRE_AUTH, token)?;
        let mut resp = String::new();
        stream.read_to_string(&mut resp)?;
        let (label, payload) = resp.split_once(':').unwrap();
        match label {
            "uid" => {
                let fid = payload.trim_end();
                println!("auth.uid: {}", fid);
                let conn_id = self.add_conn(recipient.clone(), fid).await?;
                println!("conn_id: {}", conn_id);

                let send_res = recipient
                    .send(ClientMessage::new(ClientMessageKind::Auth(conn_id)))
                    .await;
                if let Err(e) = send_res {
                    eprintln!("Couldn't send AUTH message: {}", e);
                }
                return Ok(ClientMessage::new(ClientMessageKind::Auth(
                    conn_id,
                )));
            }
            "err" => {
                return Err(Error::AuthError {
                    reason: payload.to_string(),
                });
            }
            _ => {
                let msg = format!("Unknown response: {}", resp);
                return Err(Error::AuthError { reason: msg });
            }
        }
    }

    pub fn user_from_conn(&self, conn_id: ConnID) -> Option<Arc<RwLock<User>>> {
        self.conns.user_from_conn(conn_id)
    }

    // If, on the offchance, that a user disconnects right after game start (and is not present),
    // try fetching user from DB.
    pub async fn maybe_user_from_uid(
        &'static self,
        uid: &UserID,
    ) -> Option<Arc<RwLock<User>>> {
        if let Some(u) = self.users.get(uid) {
            return Some(u);
        } else if let Some(user_row) = self.db.get_user(uid).await {
            return Some(self.users.add(User::from(user_row)));
        }
        None
    }

    pub async fn user_from_uid(
        &'static self,
        uid: &UserID,
    ) -> Result<Arc<RwLock<User>>, Error> {
        if let Some(u) = self.maybe_user_from_uid(uid).await {
            return Ok(u);
        }
        Err(Error::UnknownUID(*uid))
    }

    pub async fn rating_snapshot_from_uid(
        &'static self,
        uid: &UserID,
    ) -> Result<UserRatingSnapshot, Error> {
        let user = self.user_from_uid(uid).await?;
        Ok(UserRatingSnapshot::from(user))
    }

    fn get_rating_snapshots(
        &'static self,
        players: GamePlayers,
    ) -> Result<PregameRatingSnapshot, Error> {
        let [[aw, ab], [bw, bb]] = players;
        let (aws, abs, bws, bbs) = (
            UserRatingSnapshot::from(aw),
            UserRatingSnapshot::from(ab),
            UserRatingSnapshot::from(bw),
            UserRatingSnapshot::from(bb),
        );
        Ok(((aws, abs), (bws, bbs)))
    }

    pub fn get_table_rating_snapshots(
        &'static self,
        user: Arc<RwLock<User>>,
    ) -> PregameRatingSnapshot {
        let user_snap = UserRatingSnapshot::from(user);
        let nil = UserRatingSnapshot::nil();
        ((user_snap, nil.clone()), (nil.clone(), nil))
    }

    pub fn queue_formation(
        &'static self,
        time_ctrl: TimeControl,
        rated: bool,
        conn_id: &ConnID,
        ) -> Result<(), Error> {
        let uid = self.uid_from_conn(conn_id)?;
        self.loopback.do_send(ServerMessage::new(
            ServerMessageKind::FormTable(time_ctrl, rated, uid),
        ))?;
        Ok(())
    }

    pub async fn form_table(
        &'static self,
        time_ctrl: TimeControl,
        rated: bool,
        uid: UserID,
        ) -> Result<ClientMessage, Error> {
        let user = self.user_from_uid(&uid).await?;
        let snaps = self.get_table_rating_snapshots(user.clone());
        let id = self .db.form_game(&time_ctrl, rated, &snaps).await?;
        let msg = self.games.form_table(id, time_ctrl, user)?;
        Ok(msg)
    }

    pub async fn start_new_game(
        &'static self,
        time_ctrl: TimeControl,
        rated: bool,
        players: GamePlayers,
    ) -> Result<ClientMessage, Error> {
        self.seeks.remove_player_seeks(players.clone());
        println!("start_new_game");
        let start = Game::new_start();
        let rating_snapshots = self.get_rating_snapshots(players.clone())?;
        println!("rating_snaps: {:?}", rating_snapshots);
        let id = self
            .db
            .create_game(start, &time_ctrl, rated, &rating_snapshots)
            .await?;
        println!("id: {}", id);
        let (_game, msg) =
            self.games
                .start_game(id, start, time_ctrl, players.clone())?;
        self.loopback
            .try_send(ServerMessage::new(ServerMessageKind::CheckGame(id)))?;
        Ok(msg)
    }

    pub async fn record_move(
        &'static self,
        duration: chrono::Duration,
        game_id: GameID,
        board_id: BoardID,
        mv: BughouseMove,
    ) -> Result<ClientMessage, Error> {
        self.db
            .record_move(&duration, &game_id, board_id, &mv)
            .await?;
        Ok(ClientMessage::new(ClientMessageKind::Empty))
    }

    fn uid_from_conn(&self, conn_id: &ConnID) -> Result<UserID, Error> {
        self.conns.uid_from_conn(&conn_id).ok_or(Error::AuthError {
            reason: "Not authed".to_string(),
        })
    }

    pub fn make_move(
        &'static self,
        game_id: GameID,
        mv: &BughouseMove,
        conn_id: ConnID,
    ) -> Result<(), Error> {
        let uid = self.uid_from_conn(&conn_id)?;
        let (game, board_id) = self.games.make_move(game_id, mv, uid)?;
        println!("Made move. board: {}", board_id.to_index());
        {
            let rgame = game.read().unwrap();
            let duration = Utc::now() - rgame.get_start();
            let msg = ServerMessage::new(ServerMessageKind::RecordMove(
                duration,
                *rgame.get_id(),
                board_id,
                *mv,
            ));
            self.loopback.try_send(msg)?;
        }
        // A successful move will change which clock is at risk for flagging
        self.loopback.do_send(ServerMessage::new(
            ServerMessageKind::CheckGame(game_id),
        ))?;
        Ok(())
    }

    pub fn get_game(&self, game_id: &GameID) -> Option<Arc<RwLock<Game>>> {
        self.games.get(game_id)
    }

    // Timer handler detected a flag, find the flaggee, record the result, and notify all observers
    pub fn end_game(&self, lgame: Arc<RwLock<Game>>) {
        {
            let mut game = lgame.write().unwrap();
            game.end_game();
        }
        self.games.notify_game_observers(lgame);
        eprintln!("end_game!!!");
    }

    pub fn get_game_msg(
        &self,
        kind: GameJsonKind,
        game_id: GameID,
    ) -> Result<ByteString, Error> {
        let game = self
            .games
            .get(&game_id)
            .ok_or(Error::InvalidGameID(game_id))?;
        let game_json = GameJson::new(game, kind);
        Ok(ByteString::from(game_json.to_val().to_string()))
    }

    pub fn on_close(
        &'static self,
        recipient: &Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        self.games.remove_recipient(recipient);
        self.conns
            .on_close(recipient)
            .expect("Couldn't remove conn");
        Ok(())
    }

    pub async fn add_conn(
        &'static self,
        recipient: Recipient<ClientMessage>,
        fid: &str,
    ) -> Result<ConnID, Error> {
        println!("add_conn: {}", fid);
        let conn_id = self.conns.add_conn(recipient, fid).await?;
        Ok(conn_id)
    }

    pub fn observe(
        &'static self,
        game_id: &GameID,
        recipient: Recipient<ClientMessage>,
    ) {
        self.games.observe(game_id, recipient)
    }
}
