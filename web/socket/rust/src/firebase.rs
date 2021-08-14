// Shared module houses all Firebase-related constants.
// See firebase-go-srv

pub const FIRE_AUTH: u8 = 1;
pub const FIRE_USER: u8 = 2;
// const FIRE_LOGOUT: u8 = 3;

lazy_static! {
    pub static ref UNIX_SOCK: String =
        std::env::var("SOCK").unwrap_or("/tmp/firebase.sock".to_string());
}
