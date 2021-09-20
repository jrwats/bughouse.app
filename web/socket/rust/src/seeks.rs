use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};

use crate::connection_mgr::UserID;
use crate::error::Error;
use crate::game::{Game, GamePlayers};
use crate::seek_constraint::SeekConstraint;
use crate::seek_pod::{SeekPod, SeekPodID};
use crate::time_control::{TimeControl, TimeID};
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
        Seek {
            uid,
            user_rating,
            constraint,
        }
    }
}

pub struct Seeks {
    users: Arc<Users>,
    pod_queues: RwLock<HashMap<TimeID, RwLock<Vec<Arc<SeekPod>>>>>,
    // pools: RwLock<HashMap<SeekPodID, SeekPod>>,
    // user_seeks: RwLock<HashMap<UserID, Arc<Seek>>>,
}

impl Seeks {
    pub fn new(users: Arc<Users>) -> Self {
        Seeks {
            users,
            pod_queues: RwLock::new(HashMap::new()),
            // pools: RwLock::new(HashMap::new()),
            // user_seeks: RwLock::new(HashMap::new()),
        }
    }

    fn get_first_pod(&self, time_id: &TimeID) -> Option<(usize, Arc<SeekPod>)> {
        let rqueues = self.pod_queues.read().unwrap();
        let queue = rqueues.get(time_id);
        if queue.is_none() {
            // Shouldn't happen, but w/e
            return None;
        }
        let rqueue = queue.unwrap().read().unwrap();
        for (idx, pod) in rqueue.iter().enumerate() {
            if pod.is_full() {
                return Some((idx, pod.clone()));
            }
        }
        None
    }

    // fn rm_user_seek(&self, uid: &UserID) {
    //     let mut wseeks = self.user_seeks.write().unwrap();
    //     if let Some(seek) = wseeks.get(uid) {
    //         // for pool_id in seek.pods {
    //         // }
    //     }
    //     wseeks.remove(uid);
    // }

    fn clean_users(
        &self,
        time_id: &TimeID,
        uids: impl Iterator<Item = UserID>,
    ) {
        if let Some(queue) = self.pod_queues.read().unwrap().get(time_id) {
            let id_set: HashSet<_> = uids.collect();
            let mut wqueue = queue.write().unwrap();
            wqueue.retain(|pod| {
                !pod.seeks.iter().any(|seek| id_set.contains(&seek.uid))
            });
        }
    }

    // remove all queues associated with the users in the pod
    fn clean_seeks(&self, time_id: &String, pod: Arc<SeekPod>) {
        let uids = pod.seeks.iter().map(|seek| seek.uid);
        self.clean_users(time_id, uids);
    }

    pub fn form_game(&self, time_ctrl: &TimeControl) -> Option<GamePlayers> {
        let time_id = time_ctrl.get_id();
        let first = self.get_first_pod(&time_id);
        if first.is_none() {
            return None;
        }
        let (_idx, pod) = first.unwrap();
        // TODO
        // In preparation for game_start, remove user_seeks, and existing references to the
        // Seek/SeekConstraint from other pools
        self.clean_seeks(&time_id, pod.clone());
        let uids = pod.seeks.iter().map(|s| &s.uid);
        let game_players: Vec<&UserID> = uids.collect();
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
        None
    }

    pub fn add_default_seeker(
        &self,
        time_ctrl: &TimeControl,
        uid: &UserID,
    ) -> Result<(), Error> {
        self.add_seeker(time_ctrl, uid, SeekConstraint::default())
    }

    fn ensure_queue(&self, time_id: &String) {
        let mut wqueue = self.pod_queues.write().unwrap();
        if !wqueue.contains_key(time_id) {
            wqueue.insert(time_id.clone(), RwLock::new(Vec::new()));
        }
    }

    fn add_new_pods(&self, time_ctrl: &TimeControl, seek: Arc<Seek>) {
        let time_id = time_ctrl.get_id();
        self.ensure_queue(&time_id);
        let rqueue = self.pod_queues.read().unwrap();
        let mut wpods = rqueue.get(&time_id).unwrap().write().unwrap();
        let len = wpods.len();
        for idx in 0..len {
            if let Some(new_pod) = wpods[idx].form_new_pod(seek.clone()) {
                wpods.push(Arc::new(new_pod));
            }
        }
    }

    pub fn add_seeker(
        &self,
        time_ctrl: &TimeControl,
        uid: &UserID,
        constraint: SeekConstraint,
    ) -> Result<(), Error> {
        let user = self.users.get(uid).ok_or(Error::InvalidUser(*uid))?;
        let ruser = user.read().unwrap();
        let seek = Seek::new(ruser.id, ruser.rating, constraint);
        self.add_new_pods(time_ctrl, Arc::new(seek));
        Ok(())
    }

    pub fn rm_seeker(
        &self,
        time_ctrl: TimeControl,
        uid: UserID,
    ) -> Result<(), Error> {
        let time_id = time_ctrl.get_id();
        self.clean_users(&time_id, std::array::IntoIter::new([uid]));
        Ok(())
    }
}
