use actix::prelude::*;
use actix::{Actor, AsyncContext, Context, Handler, ResponseFuture, WeakAddr};
// use actix_web_actors::ws::WebsocketContext;
use serde_json::json;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::mpsc;
use std::sync::mpsc::{Receiver, Sender};
use std::sync::Arc;
use std::sync::{Mutex, RwLock};
// use std::sync::atomic::AtomicUsize;
use std::thread;
use uuid::Uuid;

use futures::executor::block_on;
use futures::future::Future;

use once_cell::sync::Lazy; // 1.3.1
use once_cell::sync::OnceCell;

use crate::bug_web_sock::BugWebSock;
use crate::db::Db;
use crate::error::Error;
use crate::firebase::*;
use crate::messages::{
    Auth, ClientMessage, ClientMessageKind, ServerMessage, ServerMessageKind,
};

pub struct SocketConn {
    recipient: Recipient<ClientMessage>,
    uid: String,
}

impl SocketConn {
    pub fn new(
        // w: &WebsocketContext<BugWebSock>,
        recipient: Recipient<ClientMessage>,
        uid: String,
    ) -> Self {
        SocketConn { recipient, uid }
    }
}

pub type ChanMsg = (Recipient<ClientMessage>, String);

pub struct BughouseServer {
    conns: RwLock<HashMap<u64, SocketConn>>, // connections
    db: Arc<Db>,
    // tx: Mutex<Sender<ChanMsg>>,
}

// static SINGLETON: Lazy<BughouseServer> = Lazy::new(|| BughouseServer::startup());

pub fn get_server(db: Arc<Db>) -> &'static BughouseServer {
    static INSTANCE: OnceCell<BughouseServer> = OnceCell::new();
    INSTANCE.get_or_init(move || BughouseServer::new(db))
}

// lazy_static! {
//     static ref SINGLETON: Option<BughouseServer> = None;
// block_on(BughouseServer::new())
// .expect("Couldn't create BughouseServer");
// }

// let mut singleton: Option<BughouseServer> = None;

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
/*
impl Handler<Auth> for BughouseServer {
    type Result = ResponseFuture<Result<ConnID, Error>>;
    // type Result = Result<ConnID, Error>;

    // Authenticate uid
    fn handle(&mut self, auth: Auth, ctx: &mut Context<Self>) -> Self::Result {
        // let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
        // write!(stream, "{}\n{}\n", FIRE_AUTH, auth.token)?;
        // let mut resp = String::new();
        // stream.read_to_string(&mut resp)?;
        // let (label, payload) = resp.split_once(':').unwrap();
        // match label {
        //     "uid" => {
        //         println!("auth.uid: {}", payload);
        //         let raddr = auth.addr.downgrade();
        //
        //         // Send AddConn message to self to await
        //             let conn_id = self.add_conn(auth.addr, payload).await?;
        //
        //         // TOOD - remove - just here emulating old auth
        //         let msg = json!({"kind": "login", "handle": "fak3"});
        //
        //         addr.upgrade().unwrap().send(ClientMessage(msg.to_string()));
        //
        //         return Ok(conn_id);
        //     },
        //     "err" => {
        //         return Err(Error::AuthError {
        //             reason: payload.to_string(),
        //         });
        //     },
        //     _ => {
        //         let msg = format!("Unknown response: {}", resp);
        //         return Err(Error::AuthError { reason: msg });
        //     }
        // }
        // let fut = this.clone().authenticate(auth, ctx);
        // Box::pin(async move {
        //     match fut.await {
        //         Ok(m) => {
        //             println!("Handler<Auth>: SUCCESS");
        //             // info!("Message Sent: {}", m);
        //             Ok(m)
        //         }
        //         Err(e) => {
        //             eprintln!("Handler<Auth>: FAIL");
        //             Err(e)
        //         }
        //     }
        // })
    }
}
*/

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

    // pub fn handle(
    //     &self,
    //     ctx: &mut WebsocketContext<BugWebSock>,
    //     kind: &str,
    //     val: &Value,
    //     ) -> Result<(), Error> {
    //     match kind {
    //         "auth" => {
    //             let token = val["token"].as_str().ok_or(Error::AuthError {
    //                 reason: "Malformed token".to_string(),
    //             })?;
    //             let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
    //             write!(stream, "{}\n{}\n", FIRE_AUTH, token)?;
    //             let mut resp = String::new();
    //             stream.read_to_string(&mut resp)?;
    //             let (label, payload) = resp.split_once(':').unwrap();
    //             match label {
    //                 "uid" => {
    //                     println!("auth.uid: {}", payload);
    //                     let msg = json!({"kind": "authenticated"});
    //                     ctx.text(msg.to_string());
    //                     // println!("address: {:?}", ctx.address());
    //                     println!("sending auth result");
    //                     ctx.address().try_send(AuthedFirebaseID(payload.to_string())).expect("try_send auth failed");
    //                     println!("sent");
    //                     // let me = Arc::new(self);
    //                     // let pay = payload.to_string();
    //                     // let addr = ctx.address();
    //                     // let fut = async move {
    //                     //     me.add_conn(&addr, payload).await.expect("Child add_conn failed");
    //                     // };
    //                     // let f = actix::fut::wrap_future::<_, BugWebSock>(fut);
    //                     // ctx.spawn(f);
    //                     // fut.into_actor(self).spawn(ctx);
    //                     // spawn();
    //                     // println!("spawned");
    //                             // thread::spawn(|| {
    //                         // if block_on(me.clone().add_conn(&addr, &pay)).is_err() {
    //                         //     eprintln!("add_conn errored!");
    //                         // }
    //                     // });
    //
    //                     // TOOD - remove - just here emulating old auth
    //                     let msg = json!({"kind": "login", "handle": "fak3"});
    //                     ctx.text(msg.to_string());
    //                 }
    //                 "err" => {
    //                     let msg = json!({"kind": "auth/err", "msg": payload});
    //                     ctx.text(msg.to_string());
    //                     return Err(Error::AuthError {
    //                         reason: payload.to_string(),
    //                     });
    //                 }
    //                 _ => {
    //                     let msg = format!("Unknown response: {}", resp);
    //                     return Err(Error::AuthError { reason: msg });
    //                 }
    //             }
    //             println!("response: {}", resp);
    //             Ok(())
    //         }
    //         _ => {
    //             eprintln!("Unknown msg: {:?}", val);
    //             Err(Error::MalformedClientMsg  {
    //                 msg: format!("{:?}", val),
    //                 reason: "unknown type".to_string(),
    //             })
    //         }
    //     }
    // }

    pub async fn add_conn(
        &'static self,
        recipient: Recipient<ClientMessage>,
        // addr: Addr<BugWebSock>,
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
