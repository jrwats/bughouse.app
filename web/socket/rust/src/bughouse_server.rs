use actix::prelude::*;
use actix::{Actor, Context, Handler, ResponseFuture};
use actix_web::*;
use bughouse::{BoardID, BughouseMove};
use bytestring::ByteString;
use chrono::prelude::*;
use chrono::Duration;
// use actix_web_actors::ws::WebsocketContext;
use std::collections::HashMap;
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::{Arc, RwLock};
// use std::thread;

use crate::connection_mgr::{ConnID, ConnectionMgr, UserID};
use crate::db::{Db, PregameRatingSnapshot, UserRatingSnapshot};
use crate::error::Error;
use crate::firebase::*;
use crate::game::{Game, GameID, GamePlayers};
use crate::game_json::GameJson;
use crate::games::Games;
use crate::messages::{
    ClientMessage, ClientMessageKind, ServerMessage, ServerMessageKind,
};
use crate::observers::Observers;
use crate::players::Players;
use crate::seeks::{SeekMap, Seeks};
use crate::time_control::TimeControl;
use crate::users::{User, Users};
use once_cell::sync::OnceCell;

// pub type ChanMsg = (Recipient<ClientMessage>, String);

pub struct BughouseServer {
    users: Arc<Users>,
    conns: ConnectionMgr,
    seeks: Seeks,
    loopback: Recipient<ServerMessage>,
    games: Games,
    observers: Observers,
    partners: HashMap<UserID, UserID>,
    db: Arc<Db>,
    // tx: Mutex<Sender<ChanMsg>>,
}

pub struct ServerHandler {
    db: Arc<Db>,
    // server: &'static BughouseServer,
}

impl ServerHandler {
    pub fn new(db: Arc<Db>) -> Self {
        ServerHandler { db }
    }
}

impl Actor for ServerHandler {
    /// Just need ability to communicate with other actors.
    type Context = Context<Self>;
}

impl ServerHandler {
    fn srv(&self, ctx: &mut Context<Self>) -> &'static BughouseServer {
        BughouseServer::get(self.db.clone(), ctx.address().recipient())
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
            ServerMessageKind::CreateGame(time_ctrl, players) => {
                let fut = self.srv(ctx).create_game(time_ctrl, players);
                Box::pin(async move { fut.await })
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
    // fn get_cell(db: Arc<Db>) -> &'static mut OnceCell<BughouseServer> {
    //     INSTANCE.get_or_init(move || BughouseServer::new(db));
    //     &mut INSTANCE
    // }

    pub fn get(
        db: Arc<Db>,
        loopback: Recipient<ServerMessage>,
    ) -> &'static BughouseServer {
        INSTANCE.get_or_init(move || BughouseServer::new(db, loopback))
    }

    // pub fn get_mut() -> &'static mut BughouseServer {
    //     INSTANCE.get_mut().unwrap()
    // }

    // pub fn get_tx() -> Sender<ChanMsg> {
    //     SINGLETON.tx.lock().unwrap().clone()
    // }

    fn new(db: Arc<Db>, loopback: Recipient<ServerMessage>) -> Self {
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
        BughouseServer {
            conns: ConnectionMgr::new(db.clone(), users.clone()),
            users: users.clone(),
            loopback,
            seeks: Seeks::new(users),
            games: Games::new(),
            observers: Observers::new(),
            partners: HashMap::new(),
            db,
            // tx: Mutex::new(tx),
        }
        // let addr = ServerActor::new(&srv).start();
        // srv.addr = Some(addr);
        // srv
    }

    // pub fn set_loopback(&'static mut self, recipient: Recipient<ServerMessage>) {
    //     self.recipient = Some(recipient);
    // }
    //
    // pub fn get_recipient(&'static self) -> Recipient<ServerMessage> {
    //     self.recipient.unwrap()
    // }

    pub fn get_seeks(&'static self) -> SeekMap {
        self.seeks.get_seeks()
    }

