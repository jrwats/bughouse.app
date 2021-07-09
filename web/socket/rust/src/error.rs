use bughouse::Error as BugError;
use scylla::cql_to_rust::FromRowError;
use scylla::transport::errors::{NewSessionError, QueryError};
use serde_json;
use std::fmt;
use thiserror::Error;
use uuid::Error as UuidError;

use crate::connection_mgr::UserID;

#[derive(Debug)]
pub struct TimeControlParseError {
    payload: String,
}

impl TimeControlParseError {
    pub fn new(payload: &str) -> Self {
        TimeControlParseError {
            payload: payload.to_string(),
        }
    }
}

impl fmt::Display for TimeControlParseError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.payload)
    }
}

#[derive(Debug, Error)]
pub enum Error {
    /// The FEN string is invalid
    #[error("Invalid Client msg")]
    MalformedClientMsg { msg: String, reason: String },

    #[error("Authentication Error: {}", reason)]
    AuthError { reason: String },

    #[error("BugError: {0}")]
    BugError(BugError),

    #[error("InvalidMove User not in game: {0}")]
    InvalidMoveNotPlaying(UserID),

    #[error("InvalidMove InvalidUser: {0}")]
    InvalidMoveUser(UserID),

    #[error("InvalidMove - not player's turn")]
    InvalidMoveTurn,

    #[error("Unknown UID (not in DB): {0}")]
    UnknownUID(UserID),

    #[error("TimeControlParseError: {0}")]
    TimeControlParseError(TimeControlParseError),

    #[error("User is in game already: {0}")]
    InGame(String),

    #[error("Unexpected: {0}")]
    Unexpected(String),

    #[error("JSON Error: {0}")]
    Json(serde_json::Error),

    #[error("I/O Error: {0}")]
    Io(std::io::Error),

    #[error("Firebase err {0}")]
    FirebaseError(String),

    #[error("mpsc::SendError: {0}")]
    SendError(std::sync::mpsc::SendError<String>),

    #[error("NewSessionError: {0}")]
    NewSessionError(NewSessionError),

    #[error("QueryError: {0}")]
    QueryError(QueryError),

    #[error("FromRowError: {0}")]
    FromRowError(FromRowError),

    #[error("UuidError: {0}")]
    UuidError(UuidError),
}

impl From<serde_json::Error> for Error {
    fn from(err: serde_json::Error) -> Self {
        Error::Json(err)
    }
}

impl From<std::io::Error> for Error {
    fn from(err: std::io::Error) -> Self {
        Error::Io(err)
    }
}

impl From<std::sync::mpsc::SendError<String>> for Error {
    fn from(err: std::sync::mpsc::SendError<String>) -> Self {
        Error::SendError(err)
    }
}

impl From<NewSessionError> for Error {
    fn from(err: NewSessionError) -> Self {
        Error::NewSessionError(err)
    }
}

impl From<TimeControlParseError> for Error {
    fn from(err: TimeControlParseError) -> Self {
        Error::TimeControlParseError(err)
    }
}

impl From<QueryError> for Error {
    fn from(err: QueryError) -> Self {
        Error::QueryError(err)
    }
}

impl From<FromRowError> for Error {
    fn from(err: FromRowError) -> Self {
        Error::FromRowError(err)
    }
}

impl From<UuidError> for Error {
    fn from(err: UuidError) -> Self {
        Error::UuidError(err)
    }
}

impl From<BugError> for Error {
    fn from(err: BugError) -> Self {
        Error::BugError(err)
    }
}
// use crate::Error;
// impl AuthError {
//     pub fn new(r: &str) -> Self {
//         AuthError { reason: r.to_string() }
//     }
// }
