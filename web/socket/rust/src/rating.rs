use std::sync::{Arc, RwLock};

use crate::db::{TableSnapshot, UserRatingSnapshot};
use crate::error::Error;
use crate::game::Game;

/// Glicko
pub struct Rating {
    rating: i16,
    deviation: i16,
}

impl Rating {
    pub fn new(rating: i16, deviation: i16) -> Self {
        Rating { rating, deviation }
    }
    pub fn get_rating(&self) -> i16 {
        self.rating
    }
    pub fn get_deviation(&self) -> i16 {
        self.deviation
    }

    /// See ratings.md in top-level docs folder in this repo
    pub fn get_updated_ratings(
        game: Arc<RwLock<Game>>
        ) -> Result<TableSnapshot, Error> {
        let nil = UserRatingSnapshot::nil();
        Ok(((nil.clone(), nil.clone()), (nil.clone(), nil)))
    }
}

pub const INIT_RATING: i16 = 1500;
pub const INIT_DEVIATION: i16 = 350;

impl Default for Rating {
    #[inline]
    fn default() -> Self {
        Rating::new(INIT_RATING, INIT_DEVIATION)
    }
}
