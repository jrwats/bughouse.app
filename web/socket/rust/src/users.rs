use scylla::cql_to_rust::{FromCqlVal, FromRow};
use scylla::macros::{FromRow, FromUserType, IntoUserType};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use crate::db::Db;

pub type UserID = Uuid;

#[derive(Clone, Debug, FromRow, IntoUserType, FromUserType)]
pub struct User {
    pub id: UserID,
    pub firebase_id: String,
    pub deviation: i16,
    pub email: Option<String>,
    pub guest: bool,
    pub handle: String,
    pub name: Option<String>,
    pub photo_url: Option<String>,
    pub rating: i16,
}

impl User {
    pub fn get_uid(&self) -> &UserID {
        &self.id
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

    // If, on the offchance, that a user disconnects right after game start (and is not present),
    // try fetching user from DB.
    pub async fn maybe_user_from_uid(
        &'static self,
        uid: &UserID,
    ) -> Option<Arc<RwLock<User>>> {
        if let Some(u) = self.get(uid) {
            return Some(u);
        } else if let Some(user) = self.db.get_user(uid).await {
            return Some(self.add(user));
        }
        None
    }

    pub fn add(&self, user: User) -> Arc<RwLock<User>> {
        let mut users = self.users.write().unwrap();
        let new_user = Arc::new(RwLock::new(user));
        users.insert(new_user.read().unwrap().id, new_user.clone());
        new_user
    }
}
