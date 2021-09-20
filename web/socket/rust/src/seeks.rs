use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};

use crate::connection_mgr::UserID;
use crate::error::Error;
use crate::game::{Game, GamePlayers};
use crate::time_control::{TimeControl, TimeID};
use crate::seek_pod::{SeekPod, SeekPodID};
use crate::seek_constraint::SeekConstraint;
use crate::users::Users;

pub struct Seek {
    pub uid: UserID,
    pub user_rating: i16,
    pub constraint: SeekConstraint,
    // pools: HashSet<SeekPodID>,
}

impl Seek {
    pub fn new(
        uid: UserID,
        user_rating: i16,
        constraint: SeekConstraint,
        ) -> Self {
        Seek { uid, user_rating, constraint }
    }
}

pub struct Seeks {
    users: Arc<Users>,
    pod_queue: RwLock<HashMap<TimeID, Vec<SeekPod>>>,
    pools: RwLock<HashMap<SeekPodID, SeekPod>>,
    user_seeks: RwLock<HashMap<UserID, Arc<Seek>>>,
}

impl Seeks {
    pub fn new(users: Arc<Users>) -> Self {
        Seeks {
            users,
            pod_queue: RwLock::new(HashMap::new()),
            pools: RwLock::new(HashMap::new()),
            user_seeks: RwLock::new(HashMap::new()),
        }
    }

    fn get_first_pod(pools: &Vec<SeekPod>) -> Option<(usize, &SeekPod)> {
        for (idx, p) in pools.iter().enumerate() {
            if p.is_full() {
                return Some((idx, p));
            }
        }
        None
    }

    fn rm_user_seek(&self, uid: &UserID) {
        let wseeks = self.user_seeks.write().unwrap();
        if let Some(seek) = wseeks.get(uid) {
            // for pool_id in seek.pods {
            // }
        }
        wseeks.remove(uid);
    }

    // remove all queues associated with the users in the pod
    fn clean_seeks(&self, time_id: &String, pod: &SeekPod) {
        let ids = HashSet::new(pod.seeks.iter().map(|seek| seek.uid));
        let rqueue = self.pod_queue.read().unwrap();
        let new_queue = rqueue.get(time_id).unwrap().iter().filter(|pod| {
            pod.seeks.iter().any(|seek| seek.uid
        })
        for seek in pod.seeks.iter() {
            self.rm_user_seek(&seek.uid);
        }
    }

    pub fn form_game(&self, time_ctrl: &TimeControl) -> Option<GamePlayers> {
        let mut pod_queue = self.pod_queue.write().unwrap();
        let time_id = time_ctrl.get_id();
        if let Some(pods) = pod_queue.get_mut(&time_id) {
            let first = Self::get_first_pod(pods);
            if first.is_none() {
                return None;
            }
            let (idx, pod) = first.unwrap();
            // TODO
            // In preparation for game_start, remove user_seeks, and existingn references to the
            // Seek/SeekConstraint from other pools
            self.clean_seeks(time_id, pod);
            let uids = pod.seeks.iter().map(|s| { s.uid });
            let game_players: Vec<&UserID> = uids;
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
                    [Some(awp.unwrap()), Some(abp.unwrap())],
                    [Some(bwp.unwrap()), Some(bbp.unwrap())],
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
        // {
        //     let mut seeks = self.seeks.write().unwrap();
        //     if !seeks.contains_key(&time_id) {
        //         seeks.insert(time_id.clone(), HashSet::new());
        //     }
        //     let users = seeks
        //         .get_mut(&time_id)
        //         .ok_or(Error::Unexpected("Couldn't get seeks".to_string()))?;
        //     users.insert(*uid);
        // }
        // {
        //     let mut user_seeks = self.user_seeks.write().unwrap();
        //     if !user_seeks.contains_key(uid) {
        //         user_seeks.insert(*uid, HashSet::new());
        //     }
        //     let time_ctrls = user_seeks.get_mut(uid).ok_or(
        //         Error::Unexpected("Couldn't get user seeks".to_string()),
        //     )?;
        //     time_ctrls.insert(time_id);
        // }
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
            for maybe_user in board.iter() {
                let uid = Game::uid(maybe_user);
                let res = self.remove_all_user_seeks(&uid);
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
