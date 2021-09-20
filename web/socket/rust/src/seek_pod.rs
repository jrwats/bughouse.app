// use std::collections::hash_map::DefaultHasher;
// use std::hash::{ Hash, Hasher };
use fplist::{cons, PersistentList};
use std::sync::{Arc, RwLock};

use crate::seek_constraint::SeekConstraint;
use crate::seeks::Seek;

pub type SeekPodID = u64;

pub struct SeekPod {
    // pub id: SeekPodID,
    pub seeks: PersistentList<Arc<Seek>>,
    pub constraint: SeekConstraint,
}

impl SeekPod {
    pub fn new(
        seeks: PersistentList<Arc<Seek>>,
        init_constraint: Option<SeekConstraint>,
    ) -> Self {
        // let mut hasher = DefaultHasher::new();
        // for seek in seeks.iter() {
        //     seek.uid.as_bytes().hash(&mut hasher);
        // }
        let constraint = if init_constraint.is_none() {
            SeekConstraint::merge_all(seeks.iter().map(|s| &s.constraint))
        } else {
            init_constraint.unwrap()
        };
        SeekPod {
            // id: hasher.finish(),
            seeks,
            constraint,
        }
    }

    pub fn passes(&self, s: &Seek) -> bool {
        self.constraint.passes(s.user_rating)
            && self.constraint.merge(&s.constraint).width().unwrap_or(0) > 0
    }

    pub fn form_new_pod(&self, pod: Arc<Seek>) -> Option<SeekPod> {
        if self.is_full() || !self.passes(pod.as_ref()) {
            return None;
        }
        let constraint = Some(self.constraint.merge(&pod.constraint));
        let seeks = cons(pod, self.seeks.clone());
        Some(Self::new(seeks, constraint))
    }

    pub fn is_full(&self) -> bool {
        self.seeks.len() == 4
    }
}
