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
}

const INIT_RATING: i16 = 1500;
const INIT_DEVIATION: i16 = 350;

impl Default for Rating {
    #[inline]
    fn default() -> Self {
        Rating::new(INIT_RATING, INIT_DEVIATION)
    }
}
