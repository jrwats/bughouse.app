use crate::db::Db;
use crate::messages::ClientMessage;
use actix::prelude::*;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use uuid::Uuid;

// use std::io::prelude::{Read, Write};
use crate::error::Error;
use crate::hash::hash;
use crate::users::{User, Users};

pub type ConnID = u64;
pub type UserID = Uuid;

struct SockConn {
    recipient: Recipient<ClientMessage>,
    uid: UserID,
}

impl SockConn {
    pub fn new(recipient: Recipient<ClientMessage>, uid: UserID) -> Self {
        SockConn { recipient, uid }
    }

    pub fn recipient(&self) -> &Recipient<ClientMessage> {
        &self.recipient
    }

    pub fn uid(&self) -> &UserID {
        &self.uid
    }
}

pub struct ConnectionMgr {
    db: Arc<Db>,
    users: Arc<Users>,
    conns: RwLock<HashMap<ConnID, SockConn>>,
    user_conns: RwLock<HashMap<UserID, HashSet<ConnID>>>,
    fid_users: RwLock<HashMap<String, UserID>>,
}

impl ConnectionMgr {
    pub fn new(db: Arc<Db>, users: Arc<Users>) -> Self {
        ConnectionMgr {
            db: db.clone(),
            users,
            conns: RwLock::new(HashMap::new()),
            user_conns: RwLock::new(HashMap::new()),
            fid_users: RwLock::new(HashMap::new()),
        }
    }

    // pub fn user_from_uid(&self, uid: &UserID) -> Option<Arc<UserRowData>> {
    //     let user_conns = self.user_conns.read().unwrap();
    //     if let Some(conn_ids) = user_conns.get(&uid) {
    //         for conn_id in conn_ids.iter() {
    //             if let Some(sock_conn) = self.conns.read().unwrap().get(conn_id) {
    //                 return Some(sock_conn.user())
    //             }
    //         }
    //     }
    //     None
    // }

    pub async fn user_from_fid(
        &self,
        fid: &str, // firebase ID
    ) -> Result<Arc<RwLock<User>>, Error> {
        println!("user_from_fid: {}", fid);
        {
            let f2u = self.fid_users.read().unwrap();
            if let Some(uid) = f2u.get(fid) {
                if let Some(user) = self.users.get(uid) {
                    //self.user_from_uid(uid) {
                    return Ok(user);
                }
            }
        }
        let user = self.db.user_from_firebase_id(fid).await?;
        {
            let mut f2u = self.fid_users.write().unwrap();
            f2u.insert(fid.to_string(), *user.get_uid());
        }
        Ok(self.users.add(user.into()))
    }

    pub async fn add_conn(
        &self,
        recipient: Recipient<ClientMessage>,
        fid: &str, // firebase ID
    ) -> Result<ConnID, Error> {
        let user = self.user_from_fid(fid).await?;
        println!("ConnectionMgr.add_conn ...");
        let user = user.read().unwrap();
        let uid = *user.get_uid();
        let conn_id = hash(&recipient);
        println!("inserting...");
        {
            if self.conns.read().unwrap().contains_key(&conn_id) {
                return Err(Error::Unexpected("Hash collision".to_string()));
            }
            let mut conns = self.conns.write().unwrap();
            conns.insert(conn_id, SockConn::new(recipient, uid));
        }
        {
            let mut u2c = self.user_conns.write().unwrap();
            let conns = u2c.get_mut(&uid);
            match conns {
                None => {
                    let set: HashSet<ConnID> =
                        [conn_id].iter().cloned().collect();
                    eprintln!("1st conn for uid, {}: {}", uid, conn_id);
                    u2c.insert(uid, set);
                }
                Some(v) => {
                    if !v.insert(conn_id) {
                        eprintln!("user_conn collision: {}", conn_id);
                    }
                    eprintln!("Nth conn for uid, {}: {}", uid, conn_id);
                }
            }
        }
        Ok(conn_id)
    }

    pub fn send_to_user(&self, uid: UserID, msg: &ClientMessage) {
        let conns = self.conns.read().unwrap();
        let mut conn_id_to_remove: Option<ConnID> = None;
        {
            if let Some(conn_ids) = self.user_conns.read().unwrap().get(&uid) {
                for conn_id in conn_ids.iter() {
                    let conn = conns.get(conn_id).unwrap();
                    let res = conn.recipient().do_send(msg.clone());
                    if let Err(e) = res {
                        eprintln!("Failed sending msg: {:?}", e);
                        if let SendError::Closed(_) = e {
                            conn_id_to_remove = Some(*conn_id);
                        } else {
                            eprintln!(
                                "Full mailbox for uid: {}! {}",
                                uid, conn_id
                            );
                        }
                    }
                }
            }
        }
        if let Some(conn_id) = conn_id_to_remove {
            println!("Removing {} from uid {} conns", conn_id, uid);
            if let Some(conn_ids) =
                self.user_conns.write().unwrap().get_mut(&uid)
            {
                conn_ids.remove(&conn_id);
            }
        }
    }

    pub fn user_from_conn(&self, conn_id: ConnID) -> Option<Arc<RwLock<User>>> {
        let conns = self.conns.read().unwrap();
        match conns.get(&conn_id) {
            None => None,
            Some(sock_conn) => self.users.get(&sock_conn.uid),
        }
    }

    pub fn get_conn_id(recipient: &Recipient<ClientMessage>) -> ConnID {
        hash(recipient)
    }

    pub fn uid_from_conn(&self, conn_id: &ConnID) -> Option<UserID> {
        let conns = self.conns.read().unwrap();
        let sock_conn = conns.get(conn_id)?;
        Some(*sock_conn.uid())
    }

    pub fn online_users(&self) -> HashMap<UserID, Arc<RwLock<User>>> {
        let mut res: HashMap<UserID, Arc<RwLock<User>>> = HashMap::new();
        for (user_id, conns) in self.user_conns.read().unwrap().iter() {
            if conns.len() > 0 {
                eprintln!("{} conns: {:?}", user_id, conns);
                if let Some(user) = self.users.get(user_id) {
                    res.insert(*user_id, user);
                } else {
                    eprintln!("conn_mgr:online_users Couldn't get online user?");
                }
            }
        }
        res
    }

    pub fn remove_conn(&self, conn_id: &ConnID) -> Result<(), Error> {
        let uid = self.uid_from_conn(conn_id).unwrap_or_default();
        {
            let mut conns = self.conns.write().unwrap();
            conns.remove(&conn_id);
        }
        if uid != Uuid::nil() {
            let mut u2c = self.user_conns.write().unwrap();
            let conns = u2c.get_mut(&uid).ok_or(Error::Unexpected(format!(
                "Couldn't find user: {}",
                &uid
            )))?;
            eprintln!("Removing conn for uid, {}: {}", uid, conn_id);
            conns.remove(conn_id);
        } else {
            eprintln!("uid nil for conn: {}", conn_id);
        }
        println!("ConnectionMgr::remove_conn: {}", conn_id);
        Ok(())
    }

    pub fn on_close(
        &self,
        recipient: &Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        let conn_id = Self::get_conn_id(recipient);
        if !self.conns.read().unwrap().contains_key(&conn_id) {
            return Ok(());
        }
        self.remove_conn(&conn_id)
    }
}
