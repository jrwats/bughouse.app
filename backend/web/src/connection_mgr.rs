use crate::db::Db;
use crate::messages::{
    ClientMessage, ClientMessageKind, UserStateKind, UserStateMessage,
};
use actix::prelude::*;
use bytestring::ByteString;
use serde_json::json;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use uuid::Uuid;

// use std::io::prelude::{Read, Write};
use crate::b66::B66;
use crate::error::Error;
use crate::hash::hash;
use crate::users::{User, UserID, Users};

pub type ConnID = u64;

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
    user_handlers: RwLock<HashSet<Recipient<UserStateMessage>>>,
    fid_users: RwLock<HashMap<String, UserID>>,
    subs: RwLock<HashSet<Recipient<ClientMessage>>>,
}

impl ConnectionMgr {
    pub fn new(db: Arc<Db>, users: Arc<Users>) -> Self {
        ConnectionMgr {
            db: db.clone(),
            users,
            conns: RwLock::new(HashMap::new()),
            user_conns: RwLock::new(HashMap::new()),
            user_handlers: RwLock::new(HashSet::new()),
            fid_users: RwLock::new(HashMap::new()),
            subs: RwLock::new(HashSet::new()),
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
                    self.on_online_user(uid);
                }
                Some(v) => {
                    if v.len() == 0 {
                        self.on_online_user(uid);
                    }
                    if !v.insert(conn_id) {
                        eprintln!("user_conn collision: {}", conn_id);
                    }
                    eprintln!("Nth conn for uid, {}: {}", uid, conn_id);
                }
            }
        }
        Ok(conn_id)
    }

    pub fn send_to_conn(
        &self,
        conn_id: &ConnID,
        msg: ClientMessage,
    ) -> Result<(), Error> {
        let conns = self.conns.read().unwrap();
        let conn = conns.get(conn_id).unwrap();
        conn.recipient().do_send(msg)?;
        Ok(())
    }

    pub fn send_to_user(&self, uid: &UserID, msg: &ClientMessage) {
        let mut conn_id_to_remove: Option<ConnID> = None;
        {
            let conns = self.conns.read().unwrap();
            if let Some(conn_ids) = self.user_conns.read().unwrap().get(&uid) {
                for conn_id in conn_ids.iter() {
                    let maybe_conn = conns.get(conn_id);
                    if maybe_conn.is_none() {
                        continue;
                    }
                    let conn = maybe_conn.unwrap();
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

    pub fn recipient_from_conn(
        &self,
        conn_id: &ConnID,
    ) -> Option<Recipient<ClientMessage>> {
        let conns = self.conns.read().unwrap();
        let sock_conn = conns.get(conn_id)?;
        Some(sock_conn.recipient.clone())
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
                // eprintln!("{} conns: {:?}", user_id, conns);
                if let Some(user) = self.users.get(user_id) {
                    res.insert(*user_id, user);
                } else {
                    eprintln!(
                        "conn_mgr:online_users Couldn't get online user?"
                    );
                }
            }
        }
        res
    }

    pub fn get_online_players(
        online_users: HashMap<UserID, Arc<RwLock<User>>>,
    ) -> Vec<(String, String, Option<i16>)> {
        online_users
            .iter()
            .map(|(uid, user)| {
                let ruser = user.read().unwrap();
                let rating: Option<i16> = if ruser.guest {
                    None
                } else {
                    Some(ruser.rating)
                };
                (B66::encode_uuid(uid), ruser.handle.clone(), rating)
            })
            .collect()
    }

    pub fn unsub_online_players(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        let mut wsubs = self.subs.write().unwrap();
        wsubs.remove(&recipient);
        Ok(())
    }

    pub fn sub_online_players(
        &'static self,
        recipient: Recipient<ClientMessage>,
    ) -> Result<(), Error> {
        let mut wsubs = self.subs.write().unwrap();
        wsubs.insert(recipient);
        Ok(())
    }

    pub fn add_user_handler(&self, recipient: Recipient<UserStateMessage>) {
        let mut whandlers = self.user_handlers.write().unwrap();
        whandlers.insert(recipient);
    }

    pub fn rm_user_handler(&self, recipient: Recipient<UserStateMessage>) {
        let mut whandlers = self.user_handlers.write().unwrap();
        whandlers.remove(&recipient);
    }

    fn on_online_user(&self, uid: UserID) {
        self.notify_online_subs([uid].iter().cloned().collect(), HashSet::new())
    }

    fn on_offline_user(&self, uid: UserID) {
        let msg = UserStateMessage::new(UserStateKind::Offline(uid));
        self.notify_user_handlers(msg);
        self.notify_online_subs(HashSet::new(), [uid].iter().cloned().collect())
    }

    fn notify_user_handlers(&self, msg: UserStateMessage) {
        let rhandlers = self.user_handlers.read().unwrap();
        for handler in rhandlers.iter() {
            let res = handler.do_send(msg.clone());
            if let Err(e) = res {
                eprintln!("Failed sending to user handler: {}", e);
            }
        }
    }

    fn notify_online_subs(
        &self,
        online: HashSet<UserID>,
        offline: HashSet<UserID>,
    ) {
        let players: Vec<(String, String, Option<i16>)> =
            Self::get_online_players(
                online
                    .iter()
                    .map(|uid| (*uid, self.users.get(uid).unwrap()))
                    .collect(),
            );
        let offline_ids: Vec<String> =
            offline.iter().map(|uid| B66::encode_uuid(uid)).collect();
        let json = json!({
            "kind": "online_players_update",
            "offline": offline_ids,
            "online": players,
        });
        let json_str = Arc::new(ByteString::from(json.to_string()));
        let msg = ClientMessage::new(ClientMessageKind::Text(json_str.clone()));
        println!(
            "notifying {} subs: {}",
            self.subs.read().unwrap().len(),
            json_str
        );
        let mut subs_to_remove = HashSet::new();
        {
            let rsubs = self.subs.read().unwrap();
            for sub in rsubs.iter() {
                let res = sub.do_send(msg.clone());
                if res.is_err() {
                    eprintln!(
                        "Couldn't update sub: {}",
                        Self::get_conn_id(sub)
                    );
                    subs_to_remove.insert(sub.clone());
                }
            }
        }
        let mut wsubs = self.subs.write().unwrap();
        for sub in subs_to_remove.iter() {
            wsubs.remove(sub);
        }
    }

    pub fn remove_conn(&self, conn_id: &ConnID) -> Result<(), Error> {
        let uid = self.uid_from_conn(conn_id).unwrap_or_default();
        {
            let mut conns = self.conns.write().unwrap();
            conns.remove(&conn_id);
        }
        if uid != Uuid::nil() {
            let mut u2c = self.user_conns.write().unwrap();
            let user_conns = u2c.get_mut(&uid).ok_or(Error::Unexpected(format!(
                "Couldn't find user: {}",
                &uid
            )))?;
            eprintln!("Removing conn for uid, {}: {}", uid, conn_id);
            user_conns.remove(conn_id);
            if user_conns.len() == 0 {
                self.on_offline_user(uid);
            }
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
