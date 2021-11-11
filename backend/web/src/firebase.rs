// Shared module houses all Firebase-related constants.
// See firebase-go-srv

use crate::db::Db;
use crate::error::Error;
use std::io::prelude::{Read, Write};
use std::net::Shutdown;
use std::os::unix::net::UnixStream;
use std::sync::Arc;

pub const FIRE_AUTH: u8 = 1;
pub const FIRE_USER: u8 = 2;
// const FIRE_LOGOUT: u8 = 3;

const DEFAULT_SOCK: &str = "/var/run/firebase/firebase.sock";

lazy_static! {
    pub static ref UNIX_SOCK: String =
        std::env::var("SOCK").unwrap_or(DEFAULT_SOCK.to_string());
}

pub struct FirebaseID(pub String);
pub struct ProviderID(pub String);

pub async fn authenticate(token: &str, db: Arc<Db>) -> Result<(FirebaseID, ProviderID), Error> {
    eprintln!("authenticate...");
    if token.starts_with(".fake") {
        let res = db.get_user_from_fid(token).await;
        if res.is_err() {
            let reason = format!("{} not found", token);
            eprintln!("auth error: {}", reason);
            return Err(Error::AuthError { reason });
        }
        let user = res.unwrap();
        return Ok((FirebaseID(user.firebase_id), ProviderID("fake".into())));
    }
    let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
    write!(stream, "{}\n{}\n", FIRE_AUTH, token)?;
    stream.flush()?;
    let mut resp = String::new();
    stream.read_to_string(&mut resp)?;
    let (label, payload) = resp.trim_end().split_once(':').unwrap();
    stream.shutdown(Shutdown::Read).ok();
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
            eprintln!("err: {}", payload.to_string());
            return Err(Error::AuthError {
                reason: payload.to_string(),
            });
        }
        _ => {
            let msg = format!("Unknown response: {}", resp);
            eprintln!("err: {}", msg);
            return Err(Error::AuthError { reason: msg });
        }
    }
}
