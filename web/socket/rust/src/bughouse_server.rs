use actix::prelude::*;
use actix::{Actor, Context, Handler, ResponseFuture};
use actix_web::*;
use bughouse::{BoardID, BughouseMove, Color};
use bytestring::ByteString;
use chrono::prelude::*;
use futures::join;
use serde_json::{json, Value};
// use actix_web_actors::ws::WebsocketContext;
use std::collections::HashMap;
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::{Arc, RwLock};
// use timer::Timer;
// use std::thread;

use crate::b66::B66;
use crate::connection_mgr::{ConnID, ConnectionMgr};
use crate::db::{Db, TableSnapshot, UserRatingSnapshot};
use crate::error::Error;
use crate::firebase::*;
use crate::game::{Game, GameID, GamePlayers, GameResult};
use crate::game_json::GameJson;
use crate::games::{GameUserHandler, Games};
use crate::messages::{
    ClientMessage, ClientMessageKind, ServerMessage, ServerMessageKind,
};
use crate::rating::UserRating;
use crate::seeks::seek_user_handler::SeekUserHandler;
use crate::seeks::seeks::{SeekPool, Seeks};
use crate::time_control::TimeControl;
use crate::users::{User, UserID, Users};
use once_cell::sync::OnceCell;

// pub type ChanMsg = (Recipient<ClientMessage>, String);

pub struct BughouseServer {
    users: Arc<Users>,
    conns: Arc<ConnectionMgr>,
    seeks: Arc<Seeks>,
    loopback: Recipient<ServerMessage>,
    games: Arc<Games>,
    // partners: HashMap<UserID, UserID>,
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

