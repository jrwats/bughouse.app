use std::fmt;
use crate::error::TimeControlParseError;

pub type TimeID = String;

#[derive(Hash, Debug, PartialEq)]
pub struct TimeControl {
    base: u32, // Base time each player starts with
    inc: u16, // increment in seconds
}

impl TimeControl {
    pub fn new(base: u32, inc: u16) -> Self {
        TimeControl { base, inc }
    }

    pub fn get_base(&self) -> u32 { self.base }

    pub fn get_inc(&self) -> u16 { self.inc }

    pub fn get_id(&self) -> TimeID { format!("{}", self) }
}


impl fmt::Display for TimeControl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}|{}", self.base, self.inc)
    }
}

impl std::str::FromStr for TimeControl {
    type Err = TimeControlParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (base_str, inc_str) = s.split_once('|').ok_or_else(|| TimeControlParseError::new(s))?;
        let base: u32 = base_str.parse::<u32>().or_else(|_e| Err(TimeControlParseError::new(s)))?;
        let inc: u16 = inc_str.parse::<u16>().or_else(|_e| Err(TimeControlParseError::new(s)))?;
        Ok(TimeControl::new(base, inc))
    }
}
