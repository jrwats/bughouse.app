use bughouse::{BoardID, Color};
use std::sync::{Arc, RwLock};
use std::f64::consts;

use crate::db::{TableSnapshot, UserRatingSnapshot};
use crate::error::Error;
use crate::game::{Game, GamePlayers, BoardPlayers};

/// Glicko
pub struct Rating {
    rating: i16,
    deviation: i16,
}

//        3 (ln 10)^2
// p =  -------------
//       Pi^2 400^2   .
const P: f64 = 0.00001007239860196398089828805078038698184172972105443477630615234375;

// #[cached]
// fn p() -> f64 {
//     3.0f64 * 10.0_f64.ln().powi(2) / consts::PI.powi(2) * 400.0f64.powi(2)
// }

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


    // f =  1/Sqrt(1 + p (RD1^2 + RD2^2 + RD3^2))
    fn get_attenuating_factors(
        flat_snaps: &[UserRatingSnapshot; 4],
        ) -> [f64; 4] {
        let mut attenuating_factors = [0f64; 4];
        for i in 0..flat_snaps.len() {
            let mut sum = 0f64;
            for (j, other) in flat_snaps.iter().enumerate() {
                if j == i {
                    continue;
                }
                sum += other.deviation.pow(2) as f64;
            }
            attenuating_factors[i] = (P * sum).sqrt().powi(-1);
        }
        attenuating_factors
    }

    fn get_new_ratings(
        players: &GamePlayers,
        ) -> TableSnapshot {
        let [[aw, ab], [bw, bb]] = players;
        let flat_players = [aw.unwrap(), ab.unwrap(), bw.unwrap(), bb.unwrap()];
        let nil = UserRatingSnapshot::nil();
        let mut snaps: [UserRatingSnapshot; 4] = [nil.clone(), nil.clone(), nil.clone(), nil.clone()];
        for (idx, player) in flat_players.iter().enumerate() {
            snaps[idx] = UserRatingSnapshot::from(player.clone());
        }
        let attenuating_factors = Self::get_attenuating_factors(&snaps);

        let nil = UserRatingSnapshot::nil();
        ((nil.clone(), nil.clone()), (nil.clone(), nil))
    }

    /// See ratings.md in top-level docs folder in this repo
    pub fn get_updated_ratings(
        game: Arc<RwLock<Game>>
        ) -> TableSnapshot {
        let rgame = game.read().unwrap();
        let users = &rgame.players;
        let result = rgame.get_result().unwrap();
        let team = if result.board == BoardID::A {
            if result.winner == Color::White { 0 } else { 1 }
        } else {
            if result.winner == Color::Black { 0 } else { 1 }
        }
        Self::get_new_ratings(users)
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
