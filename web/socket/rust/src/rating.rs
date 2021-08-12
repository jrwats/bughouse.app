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

#[derive(PartialEq, Eq, Ord, PartialOrd, Copy, Clone, Debug, Hash)]
enum Team {
    A,
    B
}

// q = (ln 10)/800 for bughouse
const Q: f64 = 0.00287823136624255730697807820206435280852019786834716796875;

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
                sum += (other.deviation as f64).powi(2);
            }
            attenuating_factors[i] = (P * sum).sqrt().powi(-1);
        }
        attenuating_factors
    }

    fn get_expecteds(
        flat_snaps: &[UserRatingSnapshot; 4],
        attenuating_factors: &[f64; 4],
        ) -> [f64; 4] {
        // a_rating, b_rating = team ratings (average)
        let a_rating = (flat_snaps[0].rating + flat_snaps[3].rating) as f64 / 2f64;
        let b_rating = (flat_snaps[1].rating + flat_snaps[2].rating) as f64 / 2f64;
        let mut expecteds = [0f64; 4];
        for (i, f) in attenuating_factors.iter().enumerate() {
            let (rating, opp_rating) = if i == 0 || i == 3 {
                (a_rating, b_rating)
            } else {
                (b_rating, a_rating)
            };
            expecteds[i] = 1f64 / (1f64 + 10f64.powf((opp_rating - rating) * f / 400f64));
        }
        expecteds
    }

    fn update_snapshots(
        snaps: &mut [UserRatingSnapshot; 4],
        winners: Team,
        ) -> () {
        let attenuating_factors = Self::get_attenuating_factors(&snaps);
        let expecteds = Self::get_expecteds(&snaps, &attenuating_factors);
        for (i, snap) in snaps.iter_mut().enumerate() {
            let f = attenuating_factors[i];
            let e = expecteds[i];
            let denom = (snap.deviation as f64).powi(-2) + Q.powi(2) + f.powi(2) * e * (1f64 - e);
            let k_factor = Q * f / denom;
            let w = if (i == 0 || i == 3) == (winners == Team::A) { 1f64 } else { 0f64 };
            snap.rating = snap.rating + (k_factor * (w - e)).round() as i16;
            snap.deviation = denom.sqrt().powi(-1).round() as i16;
        }
    }

    /// See ratings.md in top-level docs folder in this repo
    pub fn get_updated_ratings(
        game: Arc<RwLock<Game>>
        ) -> [UserRatingSnapshot; 4] {
        let rgame = game.read().unwrap();
        let result = rgame.get_result().unwrap();
        let winning_team = if (result.board == BoardID::A) == (result.winner == Color::White) {
            Team::A
        } else {
            Team::B
        };
        let [[aw, ab], [bw, bb]] = &rgame.players;
        let flat_players = [aw.clone().unwrap(), ab.clone().unwrap(), bw.clone().unwrap(), bb.clone().unwrap()];
        let mut snaps: [UserRatingSnapshot; 4] = Default::default();
        for (idx, player) in flat_players.iter().enumerate() {
            snaps[idx] = UserRatingSnapshot::from(player.clone());
        }
        Self::update_snapshots(&mut snaps, winning_team);
        snaps
        // ((snaps[0].clone(), snaps[1].clone()), (snaps[2].clone(), snaps[3].clone()))
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
