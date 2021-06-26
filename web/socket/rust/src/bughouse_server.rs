use actix::AsyncContext;
use actix::WeakAddr;
// use actix::prelude::Addr;
use actix_web_actors::ws::WebsocketContext;
// use futures::channel::mpsc::{Receiver, Sender};
use std::collections::HashMap;
use std::collections::hash_map::DefaultHasher;
use std::io::prelude::{Read, Write};
use std::hash::{Hash, Hasher};
use serde_json::json;
use std::sync::Mutex;
use std::sync::RwLock;
use std::sync::mpsc::{Sender, Receiver};
use std::sync::mpsc;
use std::os::unix::net::UnixStream;
use std::thread;

use crate::error::Error;
use crate::firebase::*;
use crate::bug_web_sock::{TextPassthru, BugWebSock};

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
        uid: String
    ) -> Self {
        UserConn { 
            // ctx: Arc::new(w.to_owned()), 
            addr: a,
            uid 
        }
    }
}

#[derive(Debug)]
pub struct BughouseServer {
    // connections
    conns: RwLock<HashMap<u64, UserConn>>,
    tx: Mutex<Sender<String>>,
}

lazy_static! {
    static ref SINGLETON: BughouseServer = BughouseServer::new();
}

fn hash<T: Hash>(hashable: &T) -> u64 {
    let mut hasher = DefaultHasher::new();
    hashable.hash(&mut hasher);
    hasher.finish()
}

impl BughouseServer {
    fn new() -> Self {
        let (tx, rx): (Sender<String>, Receiver<String>) = mpsc::channel();
        let _receiver = thread::spawn(move || {
            for msg in rx {
                println!("rx received: {}", msg);
            }
        });

        BughouseServer { 
            conns: RwLock::new(HashMap::new()),
            tx: Mutex::new(tx),
        }
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
                let parts: Vec<&str>  = payload.split('\x1e').collect();
                if let [name, email, photo_url, provider_id] = parts[..] {
                    println!("name: {}\temail: {}, photo: {}, provider: {}",
                             name, email, photo_url, provider_id);
                    tx.send(payload.to_string())?;
                } else {
                    println!("Couldn't parse: {}", payload);
                }
            }
            "err" => {
                eprintln!("err: {}", payload);
            }
            _ => {
            }
        }
        Ok(())
    }

    pub fn add_conn(&self, ctx: &WebsocketContext<BugWebSock>, uid: &str) {
        let mut conns = self.conns.write().unwrap();
        let addr = &ctx.address();
        let hash = hash(&addr);
        println!("map[{:?}] = {:?}", hash, (addr, uid));
        conns.insert(hash, UserConn::new(addr.downgrade(), uid.to_string()));
        let test = json!({"kind": "test", "payload": "hi"});
        if addr.try_send(TextPassthru(test.to_string())).is_err() {
            eprintln!("whoopsies!");
        }

        let tx = self.tx.lock().unwrap().clone();
        let uid_str = uid.to_string();
        thread::spawn(move || {
            if BughouseServer::get_user_data(tx, uid_str).is_err() {
                eprintln!("ruh oh");
            }

        });
    }
}

