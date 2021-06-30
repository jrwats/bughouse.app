use actix::AsyncContext;
use actix::WeakAddr;
// use actix::prelude::Addr;
use actix_web_actors::ws::WebsocketContext;
use futures::executor::block_on;
use serde_json::json;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::mpsc;
use std::sync::mpsc::{Receiver, Sender};
use std::sync::Mutex;
use std::sync::RwLock;
use std::thread;
use uuid::Uuid;

use crate::bug_web_sock::{BugWebSock, TextPassthru};
use crate::db::Db;
use crate::error::Error;
use crate::firebase::*;

#[derive(Debug)]
pub struct UserConn {
    // ctx: Arc<WebsocketContext<BugWebSock>>,
    // addr: Arc<Addr<BugWebSock>>,
    addr: WeakAddr<BugWebSock>,
    uid: String,
}

impl UserConn {
    pub fn new(
        // w: &WebsocketContext<BugWebSock>,
        a: WeakAddr<BugWebSock>,
        uid: String,
    ) -> Self {
        UserConn {
            // ctx: Arc::new(w.to_owned()),
            addr: a,
            uid,
        }
    }
}

pub struct BughouseServer {
    // connections
    conns: RwLock<HashMap<u64, UserConn>>,
    db: Db,
    tx: Mutex<Sender<String>>,
}

lazy_static! {
    static ref SINGLETON: BughouseServer = block_on(BughouseServer::new())
        .expect("Couldn't create BughouseServer");
}

fn hash<T: Hash>(hashable: &T) -> u64 {
    let mut hasher = DefaultHasher::new();
    hashable.hash(&mut hasher);
    hasher.finish()
}

impl BughouseServer {
    async fn new() -> Result<Self, Error> {
        let (tx, rx): (Sender<String>, Receiver<String>) = mpsc::channel();
        let _receiver = thread::spawn(move || {
            for msg in rx {
                println!("rx received: {}", msg);
            }
        });

        let db = Db::new().await?;
        Ok(BughouseServer {
            conns: RwLock::new(HashMap::new()),
            db,
            tx: Mutex::new(tx),
        })
    }

    pub fn get() -> &'static Self {
        &SINGLETON
    }

    fn get_user_data(tx: Sender<String>, uid: String) -> Result<(), Error> {
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
                    tx.send(payload.to_string())?;
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

    pub async fn add_conn(
        &self,
        ctx: &WebsocketContext<BugWebSock>,
        fid: &str,
    ) -> Result<(), Error> {
        let mut conns = self.conns.write().unwrap();
        let addr = &ctx.address();
        let hash = hash(&addr);
        let _uid = self.get_uid_from_fid(fid).await?;
        println!("map[{:?}] = {:?}", hash, (addr, fid));
        conns.insert(hash, UserConn::new(addr.downgrade(), fid.to_string()));
        if addr
            .try_send(TextPassthru("testng 123".to_string()))
            .is_err()
        {
            eprintln!("whoopsies!");
        }

        let tx = self.tx.lock().unwrap().clone();
        let uid_str = fid.to_string();
        thread::spawn(move || {
            if BughouseServer::get_user_data(tx, uid_str).is_err() {
                eprintln!("ruh oh");
            }
        });
        Ok(())
    }
}
