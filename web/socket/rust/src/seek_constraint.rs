#[derive(Hash)]
pub struct SeekConstraint {
    pub min_rating: i16,
    pub max_rating: i16,
}

impl SeekConstraint {
    pub fn new(min_rating: Option<i16>, max_rating: Option<i16>) -> Self {
        SeekConstraint {
            min_rating: min_rating.unwrap_or(0),
            max_rating: max_rating.unwrap_or(i16::MAX),
        }
    }

    pub fn passes(&self, rating: i16) -> bool {
        rating >= self.min_rating && rating <= self.max_rating
    }

    pub fn merge(&self, c: &SeekConstraint) -> SeekConstraint {
        SeekConstraint {
            min_rating: std::cmp::max(self.min_rating, c.min_rating),
            max_rating: std::cmp::min(self.max_rating, c.max_rating),
        }
    }

    pub fn merge_all<'a>(
        constraints: impl Iterator<Item = &'a SeekConstraint>,
    ) -> SeekConstraint {
        constraints.fold(SeekConstraint::new(None, None), |agg, c| agg.merge(c))
    }

    pub fn width(&self) -> i16 {
        self.max_rating - self.min_rating
    }
}

impl Default for SeekConstraint {
    fn default() -> Self {
        SeekConstraint::new(None, None)
    }
}
