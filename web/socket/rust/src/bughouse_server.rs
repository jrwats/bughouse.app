use actix::{Actor, AsyncContext, Context, Handler, WeakAddr};
use actix::prelude::*;
use actix_web_actors::ws::WebsocketContext;
use serde_json::{json, Value};
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::mpsc;
use std::sync::mpsc::{Receiver, Sender};
use std::sync::{Mutex, RwLock};
use std::sync::atomic::AtomicUsize;
use std::thread;
use uuid::Uuid;

use crate::bug_web_sock::BugWebSock;
use crate::messages::{Auth, WsMessage};
use crate::db::Db;
use crate::error::Error;
use crate::firebase::*;

pub struct SocketConn  {
    addr: Addr<BugWebSock>,
    uid: String,
}

impl SocketConn {
    pub fn new(
        // w: &WebsocketContext<BugWebSock>,
        addr: Addr<BugWebSock>,
        uid: String,
    ) -> Self {
        SocketConn { addr, uid, }
    }
}

pub struct BughouseServer {
    conns: RwLock<HashMap<u64, SocketConn>>, // connections
    db: Db,
    // tx: Mutex<Sender<String>>,
}

// lazy_static! {
//     static ref SINGLETON: Option<BughouseServer> = None;
// block_on(BughouseServer::new())
// .expect("Couldn't create BughouseServer");
// }

// let mut singleton: Option<BughouseServer> = None;

fn hash<T: Hash>(hashable: &T) -> u64 {
    let mut hasher = DefaultHasher::new();
    hashable.hash(&mut hasher);
    hasher.finish()
}

pub type ConnID = u64;

impl Actor for BughouseServer {
  /// Just need ability to communicate with other actors.
  type Context = Context<Self>;
}

impl Handler<Auth> for BughouseServer {
    // ResponseFuture<Result<String, std::convert::Infallible>>
    type Result = Result<ConnID, Error>;

    // Authenticate uid
    fn handle(&mut self, auth: Auth, ctx: &mut Context<Self>) -> Self::Result {
        let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
        write!(stream, "{}\n{}\n", FIRE_AUTH, auth.token)?;
        let mut resp = String::new();
        stream.read_to_string(&mut resp)?;
        let (label, payload) = resp.split_once(':').unwrap();
        match label {
            "uid" => {
                println!("auth.uid: {}", payload);
                let raddr = auth.addr.downgrade();

                // Send AddConn message to self to await
                Box::pin(async move {
                    let conn_id = self.add_conn(auth.addr, payload).await?;
                });

                // TOOD - remove - just here emulating old auth
                let msg = json!({"kind": "login", "handle": "fak3"});
                raddr.upgrade().unwrap().send(WsMessage(msg.to_string()));

                return Ok(conn_id);
            },
            "err" => {
                return Err(Error::AuthError {
                    reason: payload.to_string(),
                });
            },
            _ => {
                let msg = format!("Unknown response: {}", resp);
                return Err(Error::AuthError { reason: msg });
            }
        }
        // let fut = self.authenticate(msg, ctx);
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

impl BughouseServer {
    pub fn startup(db: Db) -> Self {
        // let (tx, rx): (Sender<String>, Receiver<String>) = mpsc::channel();
        // let _receiver = thread::spawn(move || {
        //     for msg in rx {
        //         println!("rx received: {}", msg);
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

    async fn get_uid_from_fid(&self, fid: &str) -> Result<Uuid, Error> {
        let user = self.db.user_from_firebase_id(fid).await?;
        Ok(user.get_uid())
    }

    async fn authenticate(
        &self, 
        auth: Auth, 
        ctx: &mut Context<Self>
        ) -> Result<ConnID, Error> {
        let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
        write!(stream, "{}\n{}\n", FIRE_AUTH, auth.token)?;
        let mut resp = String::new();
        stream.read_to_string(&mut resp)?;
        let (label, payload) = resp.split_once(':').unwrap();
        match label {
            "uid" => {
                println!("auth.uid: {}", payload);
                let raddr = auth.addr.downgrade();

                let conn_id = self.add_conn(auth.addr, payload).await?;

                // TOOD - remove - just here emulating old auth
                let msg = json!({"kind": "login", "handle": "fak3"});
                raddr.upgrade().unwrap().send(WsMessage(msg.to_string()));

                return Ok(conn_id);
            },
            "err" => {
                return Err(Error::AuthError {
                    reason: payload.to_string(),
                });
            },
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
        &self,
        addr: Addr<BugWebSock>,
        fid: &str,
    ) -> Result<ConnID, Error> {
        println!("BS add_conn");
        let mut conns = self.conns.write().unwrap();
        let conn_id = hash(&addr);
        let uid = self.get_uid_from_fid(fid).await?;
        println!("map[{:?}] = {:?}", conn_id, (uid, fid));
        if conns.contains_key(&conn_id) {
            return Err(Error::Unexpected("Hash collision".to_string()));
        }

        conns.insert(conn_id, SocketConn::new(addr, uid.to_string()));

        // let tx = self.tx.lock().unwrap().clone();
        let uid_str = fid.to_string();
        if BughouseServer::get_user_data(uid_str).is_err() {
            eprintln!("ruh oh");
        }
        Ok(conn_id)
    }
}
