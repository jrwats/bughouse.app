use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};

use crate::error::Error;
use crate::game::GamePlayers;
use crate::seek_constraint::SeekConstraint;
use crate::seek_pod::SeekPod;
use crate::time_control::TimeControl;
use crate::users::{UserID, Users};

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub struct SeekPool {
    pub rated: bool,
    pub time_ctrl: TimeControl,
}

impl SeekPool {
    pub fn new(time_ctrl: TimeControl, rated: bool) -> Self {
        SeekPool { rated, time_ctrl }
    }
}

#[derive(Debug)]
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
    pod_queues: RwLock<HashMap<SeekPool, RwLock<Vec<Arc<SeekPod>>>>>,
    user_seeks: RwLock<HashMap<UserID, (SeekPool, Arc<Seek>)>>,
}

impl Seeks {
    pub fn new(users: Arc<Users>) -> Self {
        Seeks {
            users,
            pod_queues: RwLock::new(HashMap::new()),
            // pools: RwLock::new(HashMap::new()),
            user_seeks: RwLock::new(HashMap::new()),
        }
    }

    fn get_first_pod(
        &self,
        seek_pool: &SeekPool,
    ) -> Option<(usize, Arc<SeekPod>)> {
        let rqueues = self.pod_queues.read().unwrap();
        let queue = rqueues.get(seek_pool);
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

    fn clean_users(&self, seek_pool: &SeekPool, uids: HashSet<UserID>) {
        {
            let mut wuser_seeks = self.user_seeks.write().unwrap();
            for uid in &uids {
                wuser_seeks.remove(uid);
            }
        }
        if let Some(queue) = self.pod_queues.read().unwrap().get(seek_pool) {
            let mut wqueue = queue.write().unwrap();
            wqueue.retain(|pod| {
                !pod.seeks.iter().any(|seek| uids.contains(&seek.uid))
            });
        }
    }

    pub fn clean_user(&self, uid: UserID) {
        if let Some(pool) = self.get_user_pool(&uid) {
            self.clean_users(&pool, std::array::IntoIter::new([uid]).collect());
        }
    }

    // remove all queues associated with the users in the pod
    fn clean_seeks(&self, seek_pool: &SeekPool, pod: Arc<SeekPod>) {
        let uids = pod.seeks.iter().map(|seek| seek.uid);
        self.clean_users(seek_pool, uids.collect());
    }

    pub fn form_game(&self, seek_pool: &SeekPool) -> Option<GamePlayers> {
        let first = self.get_first_pod(seek_pool);
        if first.is_none() {
            return None;
        }
        let (_idx, pod) = first.unwrap();
        // TODO
        // In preparation for game_start, remove user_seeks, and existing references to the
        // Seek/SeekConstraint from other pools
        self.clean_seeks(seek_pool, pod.clone());
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

    pub fn get_user_pool(&self, uid: &UserID) -> Option<SeekPool> {
        let wuser_seeks = self.user_seeks.read().unwrap();
        if let Some((pool, _seek)) = wuser_seeks.get(&uid) {
            Some(pool.clone())
        } else {
            None
        }
    }

    pub fn add_default_seeker(
        &self,
        seek_pool: &SeekPool,
        uid: UserID,
    ) -> Result<(), Error> {
        self.add_seeker(seek_pool, uid, SeekConstraint::default())
    }

    fn ensure_queue(&self, seek_pool: &SeekPool) {
        let mut wqueue = self.pod_queues.write().unwrap();
        if !wqueue.contains_key(seek_pool) {
            wqueue.insert(seek_pool.clone(), RwLock::new(Vec::new()));
        }
    }

    fn add_new_pods(&self, seek_pool: &SeekPool, seek: Arc<Seek>) {
        self.ensure_queue(seek_pool);
        let rqueue = self.pod_queues.read().unwrap();
        let mut wpods = rqueue.get(seek_pool).unwrap().write().unwrap();
        let len = wpods.len();
        for idx in 0..len {
            if let Some(new_pod) = wpods[idx].form_new_pod(seek.clone()) {
                wpods.push(Arc::new(new_pod));
            }
        }
        wpods.push(Arc::new(SeekPod::single(seek)));
    }

    pub fn add_seeker(
        &self,
        seek_pool: &SeekPool,
        uid: UserID,
        constraint: SeekConstraint,
    ) -> Result<(), Error> {
        let user = self.users.get(&uid).ok_or(Error::InvalidUser(uid))?;
        let mut wuser_seeks = self.user_seeks.write().unwrap();
        if wuser_seeks.contains_key(&uid) {
            return Err(Error::AlreadySeeking());
        }

        let ruser = user.read().unwrap();
        let seek = Arc::new(Seek::new(ruser.id, ruser.rating, constraint));
        wuser_seeks.insert(uid, (seek_pool.clone(), seek.clone()));
        self.add_new_pods(seek_pool, seek);
        eprintln!("pods: {:?}", self.pod_queues);
        Ok(())
    }

    pub fn rm_seeker(
        &self,
        seek_pool: &SeekPool,
        uid: UserID,
    ) -> Result<(), Error> {
        self.clean_users(
            &seek_pool,
            std::array::IntoIter::new([uid]).collect(),
        );
        Ok(())
    }
}
