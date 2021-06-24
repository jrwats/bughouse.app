use thiserror::Error;
use serde_json;

#[derive(Debug, Error)]
pub enum Error {
    /// The FEN string is invalid
    #[error("Invalid Client msg")]
    MalformedClientMsg { msg: String, reason: String },

    #[error("Auth Error: {}", reason)]
    Auth { reason: String },

    #[error("Invalid FEN string: {}", fen)]
    InvalidFen { fen: String },

    #[error("Authentication Error: {}", reason)]
    AuthError{ reason: String },

    #[error("Wrapped Error: {}", msg)]
    WrappedError{ msg: String },

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
