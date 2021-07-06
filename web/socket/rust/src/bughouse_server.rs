use actix::prelude::*;
use actix::{Actor, Context, Handler, ResponseFuture};
// use actix_web_actors::ws::WebsocketContext;
use serde_json::json;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::{Arc, RwLock};
// use std::thread;
use uuid::Uuid;

use once_cell::sync::OnceCell;
use crate::db::Db;
use crate::error::Error;
use crate::firebase::*;
use crate::messages::{
    ClientMessage, ClientMessageKind, ServerMessage, ServerMessageKind,
};

pub struct SocketConn {
    recipient: Recipient<ClientMessage>,
    uid: String,
}

impl SocketConn {
    pub fn new(
        recipient: Recipient<ClientMessage>,
        uid: String,
    ) -> Self {
        SocketConn { recipient, uid }
    }
}

// pub type ChanMsg = (Recipient<ClientMessage>, String);

pub struct BughouseServer {
    conns: RwLock<HashMap<u64, SocketConn>>, // connections
    db: Arc<Db>,
    // tx: Mutex<Sender<ChanMsg>>,
}

pub fn get_server(db: Arc<Db>) -> &'static BughouseServer {
    static INSTANCE: OnceCell<BughouseServer> = OnceCell::new();
    INSTANCE.get_or_init(move || BughouseServer::new(db))
}

fn hash<T: Hash>(hashable: &T) -> u64 {
    println!("hash!");
    let mut hasher = DefaultHasher::new();
    hashable.hash(&mut hasher);
    println!("hashed!");
    hasher.finish()
}

pub type ConnID = u64;

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
    // type Result = Result<ConnID, Error>;

    // Authenticate uid
    fn handle(
        &mut self,
        msg: ServerMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        match msg.kind {
            ServerMessageKind::Auth(recipient, token) => {
                let fut = self.server.authenticate(recipient, token);
                Box::pin(async move {
                    match fut.await {
                        Ok(m) => {
                            println!("!!! YES !!!");
                            Ok(m)
                        }
                        Err(e) => {
                            eprintln!("!!! NO !!!");
                            Err(e)
                        }
                    }
                })
            }
        }
        // Box::pin(async move {
        //     Ok(ServerResponse::Auth(1))
        // })
    }
}

impl BughouseServer {
    pub fn get(db: Arc<Db>) -> &'static BughouseServer {
        get_server(db)
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
        BughouseServer {
            conns: RwLock::new(HashMap::new()),
            db,
            // tx: Mutex::new(tx),
        }
    }

    fn get_user_data(uid: String) -> Result<(), Error> {
        let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
        write!(stream, "{}\n{}\n", FIRE_USER, uid)?;
        let mut resp = String::new();
        stream.read_to_string(&mut resp)?;
        println!("Response: {}", resp);
        let (kind, payload) = resp.split_once(':').unwrap();
        match kind {
            "user" => {
                let parts: Vec<&str> = payload.split('\x1e').collect();
                if let [name, email, photo_url, provider_id] = parts[..] {
                    println!(
                        "name: {}\temail: {}, photo: {}, provider: {}",
                        name, email, photo_url, provider_id
                    );
                    // tx.send(payload.to_string())?;
                } else {
                    println!("Couldn't parse: {}", payload);
                }
            }
            "err" => {
                eprintln!("err: {}", payload);
            }
            _ => {}
        }
        Ok(())
    }

    async fn get_uid_from_fid(&'static self, fid: &str) -> Result<Uuid, Error> {
        println!("get_uid_from_fid");
        let user = self.db.user_from_firebase_id(fid).await?;
        println!("got user");
        Ok(user.get_uid())
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
                // let raddr = auth.addr.downgrade();

                let rclone = recipient.clone();
                println!("Cloned");
                // let conn_id = block_on(BughouseServer::get().add_conn(rclone, payload))
                //     .expect("Could not add connection");
                let conn_id = self.add_conn(rclone, payload).await?;
                println!("conn_id: {}", conn_id);

                // TOOD - remove - just here emulating old auth
                let _msg = json!({"kind": "login", "handle": "fak3"});

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

    pub async fn add_conn(
        &'static self,
        recipient: Recipient<ClientMessage>,
        fid: &str,
    ) -> Result<ConnID, Error> {
        println!("BS add_conn");
        let conn_id = hash(&recipient);
        println!("conn_id: {}", conn_id);
        let uid = self.get_uid_from_fid(fid).await?;
        println!("uid: {}", uid);
        println!("map[{:?}] = {:?}", conn_id, (uid, fid));
        {
            println!("inserting...");
            if self.conns.read().unwrap().contains_key(&conn_id) {
                return Err(Error::Unexpected("Hash collision".to_string()));
            }
            let mut conns = self.conns.write().unwrap();
            conns.insert(conn_id, SocketConn::new(recipient, uid.to_string()));
        }

        // let tx = self.tx.lock().unwrap().clone();
        let uid_str = fid.to_string();
        if BughouseServer::get_user_data(uid_str).is_err() {
            eprintln!("ruh oh");
        }
        Ok(conn_id)
    }
}
