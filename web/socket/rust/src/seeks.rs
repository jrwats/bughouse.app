use std::collections::{HashMap, HashSet};
use std::sync::RwLock;

use crate::connection_mgr::UserID;
use crate::time_control::{TimeControl, TimeID};
use crate::error::Error;

pub type SeekMap = HashMap<TimeID, HashSet<UserID>>;

pub struct Seeks {
    seeks: RwLock<SeekMap>,
    user_seeks: RwLock<HashMap<UserID, HashSet<TimeID>>>,
}

impl Seeks {
    pub fn new() -> Self {
        Seeks {
            seeks: RwLock::new(HashMap::new()),
            user_seeks: RwLock::new(HashMap::new()),
        }
    }

    pub fn get_seeks(&self) -> SeekMap {
        self.seeks.read().unwrap().to_owned()
    }

    pub fn add_seeker(&self, time_ctrl: TimeControl, uid: UserID) -> Result<(), Error> {
        let time_id = time_ctrl.get_id();
        {
            let mut seeks = self.seeks.write().unwrap();
            let users = seeks.get_mut(&time_id).ok_or(Error::Unexpected("Couldn't get seeks".to_string()))?;
            users.insert(uid);
        }
        {
            let mut user_seeks = self.user_seeks.write().unwrap();
            let time_ctrls = user_seeks.get_mut(&uid).ok_or(Error::Unexpected("Couldn't get user seeks".to_string()))?;
            time_ctrls.insert(time_id);
        }
        Ok(())
    }

    pub fn rm_seeker(&self, time_ctrl: TimeControl, uid: UserID) -> Result<(), Error> {
        let time_id = time_ctrl.get_id();
        {
            let mut user_seek_times = self.user_seeks.write().unwrap();
            let seeks = user_seek_times.get_mut(&uid).ok_or(Error::Unexpected("Can't get seeks?".to_string()))?;
            seeks.remove(&time_id);
        }
        {
            let mut seeks = self.seeks.write().unwrap();
            let users = seeks.get_mut(&time_id).ok_or(Error::Unexpected("Can't get seeks?".to_string()))?;
            users.remove(&uid);
        }
        Ok(())
    }

    pub fn remove_all_user_seeks(&self, uid: UserID) -> Result<(), Error> {
        {
            let user_seek_times = self.user_seeks.read().unwrap();
            let mut seeks = self.seeks.write().unwrap();
            let user_seeks = user_seek_times.get(&uid).ok_or(Error::Unexpected("Couldn't get seek times".to_string()))?;
            for time_id in user_seeks {
                match seeks.get_mut(time_id) {
                    Some(users) => { users.remove(&uid); },
                    None => eprintln!("Couldn't get seeks for {}", uid),
                }
            }
        }
        let mut user_seek_times  = self.user_seeks.write().unwrap();
        user_seek_times.remove(&uid);
        Ok(())
    }

}
