// Shared module houses all Firebase-related constants.
// See firebase-go-srv

use crate::error::Error;
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;

pub const FIRE_AUTH: u8 = 1;
pub const FIRE_USER: u8 = 2;
// const FIRE_LOGOUT: u8 = 3;

lazy_static! {
    pub static ref UNIX_SOCK: String =
        std::env::var("SOCK").unwrap_or("/tmp/firebase.sock".to_string());
}

pub struct FirebaseID(pub String);
pub struct ProviderID(pub String);

pub fn authenticate(token: &str) -> Result<(FirebaseID, ProviderID), Error> {
    let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
    write!(stream, "{}\n{}\n", FIRE_AUTH, token)?;
    let mut resp = String::new();
    stream.read_to_string(&mut resp)?;
    let (label, payload) = resp.trim_end().split_once(':').unwrap();
    match label {
        "uid" => {
            let parts: Vec<&str> = payload.split('\x1e').collect();
            if let [fid, provider_id] = parts[..] {
                println!("auth.uid: {}, provider_id: {}", fid, provider_id);
                return Ok((
                    FirebaseID(fid.to_string()),
                    ProviderID(provider_id.to_string()),
                ));
            }
            eprintln!("Couldn't parse response: {}", payload);
            Err(Error::Unexpected("Couldn't parse response".to_string()))
        }
        "err" => {
            return Err(Error::AuthError {
                reason: payload.to_string(),
            });
        }
        _ => {
            let msg = format!("Unknown response: {}", resp);
            return Err(Error::AuthError { reason: msg });
        }
    }
}
