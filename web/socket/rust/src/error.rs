use bughouse::{BoardID, Error as BugError};
use bytestring::ByteString;
use scylla::cql_to_rust::FromRowError;
use scylla::transport::errors::{NewSessionError, QueryError};
use serde_json;
use serde_json::json;
use std::fmt;
use std::sync::Arc;
// use std::option::NoneError;
use thiserror::Error;
use uuid::Error as UuidError;

use crate::connection_mgr::UserID;
use crate::game::GameID;
use crate::messages::{ClientMessage, ClientMessageKind, ServerMessage};

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

    #[error("Invalid: User not in game: {0}, {1}")]
    InvalidUserNotPlaying(UserID, GameID),

    #[error("InvalidMove InvalidUser: {0}")]
    InvalidMoveUser(UserID),

    #[error("Invalid game ID - doesn't exist {0}")]
    InvalidGameID(GameID),

    #[error("InvalidMove wrong gameID: {0}, {1} != {2}")]
    InvalidGameIDForUser(UserID, GameID, GameID),

    #[error("InvalidMove - not player's turn")]
    InvalidMoveTurn,

    #[error("Unknown UID (not in DB): {0}")]
    UnknownUID(UserID),

    #[error("TimeControlParseError: {0}")]
    TimeControlParseError(TimeControlParseError),

    #[error("User {0} is in game already: {1}")]
    InGame(String, String),

    #[error("Unexpected: {0}")]
    Unexpected(String),

    #[error("JSON Error: {0}")]
    Json(serde_json::Error),

    #[error("I/O Error: {0}")]
    Io(std::io::Error),

    #[error("Firebase err {0}")]
    FirebaseError(String),

    #[error("Can't create rated game as guest")]
    CreateRatedGameGuest(),

    #[error("Can't sit guest at rated game: {0}, {1}")]
    SeatGuestAtRatedGame(UserID, GameID),

    #[error("Can't sit - already taken: {0}, {1}, {2}")]
    SeatTaken(GameID, BoardID, usize),

    #[error("Can't vacate vacant seat: {0}, {1}, {2}")]
    SeatEmpty(GameID, BoardID, usize),

    #[error("Can only vacate self: {0}, {1}, {2}")]
    SeatUnowned(GameID, BoardID, usize),

    #[error("mpsc::SendError: {0}")]
    SendError(std::sync::mpsc::SendError<String>),

    #[error("ClientSend: {0}")]
    ClientSend(actix::prelude::SendError<ClientMessage>),

    #[error("ServerSend: {0}")]
    ServerSend(actix::prelude::SendError<ServerMessage>),

    #[error("NewSessionError: {0}")]
    NewSessionError(NewSessionError),

    #[error("QueryError: {0}")]
    QueryError(QueryError),

    #[error("FromRowError: {0}")]
    FromRowError(FromRowError),

    // #[error("NoneError: {0}")]
    // NoneError(NoneError),
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

impl From<actix::prelude::SendError<ClientMessage>> for Error {
    fn from(err: actix::prelude::SendError<ClientMessage>) -> Self {
        Error::ClientSend(err)
    }
}

impl From<actix::prelude::SendError<ServerMessage>> for Error {
    fn from(err: actix::prelude::SendError<ServerMessage>) -> Self {
        Error::ServerSend(err)
    }
}

impl From<BugError> for Error {
    fn from(err: BugError) -> Self {
        Error::BugError(err)
    }
}

impl Error {
    pub fn to_json(&self) -> serde_json::Value {
        match self {
            Error::InGame(_uid, game_id) => {
                json!({
                    "kind": "err",
                    "err": {
                        "kind": "in_game",
                        "game_id": game_id,
                    }
                })
            }
            _ => {
                json!({
                    "kind": "err",
                    "reason": self.to_string(),
                })
            }
        }
    }

    pub fn to_client_msg(&self) -> ClientMessage {
        let bytestr = Arc::new(ByteString::from(self.to_json().to_string()));
        ClientMessage::new(ClientMessageKind::Text(bytestr))
    }
}

// use crate::Error;
// impl AuthError {
//     pub fn new(r: &str) -> Self {
//         AuthError { reason: r.to_string() }
//     }
// }
