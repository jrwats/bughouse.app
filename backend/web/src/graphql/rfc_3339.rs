use async_graphql::connection::CursorType;
use chrono::prelude::*;
use chrono::ParseError;

pub struct Rfc3339(pub DateTime<Utc>);

impl CursorType for Rfc3339 {
    type Error = ParseError;

    fn decode_cursor(s: &str) -> Result<Self, Self::Error> {
        let date = DateTime::parse_from_rfc3339(s)?;
        Ok(Self(date.with_timezone(&Utc)))
    }

    fn encode_cursor(&self) -> String {
        self.0.to_rfc3339()
    }
}
