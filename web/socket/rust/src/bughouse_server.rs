use actix::prelude::Addr;
use std::collections::HashMap;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::{Arc, RwLock};

use crate::bug_web_sock::BugWebSock;

#[derive(Debug)]
pub struct UserConn {
    addr: Arc<Addr<BugWebSock>>,
    // addr: &Addr<BugWebSock>,
    uid: String,
}

impl UserConn {
    pub fn new(a: &Addr<BugWebSock>, uid: String) -> Self {
        UserConn { addr: Arc::new(a.to_owned()), uid }
    }
}

#[derive(Debug)]
pub struct BughouseServer {
    // connections
    conns: RwLock<HashMap<u64, UserConn>>,
    // hasher: Mutex<DefaultHasher>,
}

lazy_static! {
    static ref SINGLETON: BughouseServer = BughouseServer::new();
}

impl BughouseServer {
    fn new() -> Self {
        BughouseServer { 
            conns: RwLock::new(HashMap::new()),
            // hasher: Mutex::new(DefaultHasher::new()),
        }
    }

    pub fn get() -> &'static Self {
        &SINGLETON
    }

    fn hash(&self, addr: &Addr<BugWebSock>) -> u64 {
        let mut hasher = DefaultHasher::new();
        addr.hash(&mut hasher);
        hasher.finish()
    }

    pub fn add_conn(&self, addr: &Addr<BugWebSock>, uid: &str) {
        let mut conns = self.conns.write().unwrap();
        let hash = self.hash(addr);
        println!("map[{:?}] = {:?}", hash, (addr, uid));
        conns.insert(hash, UserConn::new(addr, uid.to_string()));
    }
}

