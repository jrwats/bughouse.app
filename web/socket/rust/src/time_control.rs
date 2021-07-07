use std::fmt;

pub type TimeID = String;

#[derive(Hash)]
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
        write!(f, "{}/{}", self.base, self.inc)
    }
}