    async fn fwd_err(
        fut: ResponseFuture<Result<ClientMessage, Error>>,
        server: &'static BughouseServer,
        conn_id: ConnID,
    ) -> Result<ClientMessage, Error> {
        let res = fut.await;
        if let Err(e) = &res {
            let recipient = server.get_recipient(&conn_id)?;
            eprintln!("Got err: {}", e);
            let res = recipient.try_send(e.to_client_msg());
            if let Err(e) = res {
                eprintln!("failed sending err: {}", e);
            }
        }
        res
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
                let fut =
                    self.srv(ctx).start_new_game(time_ctrl, rated, players);
                Box::pin(async move { fut.await })
            }
            ServerMessageKind::FormTable(time_ctrl, rated, public, conn_id) => {
                let server = self.srv(ctx);
                let fut = server.form_table(time_ctrl, rated, public, conn_id);
                Box::pin(async move {
                    Self::fwd_err(Box::pin(fut), server, conn_id).await
                })
            }
            ServerMessageKind::GetGameRow(game_id, recipient) => {
                let fut = self.srv(ctx).send_game_row(game_id, recipient);
                Box::pin(async move { fut.await })
            }
            ServerMessageKind::Sit(game_id, board_id, color, conn_id) => {
                let server = self.srv(ctx);
                let fut = server.sit(game_id, board_id, color, conn_id);
                Box::pin(async move {
                    Self::fwd_err(Box::pin(fut), server, conn_id).await
                })
            }
            ServerMessageKind::SetHandle(handle, uid) => {
                let fut = self.srv(ctx).set_handle(handle, uid);
                Box::pin(async move { fut.await })
            }
            ServerMessageKind::Vacate(game_id, board_id, color, recip) => {
                let fut = self.srv(ctx).vacate(game_id, board_id, color, recip);
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
                        srv.update_game_observers(lgame);
                        checkers.insert(game_id, checker);
                    } else if result.is_none() {
                        // Timer handler detected a flag, find the flaggee,
                        // record the result, and notify all observers
                        {
                            let mut game = lgame.write().unwrap();
                            game.end_game();
                        }
                        srv.update_game_observers(lgame.clone());
                        let fut = self.srv(ctx).record_game(lgame);
                        return Box::pin(async move { fut.await });
                    }
                } else {
                    println!("Game {} is gone", game_id);
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
        let users = Arc::new(Users::new(db.clone()));
        let conns = Arc::new(ConnectionMgr::new(db.clone(), users.clone()));
        let games = Arc::new(Games::new(conns.clone()));
        let game_user_handler = GameUserHandler::new(games.clone());
        let game_addr = game_user_handler.start();
        let seeks = Arc::new(Seeks::new(users.clone()));
        let seek_user_handler = SeekUserHandler::new(seeks.clone());
        let seek_addr = seek_user_handler.start();
        conns.add_user_handler(game_addr.recipient());
        conns.add_user_handler(seek_addr.recipient());
        BughouseServer {
            conns,
            users,
            loopback,
            seeks,
            games,
            db,
        }
    }

    pub fn get_conns(&self) -> Arc<ConnectionMgr> {
        self.conns.clone()
    }

    pub fn sub_public_tables(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        println!("subscribing tables");
        self.games.sub_public_tables(recipient);
        Ok(())
    }

    pub fn unsub_public_tables(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        println!("unsubscribing pub tables");
        self.games.unsub_public_tables(recipient);
        Ok(())
    }

    pub fn get_current_games_json(&'static self) -> Result<ByteString, Error> {
        let json = self.games.get_current_games_json();
        Ok(ByteString::from(json.to_string()))
    }

    pub fn sub_current_games(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        println!("subscribing current games");
        self.games.sub_current_games(recipient);
        Ok(())
    }

    pub fn unsub_current_games(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        println!("unsubscribing online");
        self.games.unsub_current_games(recipient);
        Ok(())
    }

    pub fn get_public_tables_msg(&'static self) -> Result<ByteString, Error> {
        let json = json!({
            "kind": "public_tables",
            "tables": self.games.get_public_table_json(),
        });
        Ok(ByteString::from(json.to_string()))
    }

    pub fn sub_online_players(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        println!("subscribing online");
        self.conns.sub_online_players(recipient)
    }

    pub fn unsub_online_players(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        println!("unsubscribing online");
        self.conns.unsub_online_players(recipient)
    }

    pub fn get_online_players_msg(
        &'static self,
        _cursor: Option<UserID>,
        _count: u64,
        _order_by: Option<&str>,
    ) -> Result<ByteString, Error> {
        let players =
            ConnectionMgr::get_online_players(self.conns.online_users());
        let json = json!({
            "kind": "online_players",
            "players": players,
        });
        Ok(ByteString::from(json.to_string()))
    }

    pub fn add_seek(
        &'static self,
        seek_pool: SeekPool,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        let conn_id = ConnectionMgr::get_conn_id(&recipient);
        let user_lock =
            self.user_from_conn(conn_id).ok_or(Error::AuthError {
                reason: "User not yet authenticated".to_string(),
            })?;
        let user = user_lock.read().unwrap();
        if let Some(game) = self.games.get_user_game(&user.id) {
            let rgame = game.read().unwrap();
            return Err(Error::InGame(
                user.handle.to_string(),
                B66::encode_uuid(rgame.get_id()),
            ));
        }
        println!("adding seeker");
        self.seeks.add_default_seeker(&seek_pool, user.id)?;
        if let Some(players) = self.seeks.form_game(&seek_pool) {
            println!("forming game...");
            // Send message to self and attempt async DB game creation
            let msg = ServerMessage::new(ServerMessageKind::CreateGame(
                seek_pool.time_ctrl,
                seek_pool.rated,
                players,
            ));
            self.loopback.try_send(msg)?;
        }
        Ok(())
    }

    pub fn update_game_observers(&'static self, game: Arc<RwLock<Game>>) {
        self.games.update_game_observers(game);
    }

    pub fn is_authenticated(&'static self, conn_id: ConnID) -> bool {
        self.conns.user_from_conn(conn_id).is_some()
    }

    pub async fn authenticate(
        &'static self,
        recipient: Recipient<ClientMessage>,
        token: String,
    ) -> Result<ClientMessage, Error> {
        let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
        write!(stream, "{}\n{}\n", FIRE_AUTH, token)?;
        let mut resp = String::new();
        stream.read_to_string(&mut resp)?;
        let (label, payload) = resp.trim_end().split_once(':').unwrap();
        match label {
            "uid" => {
                let parts: Vec<&str> = payload.split('\x1e').collect();
                if let [fid, provider_id] = parts[..] {
                    println!("auth.uid: {}, provider_id: {}", fid, provider_id);
                    let conn_id = self.add_conn(recipient.clone(), fid).await?;
                    println!("conn_id: {}", conn_id);
                    let send_res = recipient
                        .send(ClientMessage::new(ClientMessageKind::Auth(
                            conn_id,
                        )))
                        .await;
                    if let Err(e) = send_res {
                        eprintln!("Couldn't send AUTH message: {}", e);
                    }
                    return Ok(ClientMessage::new(ClientMessageKind::Auth(
                        conn_id,
                    )));
                }
                eprintln!("Couldn't parse response: {}", payload);
                Err(Error::Unexpected("Couldn't parse response".to_string()))
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

    pub async fn user_from_uid(
        &'static self,
        uid: &UserID,
    ) -> Result<Arc<RwLock<User>>, Error> {
        if let Some(u) = self.users.maybe_user_from_uid(uid).await {
            return Ok(u);
        }
        Err(Error::UnknownUID(*uid))
    }

    pub async fn get_user_handles(
        &'static self,
        snaps: &TableSnapshot,
    ) -> Result<((String, String), (String, String)), Error> {
        let ((aw, ab), (bw, bb)) = snaps;
        let (maybe_aw, maybe_ab, maybe_bw, maybe_bb) = join!(
            self.users.maybe_user_from_uid(&aw.uid),
            self.users.maybe_user_from_uid(&ab.uid),
            self.users.maybe_user_from_uid(&bw.uid),
            self.users.maybe_user_from_uid(&bb.uid),
        );
        let rawu = maybe_aw.unwrap();
        let rabu = maybe_ab.unwrap();
        let rbwu = maybe_bw.unwrap();
        let rbbu = maybe_bb.unwrap();
        let awu = rawu.read().unwrap();
        let abu = rabu.read().unwrap();
        let bwu = rbwu.read().unwrap();
        let bbu = rbbu.read().unwrap();
        Ok((
            (awu.handle.clone(), abu.handle.clone()),
            (bwu.handle.clone(), bbu.handle.clone()),
        ))
    }

    pub fn queue_send_game_row(
        &self,
        game_id: &GameID,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        self.loopback.do_send(ServerMessage::new(
            ServerMessageKind::GetGameRow(*game_id, recipient),
        ))?;
        Ok(())
    }

    pub async fn send_game_row(
        &'static self,
        game_id: GameID,
        recipient: Recipient<ClientMessage>,
    ) -> Result<ClientMessage, Error> {
        println!("send_game_row({}, {:?})", game_id, recipient);
        let res = self.db.get_game_row(&game_id).await;
        if let Err(e) = res {
            eprintln!("err: {:?}", e);
            return Err(e);
        }
        let game_row = res.unwrap();
        let handles = self.get_user_handles(&game_row.players).await?;
        let payload = game_row.to_json(handles, None);
        let bytestr = Arc::new(ByteString::from(payload.to_string()));
        let msg = ClientMessage::new(ClientMessageKind::Text(bytestr));
        // let res = self.conns.send_to_conn(conn_id, msg.clone());
        let res = recipient.do_send(msg.clone());
        if res.is_err() {
            eprintln!("Error sending to: {:?}", recipient);
        }
        Ok(msg)
    }

    pub async fn rating_snapshot_from_uid(
        &'static self,
        uid: &UserID,
    ) -> Result<UserRatingSnapshot, Error> {
        let user = self.user_from_uid(uid).await?;
        Ok(UserRatingSnapshot::from(user))
    }

    pub fn get_table_rating_snapshots(
        &'static self,
        user: Arc<RwLock<User>>,
    ) -> TableSnapshot {
        let user_snap = UserRatingSnapshot::from(user);
        let nil = UserRatingSnapshot::nil();
        ((user_snap, nil.clone()), (nil.clone(), nil))
    }

    pub fn queue_set_handle(
        &'static self,
        handle: String,
        conn_id: &ConnID,
    ) -> Result<(), Error> {
        let uid = self.uid_from_conn(conn_id)?;
        self.loopback.do_send(ServerMessage::new(
            ServerMessageKind::SetHandle(handle, uid),
        ))?;
        Ok(())
    }

    pub async fn set_handle(
        &'static self,
        handle: String,
        uid: UserID,
    ) -> Result<ClientMessage, Error> {
        let user = self.user_from_uid(&uid).await?;
        self.db.set_handle(&handle, user.clone()).await?;
        {
            let mut wuser = user.write().unwrap();
            wuser.handle = handle;
        }
        let ruser = user.read().unwrap();
        let json = json!({
            "kind": "login",
            "uid": ruser.id,
            "handle": ruser.handle,
        });
        self.send_text_to_user(json.to_string(), &ruser.id);
        let hdl_json = json!({
            "kind": "handle_update",
            "uid": ruser.id,
            "handle": ruser.handle,
        });
        Ok(self.send_text_to_user(hdl_json.to_string(), &ruser.id))
    }

    pub fn queue_sit(
        &'static self,
        game_id: &GameID,
        board_id: BoardID,
        color: Color,
        conn_id: &ConnID,
    ) -> Result<(), Error> {
        self.loopback
            .do_send(ServerMessage::new(ServerMessageKind::Sit(
                *game_id, board_id, color, *conn_id,
            )))?;
        Ok(())
    }

    pub fn queue_vacate(
        &'static self,
        game_id: &GameID,
        board_id: BoardID,
        color: Color,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        self.loopback.do_send(ServerMessage::new(
            ServerMessageKind::Vacate(*game_id, board_id, color, recipient),
        ))?;
        Ok(())
    }

    async fn update_seats(
        &'static self,
        game: Arc<RwLock<Game>>,
    ) -> Result<ClientMessage, Error> {
        let rgame = game.read().unwrap();
        let rating_snapshots = Game::get_rating_snapshots(&rgame.players);
        self.db.sit(rgame.get_id(), &rating_snapshots).await?;
        self.update_game_observers(game.clone());
        println!("updated game observers");
        Ok(ClientMessage::new(ClientMessageKind::Empty))
    }

    pub async fn sit(
        &'static self,
        game_id: GameID,
        board_id: BoardID,
        color: Color,
        conn_id: ConnID,
    ) -> Result<ClientMessage, Error> {
        let uid = self.uid_from_conn(&conn_id)?;
        let user = self.user_from_uid(&uid).await?;
        let game = self.games.sit(game_id, board_id, color, user)?;
        let msg = self.update_seats(game.clone()).await?;
        if !game.read().unwrap().has_empty_seat() {
            self.start_game(game).await?;
        }
        Ok(msg)
    }

    pub async fn vacate(
        &'static self,
        game_id: GameID,
        board_id: BoardID,
        color: Color,
        recipient: Recipient<ClientMessage>,
    ) -> Result<ClientMessage, Error> {
        let conn_id = ConnectionMgr::get_conn_id(&recipient);
        let uid = self.uid_from_conn(&conn_id)?;
        let game = self.games.vacate(game_id, board_id, color, uid)?;
        self.observe(game.read().unwrap().get_id(), recipient);
        self.update_seats(game).await
    }

    pub fn queue_formation(
        &'static self,
        time_ctrl: TimeControl,
        rated: bool,
        public: bool,
        conn_id: &ConnID,
    ) -> Result<(), Error> {
        self.loopback.do_send(ServerMessage::new(
            ServerMessageKind::FormTable(time_ctrl, rated, public, *conn_id),
        ))?;
        Ok(())
    }

    pub async fn form_table(
        &'static self,
        time_ctrl: TimeControl,
        rated: bool,
        public: bool,
        conn_id: ConnID,
    ) -> Result<ClientMessage, Error> {
        let uid = self.uid_from_conn(&conn_id)?;
        if let Some(game) = self.games.get_user_game(&uid) {
            let gid = B66::encode_uuid(game.read().unwrap().get_id());
            return Err(Error::InGame(uid.to_string(), gid));
        }
        let user = self.user_from_uid(&uid).await?;
        if user.read().unwrap().guest && rated {
            return Err(Error::CreateRatedGameGuest());
        }

        println!("form_table, user ID: {}", uid);
        let snaps = self.get_table_rating_snapshots(user.clone());
        println!("snaps: {:?}", snaps);
        let res = self.db.form_table(&time_ctrl, rated, public, &snaps).await;
        match res {
            Ok(id) => {
                println!("id: {}", id);
                let msg = self
                    .games
                    .form_table(id, time_ctrl, rated, public, user)?;
                Ok(msg)
            }
            Err(e) => {
                eprintln!("err: {}", e);
                eprintln!("err: {:?}", e);
                Err(e)
            }
        }
    }

    pub async fn start_game(
        &'static self,
        game: Arc<RwLock<Game>>,
    ) -> Result<(), Error> {
        self.games.start_game(game.clone())?;
        self.db.start_game(game.clone()).await?;
        let game_id = game.read().unwrap().get_id().clone();
        let msg = ServerMessage::new(ServerMessageKind::CheckGame(game_id));
        self.loopback.try_send(msg)?;
        Ok(())
    }

    pub async fn start_new_game(
        &'static self,
        time_ctrl: TimeControl,
        rated: bool,
        players: GamePlayers,
    ) -> Result<ClientMessage, Error> {
        println!("start_new_game");
        let start = Game::new_start();
        let rating_snapshots = Game::get_rating_snapshots(&players);
        println!("rating_snaps: {:?}", rating_snapshots);
        let id = self
            .db
            .create_game(start, &time_ctrl, rated, &rating_snapshots)
            .await?;
        println!("id: {}", id);
        let (_game, msg) = self.games.start_new_game(
            id,
            start,
            time_ctrl,
            rated,
            players.clone(),
        )?;
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
        println!("server.record_move");
        self.db
            .record_move(&duration, &game_id, board_id, &mv)
            .await?;
        if let Some(game) = self.get_game(&game_id) {
            if game.read().unwrap().get_result().is_some() {
                println!("Detected checkmate in {}", game_id);
                self.record_game(game).await?;
            }
        }
        Ok(ClientMessage::new(ClientMessageKind::Empty))
    }

    pub fn get_recipient(
        &self,
        conn_id: &ConnID,
    ) -> Result<Recipient<ClientMessage>, Error> {
        self.conns
            .recipient_from_conn(conn_id)
            .ok_or(Error::AuthError {
                reason: "Not authed".to_string(),
            })
    }

    fn uid_from_conn(&self, conn_id: &ConnID) -> Result<UserID, Error> {
        self.conns.uid_from_conn(&conn_id).ok_or(Error::AuthError {
            reason: "Not authed".to_string(),
        })
    }

    pub fn premove(
        &'static self,
        _game_id: GameID,
        _mv: BughouseMove,
        _conn_id: ConnID,
    ) {
        // TODO
    }

    pub fn cancel_premove(&'static self, _game_id: GameID, _conn_id: ConnID) {
        // TODO
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
            let duration = Utc::now() - rgame.get_start().unwrap();
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

    fn send_text_to_user(
        &self,
        payload: String,
        uid: &UserID,
    ) -> ClientMessage {
        let bytestr = Arc::new(ByteString::from(payload));
        let msg = ClientMessage::new(ClientMessageKind::Text(bytestr));
        self.conns.send_to_user(uid, &msg);
        msg
    }

    fn send_new_rating(&self, user: Arc<RwLock<User>>) {
        let ruser = user.read().unwrap();
        let json = json!({
            "kind": "login",
            "handle": ruser.handle, // TODO only needed for hacky SocketProxy.js logic
            "uid": ruser.id,
            "rating": ruser.rating,
            "deviation": ruser.deviation,
        });
        self.send_text_to_user(json.to_string(), &ruser.id);
    }

    fn update_user_rating(&self, rating: &UserRating) -> Result<(), Error> {
        let maybe_user = self.users.get(&rating.uid);
        if let Some(user) = maybe_user {
            {
                let mut wuser = user.write().unwrap();
                wuser.rating = rating.rating.rating;
                wuser.deviation = rating.rating.deviation;
            }
            self.send_new_rating(user);
        }
        Ok(())
    }

    async fn record_game(
        &'static self,
        game: Arc<RwLock<Game>>,
    ) -> Result<ClientMessage, Error> {
        println!("record_game");
        self.db.record_game_result(game.clone()).await?;
        println!("updated result");
        if game.read().unwrap().rated {
            println!("updating ratings...");
            let ratings = UserRating::get_updated_ratings(game.clone());
            self.db.record_ratings(&ratings).await?;
            for rating_snapshot in ratings.iter() {
                if self.update_user_rating(rating_snapshot).is_err() {
                    eprintln!(
                        "Failed updating in-memory user rating {}",
                        rating_snapshot.uid
                    )
                }
            }
            println!("updated ratings.");
        }
        self.games.rm_game(game.read().unwrap().get_id());
        Ok(ClientMessage::new(ClientMessageKind::Empty))
    }

    pub fn send_game_msg(
        &self,
        game_id: GameID,
        payload: &Value,
        conn_id: &ConnID,
    ) -> Result<(), Error> {
        println!("send_game_msg({}, {}, {})", game_id, payload, conn_id);
        let uid = self.uid_from_conn(conn_id)?;
        let game = self
            .games
            .get_user_game(&uid)
            .ok_or(Error::InvalidUserNotPlaying(uid, game_id))?;
        let rgame = game.read().unwrap();
        if *rgame.get_id() != game_id {
            eprintln!("{} != {}", rgame.get_id(), game_id);
            return Err(Error::InvalidGameIDForUser(
                uid,
                game_id,
                *rgame.get_id(),
            ));
        }
        if let Some(partner_uid) = rgame.get_partner(&uid) {
            println!("sending {} to {}", payload, partner_uid);
            self.send_text_to_user(payload.to_string(), &partner_uid);
            // Send ACK back to sender
            println!("sending same to {}", uid);
            self.send_text_to_user(payload.to_string(), &uid);
        } else {
            println!("game_msg: no partner?");
        }
        Ok(())
    }

    pub fn get_game_json_payload(
        &self,
        game_id: GameID,
    ) -> Result<ByteString, Error> {
        let game = self
            .games
            .get(&game_id)
            .ok_or(Error::InvalidGameID(game_id))?;
        {
            let mut wgame = game.write().unwrap();
            wgame.update_all_clocks();
        }
        let game_json = GameJson::new(game.clone(), Games::get_kind(game));
        Ok(ByteString::from(game_json.to_val().to_string()))
    }

    pub fn on_close(&'static self, recipient: &Recipient<ClientMessage>) {
        self.games.remove_recipient(recipient);
        self.conns
            .on_close(recipient)
            .expect("Couldn't remove conn");
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
