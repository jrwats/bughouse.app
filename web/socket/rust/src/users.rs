use scylla::cql_to_rust::{FromCqlVal, FromRow};
use scylla::macros::{FromRow, FromUserType, IntoUserType};
use std::collections::HashMap;
use std::convert::From;
use std::sync::{Arc, RwLock};

use crate::connection_mgr::UserID;
use crate::db::{Db, UserRowData};

#[derive(Clone, Debug, FromRow, IntoUserType, FromUserType)]
pub struct User {
    id: UserID,
    firebase_id: String,
    handle: String,
    deviation: i16,
    email: Option<String>,
    name: Option<String>,
    photo_url: Option<String>,
    rating: i16,
}

impl From<UserRowData> for User {
    fn from(row: UserRowData) -> Self {
        User {
            id: row.get_uid(),
            firebase_id: row.get_firebase_id(),
            handle: row.get_handle(),
            deviation: row.get_deviation(),
            email: row.get_email(),
            name: row.get_name(),
            photo_url: row.get_photo_url(),
            rating: row.get_rating(),
        }
    }
}

impl User {
    pub fn get_uid(&self) -> UserID {
        self.id
    }

    pub fn get_firebase_id(&self) -> String {
        self.firebase_id.clone()
    }

    pub fn get_handle(&self) -> String {
        self.handle.clone()
    }

    pub fn get_email(&self) -> Option<String> {
        self.email.clone()
    }

    pub fn get_name(&self) -> Option<String> {
        self.name.clone()
    }

    pub fn get_rating(&self) -> i16 {
        self.rating
    }

    pub fn get_deviation(&self) -> i16 {
        self.deviation
    }

    pub fn get_photo_url(&self) -> Option<String> {
        self.photo_url.clone()
    }
}

// online users
pub struct Users {
    db: Arc<Db>,
    users: RwLock<HashMap<UserID, Arc<RwLock<User>>>>,
}

impl Users {
    pub fn new(db: Arc<Db>) -> Self {
        Users {
            db,
            users: RwLock::new(HashMap::new()),
        }
    }

    pub fn get(&self, uid: &UserID) -> Option<Arc<RwLock<User>>> {
        let users = self.users.read().unwrap();
        users.get(uid).cloned()
    }

    pub fn add(&self, user: User) -> Arc<RwLock<User>> {
        let mut users = self.users.write().unwrap();
        let new_user = Arc::new(RwLock::new(user));
        users.insert(new_user.read().unwrap().get_uid(), new_user.clone());
        new_user
    }
}
