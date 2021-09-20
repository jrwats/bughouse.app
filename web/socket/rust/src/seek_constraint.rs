
#[derive(Hash)]
pub struct SeekConstraint {
    pub min_rating: Option<i16>,
    pub max_rating: Option<i16>,
}

impl SeekConstraint {
    pub fn new(min_rating: Option<i16>, max_rating: Option<i16>) -> Self {
        SeekConstraint { min_rating, max_rating }
    }

    pub fn passes(&self, rating: i16) -> bool {
        rating >= self.min_rating.unwrap_or(0) && 
            rating <= self.max_rating.unwrap_or(i16::MAX)
    }

    pub fn merge(&self, c: SeekConstraint) -> SeekConstraint {
        SeekConstraint::new(
            std::cmp::max(self.min_rating, c.min_rating),
            std::cmp::min(self.max_rating, c.max_rating),
            )
    }

    pub fn merge_all(constraints: impl Iterator<Item = SeekConstraint>) -> SeekConstraint {
        constraints.reduce(|a,b| a.merge(b))
            .unwrap_or(SeekConstraint::new(None, None))
    }

    // pub fn merge_all(constraints: Vec<SeekConstraint>) -> SeekConstraint {
    //     constraints
    //         .into_iter()
    //         .reduce(|a,b| a.merge(b))
    //         .unwrap_or(SeekConstraint::new(None, None))
    // }

    pub fn width(&self) -> Option<i16> {
        if self.max_rating.is_none() {
            return None;
        }
        return Some(self.max_rating.unwrap() - self.min_rating.or(Some(0)).unwrap());
    }

}
