use std::collections::hash_map::DefaultHasher;
use std::hash::{ Hash, Hasher };
use std::sync::{Arc, RwLock};
use cons_list::ConsList;

use crate::seeks::Seek;
use crate::seek_constraint::SeekConstraint;

pub type SeekPodID = u64;

pub struct SeekPod {
    pub id: SeekPodID ,
    pub seeks: ConsList<Arc<Seek>>,
    pub constraint: SeekConstraint,
}

impl SeekPod {
    pub fn new(seeks: ConsList<Arc<Seek>>, init_constraint: Option<SeekConstraint>) -> Self {
        let mut hasher = DefaultHasher::new();
        for seek in seeks.iter() {
            seek.uid.as_bytes().hash(&mut hasher);
        }
        let constraint = if init_constraint.is_none() {
            SeekConstraint::merge_all(seeks.iter().map(|s| s.constraint))
        } else {
            init_constraint.unwrap()
        };
        SeekPod { id: hasher.finish(), seeks, constraint }
    }

    pub fn passes(&self, c: &Seek) -> bool {
        self.constraint.passes(c.user_rating) && 
            self.constraint.merge(c.constraint).width().unwrap_or(0) > 0
    }

    pub fn add_and_clone(&self, c: Arc<Seek>) -> Option<SeekPod> {
        if self.is_full() || !self.passes(c.as_ref()) {
            return None
        }

        let constraint = Some(self.constraint.merge(c.constraint));
        Some(Self::new(self.seeks.append(c), constraint))
    }

    pub fn is_full(&self) -> bool {
        self.seeks.len() == 4
    }
       
}
