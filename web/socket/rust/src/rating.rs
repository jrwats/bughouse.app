/// Glicko 
pub struct Rating {
    rating: i16,
    deviation: i16,
}

impl Rating {
    pub fn new(rating: i16, deviation: i16) -> Self { Rating { rating, deviation } }
    pub fn get_rating(&self) -> i16 { self.rating }
    pub fn get_deviation(&self) -> i16 { self.deviation }
}
