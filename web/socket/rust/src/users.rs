use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use scylla::cql_to_rust::{FromCqlVal, FromRow};
use scylla::macros::{FromRow, FromUserType, IntoUserType};

use crate::connection_mgr::UserID;
use crate::db::{Db, UserRowData};

#[derive(Clone, Debug, FromRow, IntoUserType, FromUserType)]
pub struct User {
    id: UserID,
    firebase_id: String,
    name: Option<String>,
    handle: String,
    rating: i16,
    deviation: i16,
    photo_url: Option<String>,
}

impl User {
    pub fn get_uid(&self) -> UserID {
        self.id
    }

    pub fn get_firebase_id(&self) -> String {
        self.firebase_id
    }

    pub fn get_handle(&self) -> String {
        self.handle.clone()
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

impl Into<User> for UserRowData {
    fn into(self) -> User{
        User {
            id: self.get_uid(),
            firebase_id: self.get_firebase_id(),
            name: self.get_name(),
            handle: self.get_handle(),
            rating: self.get_rating(),
            deviation: self.get_deviation(),
            photo_url: self.get_photo_url(),
        }
    }
}

// online users
pub struct Users {
    db: Arc<Db>,
    users: RwLock<HashMap<UserID, Arc<RwLock<User>>>>,
}

impl Users {
    pub fn new(
        db: Arc<Db>,
        ) -> Self {
        Users {
            db,
            users: RwLock::new(HashMap::new()),
        }
    }

    pub fn get(&self, uid: &UserID) -> Option<Arc<RwLock<User>>> {
        let users = self.users.read().unwrap();
        users.get(uid).cloned()
    }

    pub fn add(&self, user: &User) -> Arc<RwLock<User>> {
        let users = self.users.write().unwrap();
        let new_user = Arc::new(RwLock::new(*user));
        users.insert(user.get_uid(), new_user.clone());
        new_user
    }
}
