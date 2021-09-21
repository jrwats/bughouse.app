// use std::collections::hash_map::DefaultHasher;
// use std::hash::{ Hash, Hasher };
use fplist::{cons, PersistentList};
use std::sync::Arc;

use crate::seek_constraint::SeekConstraint;
use crate::seeks::Seek;

pub type SeekPodID = u64;

#[derive(Debug)]
pub struct SeekPod {
    // pub id: SeekPodID,
    pub seeks: PersistentList<Arc<Seek>>,
    pub constraint: SeekConstraint,
}

impl SeekPod {
    pub fn new(
        seeks: PersistentList<Arc<Seek>>,
        constraint: SeekConstraint,
    ) -> Self {
        SeekPod { seeks, constraint }
    }

    pub fn single(seek: Arc<Seek>) -> Self {
        SeekPod::new(
            cons(seek.clone(), PersistentList::new()),
            seek.constraint.clone(),
        )
    }

    pub fn passes(&self, s: &Seek) -> bool {
        self.constraint.passes(s.user_rating)
            && self.constraint.merge(&s.constraint).width() > 0
    }

    pub fn form_new_pod(&self, pod: Arc<Seek>) -> Option<SeekPod> {
        if self.is_full() || !self.passes(pod.as_ref()) {
            return None;
        }
        let constraint = self.constraint.merge(&pod.constraint);
        let seeks = cons(pod, self.seeks.clone());
        Some(Self::new(seeks, constraint))
    }

    pub fn is_full(&self) -> bool {
        self.seeks.len() == 4
    }
}
