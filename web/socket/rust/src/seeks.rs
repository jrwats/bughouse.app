use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};

use crate::connection_mgr::UserID;
use crate::error::Error;
use crate::game::GamePlayers;
use crate::time_control::{TimeControl, TimeID};
use crate::users::Users;

pub type SeekMap = HashMap<TimeID, HashSet<UserID>>;

pub struct Seeks {
    users: Arc<Users>,
    seeks: RwLock<SeekMap>,
    user_seeks: RwLock<HashMap<UserID, HashSet<TimeID>>>,
}

impl Seeks {
    pub fn new(users: Arc<Users>) -> Self {
        Seeks {
            users,
            seeks: RwLock::new(HashMap::new()),
            user_seeks: RwLock::new(HashMap::new()),
        }
    }

    pub fn get_seeks(&self) -> SeekMap {
        self.seeks.read().unwrap().to_owned()
    }

    pub fn form_game(&self, time_ctrl: &TimeControl) -> Option<GamePlayers> {
        let seeks = self.seeks.read().unwrap();
        let time_id = time_ctrl.get_id();
        if let Some(players) = seeks.get(&time_id) {
            if players.len() < 4 {
                return None;
            }
            let game_players: Vec<&UserID> =
                players.iter().take(4).collect::<Vec<&UserID>>();
            if let [aw, ab, bw, bb] = &game_players[0..4] {
                let [awp, abp, bwp, bbp] = [
                    self.users.get(aw),
                    self.users.get(ab),
                    self.users.get(bw),
                    self.users.get(bb),
                ];
                if [&awp, &abp, &bwp, &bbp].iter().any(|b| b.is_none()) {
                    return None;
                }
                let players = [
                    [awp.unwrap(), abp.unwrap()],
                    [bwp.unwrap(), bbp.unwrap()],
                ];
                return Some(players);
            }
        }
        None
    }

    pub fn add_seeker(
        &self,
        time_ctrl: &TimeControl,
        uid: &UserID,
    ) -> Result<(), Error> {
        let time_id = time_ctrl.get_id();
        {
            let mut seeks = self.seeks.write().unwrap();
            if !seeks.contains_key(&time_id) {
                seeks.insert(time_id.clone(), HashSet::new());
            }
            let users = seeks
                .get_mut(&time_id)
                .ok_or(Error::Unexpected("Couldn't get seeks".to_string()))?;
            users.insert(*uid);
        }
        {
            let mut user_seeks = self.user_seeks.write().unwrap();
            if !user_seeks.contains_key(uid) {
                user_seeks.insert(*uid, HashSet::new());
            }
            let time_ctrls = user_seeks.get_mut(uid).ok_or(
                Error::Unexpected("Couldn't get user seeks".to_string()),
            )?;
            time_ctrls.insert(time_id);
        }
        Ok(())
    }

    pub fn rm_seeker(
        &self,
        time_ctrl: TimeControl,
        uid: UserID,
    ) -> Result<(), Error> {
        let time_id = time_ctrl.get_id();
        {
            let mut user_seek_times = self.user_seeks.write().unwrap();
            let seeks = user_seek_times
                .get_mut(&uid)
                .ok_or(Error::Unexpected("Can't get seeks?".to_string()))?;
            seeks.remove(&time_id);
        }
        {
            let mut seeks = self.seeks.write().unwrap();
            let users = seeks
                .get_mut(&time_id)
                .ok_or(Error::Unexpected("Can't get seeks?".to_string()))?;
            users.remove(&uid);
        }
        Ok(())
    }

    pub fn remove_player_seeks(&self, players: GamePlayers) {
        for board in players.iter() {
            for user in board.iter() {
                let user = user.read().unwrap();
                let uid = user.get_uid();
                let res = self.remove_all_user_seeks(uid);
                if let Err(e) = res {
                    eprintln!("{}: {}", e, uid);
                }
            }
        }
    }

    pub fn remove_all_user_seeks(&self, uid: &UserID) -> Result<(), Error> {
        {
            let user_seek_times = self.user_seeks.read().unwrap();
            let mut seeks = self.seeks.write().unwrap();
            let user_seeks = user_seek_times.get(&uid).ok_or(
                Error::Unexpected("Couldn't get seek times".to_string()),
            )?;
            for time_id in user_seeks {
                match seeks.get_mut(time_id) {
                    Some(users) => {
                        users.remove(&uid);
                    }
                    None => eprintln!("Couldn't get seeks for {}", uid),
                }
            }
        }
        let mut user_seek_times = self.user_seeks.write().unwrap();
        user_seek_times.remove(&uid);
        Ok(())
    }
}