    pub fn add_seek(
        &'static self,
        time_ctrl: TimeControl,
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
        self.seeks.add_seeker(&time_ctrl, &user.id)?;
        if let Some(players) = self.seeks.form_game(&time_ctrl) {
            // Send message to self and attempt async DB game creation
            let msg = ServerMessage::new(ServerMessageKind::CreateGame(
                time_ctrl, players,
            ));
            self.loopback.try_send(msg)?;
        }
        Ok(())
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
    pub async fn user_from_uid(
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

    pub async fn rating_snapshot_from_uid(
        &'static self,
        uid: &UserID,
    ) -> Result<UserRatingSnapshot, Error> {
        if let Some(u) = self.user_from_uid(uid).await {
            return Ok(UserRatingSnapshot::from(u));
        }
        Err(Error::UnknownUID(*uid))
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

    pub async fn create_game(
        &'static self,
        time_ctrl: TimeControl,
        players: GamePlayers,
    ) -> Result<ClientMessage, Error> {
        self.seeks.remove_player_seeks(players.clone());
        let start = Game::new_start();
        let rating_snapshots = self.get_rating_snapshots(players.clone())?;
        let id = self
            .db
            .create_game(start, &time_ctrl, &rating_snapshots)
            .await?;
        let game =
            self.games
                .start_game(id, start, time_ctrl, players.clone())?;
        let msg_str = GameJson::from(game).to_string("game_start").to_string();
        let bytestr = Arc::new(ByteString::from(msg_str));
        let msg = ClientMessage::new(ClientMessageKind::Text(bytestr));
        for player in Players::new(&players).get_players().iter() {
            self.conns.send_to_user(player.get_uid(), &msg);
        }
        Ok(msg)
    }

    pub async fn record_move(
        &'static self,
        duration: Duration,
        game_id: GameID,
        board_id: BoardID,
        mv: BughouseMove,
    ) -> Result<ClientMessage, Error> {
        self.db
            .record_move(&duration, &game_id, board_id, &mv)
            .await?;
        Ok(ClientMessage::new(ClientMessageKind::Empty))
    }

    pub fn make_move(
        &'static self,
        game_id: GameID,
        mv: &BughouseMove,
        conn_id: ConnID,
    ) -> Result<(), Error> {
        let uid =
            self.conns.uid_from_conn(&conn_id).ok_or(Error::AuthError {
                reason: "Not authed".to_string(),
            })?;
        let game = self
            .games
            .get_user_game(&uid)
            .ok_or(Error::InvalidMoveNotPlaying(uid))?;
        {
            let user_game = game.read().unwrap();
            let user_game_id = user_game.get_id();
            if *user_game_id != game_id {
                return Err(Error::InvalidGameIDForUser(
                    uid,
                    game_id,
                    (*user_game_id).clone(),
                ));
            }
            println!("Found game {}, for: {}", user_game_id, uid);
        }
        let board_id = game.write().unwrap().make_move(&uid, mv)?;
        println!("Made move. board: {}", board_id.to_index());
        {
            let rgame = game.read().unwrap();
            let duration = Utc::now() - *rgame.get_start();
            let msg = ServerMessage::new(ServerMessageKind::RecordMove(
                duration,
                *rgame.get_id(),
                board_id,
                *mv,
            ));
            self.loopback.try_send(msg)?;
        }
        self.notify_game_observers(game);
        Ok(())
    }

    pub fn get_game_msg(
        &self,
        kind: &str,
        game_id: GameID,
    ) -> Result<ByteString, Error> {
        let game = self
            .games
            .get(&game_id)
            .ok_or(Error::InvalidGameID(game_id))?;
        let game_json = GameJson::from(game);
        Ok(ByteString::from(game_json.to_string(kind).to_string()))
    }

    fn notify_game_observers(&self, ar_game: Arc<RwLock<Game>>) {
        let game_json = GameJson::from(ar_game.clone());
        let json_str = game_json.to_string("game_update");
        println!("Notifying game players {}", json_str);
        let msg_str = Arc::new(ByteString::from(json_str.to_string()));
        let msg = ClientMessage::new(ClientMessageKind::Text(msg_str));
        let game = ar_game.read().unwrap();
        for player in Players::new(game.get_players()).get_players().iter() {
            self.conns.send_to_user(player.get_uid(), &msg);
        }
        self.observers.notify(game.get_id(), msg);
    }

    pub fn on_close(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        self.observers.remove_recipient(&recipient);
        self.conns
            .on_close(&recipient)
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
        game_id: GameID,
        recipient: Recipient<ClientMessage>,
    ) {
        // Only observe if the user ISN'T playing a game
        let maybe_game = self.games.get(&game_id);
        if maybe_game.is_none() {
            return;
        }
        let locked_game = maybe_game.unwrap();
        let conn_id = ConnectionMgr::get_conn_id(&recipient);
        if let Some(uid) = self.conns.uid_from_conn(&conn_id) {
            let game = locked_game.read().unwrap();
            for player in Players::new(game.get_players()).get_players().iter()
            {
                if player.get_uid() == uid {
                    return;
                }
            }
        }
        self.observers.observe(game_id, recipient);
    }
}
