use bughouse::{BoardID, Color};
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use crate::game::Game;
use crate::users::UserID;

#[derive(PartialEq, Eq, Ord, PartialOrd, Copy, Clone, Debug, Hash)]
pub struct Rating {
    pub rating: i16,
    pub deviation: i16,
}

#[derive(PartialEq, Eq, Ord, PartialOrd, Copy, Clone)]
enum Team {
    A,
    B,
}

// q = (ln 10)/800 for bughouse
const Q: f64 = 0.00287823136624255730697807820206435280852019786834716796875;

//        3 (ln 10)^2
// p =  -------------
//       Pi^2 400^2   .
const P: f64 =
    0.0000025180996504909952245720126950967454604324302636086940765380859375;

// #[cached]
// fn p() -> f64 {
//     3.0f64 * 10.0_f64.ln().powi(2) / consts::PI.powi(2) * 400.0f64.powi(2)
// }

impl Rating {
    pub fn new(rating: i16, deviation: i16) -> Self {
        Rating { rating, deviation }
    }

    // f =  1/Sqrt(1 + p (RD1^2 + RD2^2 + RD3^2))
    fn get_attenuating_factors(flat_snaps: &[UserRating; 4]) -> [f64; 4] {
        let mut attenuating_factors = [0f64; 4];
        for i in 0..flat_snaps.len() {
            let mut sum = 0f64;
            for (j, other) in flat_snaps.iter().enumerate() {
                if j == i {
                    continue;
                }
                sum += (other.rating.deviation as f64).powi(2);
            }
            attenuating_factors[i] = (P * sum + 1f64).sqrt().powi(-1);
        }
        attenuating_factors
    }

    fn get_expecteds(
        flat_ratings: &[UserRating; 4],
        attenuating_factors: &[f64; 4],
    ) -> [f64; 4] {
        // a_rating, b_rating = team ratings (average)
        let a_rating = (flat_ratings[0].rating.rating
            + flat_ratings[3].rating.rating) as f64
            / 2f64;
        let b_rating = (flat_ratings[1].rating.rating
            + flat_ratings[2].rating.rating) as f64
            / 2f64;
        let mut expecteds = [0f64; 4];
        for (i, f) in attenuating_factors.iter().enumerate() {
            let (rating, opp_rating) = if i == 0 || i == 3 {
                (a_rating, b_rating)
            } else {
                (b_rating, a_rating)
            };
            expecteds[i] =
                1f64 / (1f64 + 10f64.powf((opp_rating - rating) * f / 400f64));
        }
        expecteds
    }

    fn update_ratings(ratings: &mut [UserRating; 4], winners: Team) -> () {
        let attenuating_factors = Self::get_attenuating_factors(ratings);
        let expecteds = Self::get_expecteds(ratings, &attenuating_factors);
        for (i, rating) in ratings.iter_mut().enumerate() {
            let f = attenuating_factors[i];
            let e = expecteds[i];
            let denom = (rating.rating.deviation as f64).powi(-2)
                + (Q.powi(2) * f.powi(2) * e * (1f64 - e));
            let k_factor = (Q * f / denom).max(16_f64);
            let w = if (i == 0 || i == 3) == (winners == Team::A) {
                1f64
            } else {
                0f64
            };
            rating.rating.rating += (k_factor * (w - e)).round() as i16;
            rating.rating.deviation = denom.sqrt().powi(-1).round() as i16;
        }
    }
}

#[derive(PartialEq, Eq, Ord, PartialOrd, Clone, Copy, Debug, Hash)]
pub struct UserRating {
    pub uid: UserID,
    pub rating: Rating,
}

impl UserRating {
    pub fn new(uid: UserID, rating: Rating) -> Self {
        UserRating { uid, rating }
    }

    pub fn to_row(&self) -> (i16, i16, UserID) {
        (self.rating.rating, self.rating.deviation, self.uid)
    }

    /// See ratings.md in top-level docs folder in this repo
    pub fn get_updated_ratings(game: Arc<RwLock<Game>>) -> [UserRating; 4] {
        let rgame = game.read().unwrap();
        let result = rgame.get_result().unwrap();
        let winning_team = if (result.board == BoardID::A)
            == (result.winner == Color::White)
        {
            Team::A
        } else {
            Team::B
        };
        let [[aw, ab], [bw, bb]] = &rgame.players;
        let flat_players = [
            aw.clone().unwrap(),
            ab.clone().unwrap(),
            bw.clone().unwrap(),
            bb.clone().unwrap(),
        ];
        let mut user_ratings: [UserRating; 4] = [UserRating::default(); 4];
        for (idx, player) in flat_players.iter().enumerate() {
            let rplayer = player.read().unwrap();
            user_ratings[idx] = UserRating::new(
                *rplayer.get_uid(),
                Rating::new(rplayer.rating, rplayer.deviation),
            );
        }
        Rating::update_ratings(&mut user_ratings, winning_team);
        user_ratings
    }
}

pub const INIT_RATING: i16 = 1500;
pub const INIT_DEVIATION: i16 = 350;

impl Default for Rating {
    fn default() -> Self {
        Rating::new(INIT_RATING, INIT_DEVIATION)
    }
}

impl Default for UserRating {
    fn default() -> Self {
        UserRating::new(Uuid::nil(), Rating::default())
    }
}
