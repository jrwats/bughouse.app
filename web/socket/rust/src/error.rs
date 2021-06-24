use serde_json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    /// The FEN string is invalid
    #[error("Invalid Client msg")]
    MalformedClientMsg { msg: String, reason: String },

    #[error("Auth Error: {}", reason)]
    Auth { reason: String },

    #[error("Authentication Error: {}", reason)]
    AuthError { reason: String },

    #[error("JSON Error: {0}")]
    Json(serde_json::Error),

    #[error("I/O Error: {0}")]
    Io(std::io::Error),
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

// use crate::Error;
// impl AuthError {
//     pub fn new(r: &str) -> Self {
//         AuthError { reason: r.to_string() }
//     }
// }
