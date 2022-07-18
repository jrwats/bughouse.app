use scylla::cql_to_rust::FromCqlVal;
use scylla::macros::{FromRow, FromUserType, IntoUserType};
use serde::Serialize;
use std::fmt;

use crate::error::TimeControlParseError;

pub type TimeID = String;

#[derive(
    Clone, Hash, Debug, Eq, PartialEq, FromRow, FromUserType, IntoUserType,
)]
pub struct TimeControl {
    base: i16, // Base time (in minutes) each player starts with
    inc: i16,  // increment in seconds
}

impl TimeControl {
    pub fn new(base: i16, inc: i16) -> Self {
        TimeControl { base, inc }
    }

    pub fn get_base_ms(&self) -> i32 {
        (self.base as i32) * 60 * 1000
    }

    pub fn get_inc_ms(&self) -> i16 {
        self.inc * 1000
    }

    pub fn get_id(&self) -> TimeID {
        format!("{}", self)
    }
}

impl Serialize for TimeControl {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl fmt::Display for TimeControl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}|{}", self.base, self.inc)
    }
}

impl std::str::FromStr for TimeControl {
    type Err = TimeControlParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (base_str, inc_str) = s
            .split_once('|')
            .ok_or_else(|| TimeControlParseError::new(s))?;
        let base = base_str
            .parse::<i16>()
            .or_else(|_e| Err(TimeControlParseError::new(s)))?;
        let inc = inc_str
            .parse::<i16>()
            .or_else(|_e| Err(TimeControlParseError::new(s)))?;
        Ok(TimeControl::new(base, inc))
    }
}
