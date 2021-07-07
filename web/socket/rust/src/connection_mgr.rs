use actix::prelude::*;
use crate::messages::ClientMessage;
use crate::db::UserRowData;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use uuid::Uuid;

// use std::io::prelude::{Read, Write};
use crate::error::Error;
use crate::hash::hash;

pub type ConnID = u64;
pub type UserID = Uuid;

pub struct SocketConn {
    recipient: Recipient<ClientMessage>,
    user: Arc<UserRowData>,
}

impl SocketConn {
    pub fn new(
        recipient: Recipient<ClientMessage>,
        user: UserRowData,
    ) -> Self {
        SocketConn { recipient, user: Arc::new(user) }
    }
}


pub struct ConnectionMgr {
    conns: RwLock<HashMap<u64, SocketConn>>,
    user_conns: RwLock<HashMap<UserID, HashSet<ConnID>>>,
}

impl ConnectionMgr {
    pub fn new() -> Self {
        ConnectionMgr {
            conns: RwLock::new(HashMap::new()),
            user_conns: RwLock::new(HashMap::new()),
        }
    }

    pub fn add_conn(
        &self,
        recipient: Recipient<ClientMessage>,
        user: UserRowData,
        ) -> Result<ConnID, Error> {
        println!("ConnectionMgr.add_conn ...");
        let uid = user.get_uid();
        let conn_id = hash(&recipient);
        println!("inserting...");
        {
            if self.conns.read().unwrap().contains_key(&conn_id) {
                return Err(Error::Unexpected("Hash collision".to_string()));
            }
            let mut conns = self.conns.write().unwrap();
            let sock_conn = SocketConn::new(recipient, user);
            conns.insert(conn_id, sock_conn);
        }
        {
            let mut u2c = self.user_conns.write().unwrap();
            let conns = u2c.get_mut(&uid);
            match conns {
                None =>  {
                    let set: HashSet<ConnID> = [conn_id].iter().cloned().collect();
                    u2c.insert(uid, set);
                },
                Some(v) => {
                    if !v.insert(conn_id) {
                        eprintln!("user_conn collision: {}", conn_id);
                    }
                }
            }
        }
        Ok(conn_id)
    }

    pub fn get_user(
        &self,
        conn_id: ConnID,
        ) -> Option<Arc<UserRowData>> {
        let conns = self.conns.read().unwrap();
        match conns.get(&conn_id) {
            None => None,
            Some(sock_conn) => Some(sock_conn.user.clone()),
        }
    }

    pub fn get_conn_id(recipient: &Recipient<ClientMessage>) -> ConnID {
        hash(recipient)
    }

    fn uid_from_conn(
        &self,
        conn_id: ConnID,
        ) -> Result<UserID, Error> {
        let conns = self.conns.read().unwrap();
        let sock_conn = conns.get(&conn_id)
            .ok_or(Error::Unexpected(format!("Couldn't find conn: {}", &conn_id)))?;
        Ok(sock_conn.user.get_uid())
    }

    pub fn remove_conn(
        &self,
        conn_id: ConnID,
        ) -> Result<(), Error> {
        let uid = self.uid_from_conn(conn_id).unwrap_or_default();
        {
            let mut conns = self.conns.write().unwrap();
            conns.remove(&conn_id);
        }
        if uid != Uuid::nil() {
            let mut u2c = self.user_conns.write().unwrap();
            let conns = u2c.get_mut(&uid)
                .ok_or(Error::Unexpected(format!("Couldn't find user: {}", &uid)))?;
            conns.remove(&conn_id);
        }
        println!("Removed {}", conn_id);
        Ok(())
    }

    pub fn on_close(
        &self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        let conn_id = Self::get_conn_id(&recipient);
        if !self.conns.read().unwrap().contains_key(&conn_id) {
            return Ok(());
        }
        self.remove_conn(conn_id)
    }

}

