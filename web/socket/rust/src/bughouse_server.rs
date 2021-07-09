use actix::prelude::*;
use actix::{Actor, Context, Handler, ResponseFuture};
use bughouse::BughouseMove;
// use actix_web_actors::ws::WebsocketContext;
use std::collections::HashMap;
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::Arc;
// use std::thread;

use crate::connection_mgr::{ConnID, ConnectionMgr, UserID};
use crate::db::{Db, PregameRatingSnapshot, UserRowData};
use crate::error::Error;
use crate::firebase::*;
use crate::game::{Game, GamePlayers};
use crate::games::Games;
use crate::messages::{
    ClientMessage, ClientMessageKind, ServerMessage, ServerMessageKind,
};
use crate::users::{User, Users};
use crate::seeks::{SeekMap, Seeks};
use crate::time_control::TimeControl;
use once_cell::sync::OnceCell;

// pub type ChanMsg = (Recipient<ClientMessage>, String);

pub struct BughouseServer {
    users: Arc<Users>,
    conns: ConnectionMgr,
    seeks: Seeks,
    games: Games,
    partners: HashMap<UserID, UserID>,
    // conns: RwLock<HashMap<u64, SocketConn>>, // connections
    db: Arc<Db>,
    // tx: Mutex<Sender<ChanMsg>>,
}

pub struct ServerActor {
    server: &'static BughouseServer,
}

impl ServerActor {
    pub fn new(server: &'static BughouseServer) -> Self {
        ServerActor { server }
    }
}

impl Actor for ServerActor {
    /// Just need ability to communicate with other actors.
    type Context = Context<Self>;
}

impl Handler<ServerMessage> for ServerActor {
    type Result = ResponseFuture<Result<ClientMessage, Error>>;

    fn handle(
        &mut self,
        msg: ServerMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        match msg.kind {
            ServerMessageKind::Auth(recipient, token) => {
                // Authenticate token uid
                let fut = self.server.authenticate(recipient, token);
                Box::pin(async move { fut.await })
            }
        }
    }
}

impl BughouseServer {
    pub fn get(db: Arc<Db>) -> &'static BughouseServer {
        static INSTANCE: OnceCell<BughouseServer> = OnceCell::new();
        INSTANCE.get_or_init(move || BughouseServer::new(db))
    }

    // pub fn get_tx() -> Sender<ChanMsg> {
    //     SINGLETON.tx.lock().unwrap().clone()
    // }

    fn new(db: Arc<Db>) -> Self {
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
            users,
            seeks: Seeks::new(),
            games: Games::new(), // db.clone()),
            partners: HashMap::new(),
            db,
            // tx: Mutex::new(tx),
        }
    }

    pub fn get_seeks(&'static self) -> SeekMap {
        self.seeks.get_seeks()
    }

    pub fn add_seek(
        &'static self,
        time_ctrl: TimeControl,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        let conn_id = ConnectionMgr::get_conn_id(&recipient);
        let user = self.user_from_conn(conn_id).ok_or(Error::AuthError {
            reason: "User not yet authenticated".to_string(),
        })?;
        if self.games.is_in_game(user.get_uid()) {
            return Err(Error::InGame(user.get_handle().to_string()));
        }
        self.seeks.add_seeker(time_ctrl, user.get_uid())
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
                println!("auth.uid: {}", payload);
                let conn_id = self.add_conn(recipient.clone(), payload).await?;
                println!("conn_id: {}", conn_id);

                recipient
                    .send(ClientMessage::new(ClientMessageKind::Auth(conn_id)))
                    .await
                    .expect("sending auth message failed?");
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

    pub fn user_from_conn(&self, conn_id: ConnID) -> Option<Arc<User>> {
        self.conns.user_from_conn(conn_id)
    }

    pub fn user_from_uid(
        &'static self,
        uid: &UserID,
    ) -> Option<Arc<User>> {
        if let Some(u) = self.users.get_user(uid) {
            return u.read().unwrap()
        }
        None
    }

    // If, on the offchance, that a user disconnects right after game start (and is not present),
    // try fetching user from DB.
    fn get_rating_snapshots(
        &'static self,
        players: &GamePlayers,
        ) -> PregameRatingSnapshot {
        let [[aw, ab], [bw, bb]] = players;

        // TODO
        let awp = self.user_from_uid(&aw).unwrap();
        let abp = self.user_from_uid(&ab).unwrap();
        let bwp = self.user_from_uid(&bw).unwrap();
        let bbp = self.user_from_uid(&bb).unwrap();
        ((awp.as_ref().into(), abp.as_ref().into()), (bwp.as_ref().into(), bbp.as_ref().into()))
    }

    pub async fn create_game(
        &'static self,
        time_ctrl: TimeControl,
        players: GamePlayers,
        ) -> Result<(), Error> {
        let start = Game::new_start();
        let rating_snapshots = self.get_rating_snapshots(&players);
        let id = self.db.create_game(start, &time_ctrl, &rating_snapshots).await?;
        self.games.start_game(id, start, time_ctrl, players)?;
        Ok(())
    }

    pub async fn make_move(
        &'static self,
        user_id: UserID,
        mv: &BughouseMove,
        ) -> Result<(), Error> {
        let game = self.games.get_game(user_id)
            .ok_or(Error::InvalidMoveNotPlaying(user_id))?;
        let board_id = game.write().unwrap().make_move(user_id, mv)?;
        self.db.make_move(&game.read().unwrap(), board_id, mv).await?;
        Ok(())
    }

    pub fn on_close(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
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
        // println!("BS add_conn");
        // let conn_id = hash(&recipient);
        // println!("conn_id: {}", conn_id);
        // let user = self.get_user_from_fid(fid).await?;
        let conn_id = self.conns.add_conn(recipient, fid).await?;
        // println!("uid: {}", uid);
        // println!("map[{:?}] = {:?}", conn_id, (uid, fid));
        // {
        //     println!("inserting...");
        //     if self.conns.read().unwrap().contains_key(&conn_id) {
        //         return Err(Error::Unexpected("Hash collision".to_string()));
        //     }
        //     let mut conns = self.conns.write().unwrap();
        //     conns.insert(conn_id, SocketConn::new(recipient, uid.to_string()));
        // }
        //
        // // let tx = self.tx.lock().unwrap().clone();
        // let uid_str = fid.to_string();
        // if BughouseServer::get_user_data(uid_str).is_err() {
        //     eprintln!("ruh oh");
        // }
        Ok(conn_id)
    }
}
