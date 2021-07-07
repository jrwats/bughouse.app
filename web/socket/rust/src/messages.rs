use crate::connection_mgr::ConnID;
use crate::error::Error;
use actix::{prelude::*, Recipient};

#[derive(Debug)]
pub enum ClientMessageKind {
    Auth(ConnID),
}

/// BughouseSever sends these messages to Socket session
#[derive(Message, Debug)]
#[rtype(result = "()")]
pub struct ClientMessage {
    pub kind: ClientMessageKind,
}

impl ClientMessage {
    pub fn new(kind: ClientMessageKind) -> Self {
        ClientMessage { kind }
    }
}

// pub enum ServerResponse {
//     Auth(ConnID)
// }

pub enum ServerMessageKind {
    Auth(Recipient<ClientMessage>, String),
}

#[derive(Message)]
#[rtype(result = "Result<ClientMessage, Error>")]
pub struct ServerMessage {
    pub kind: ServerMessageKind,
}
impl ServerMessage {
    pub fn new(kind: ServerMessageKind) -> Self {
        ServerMessage { kind }
    }
}

/// Authentication with firebase
// #[rtype(result = "Result<ConnID, Error>")]
#[derive(Message)]
#[rtype(result = "ResponseFuture<Result<String, Error>>")]
pub struct Auth {
    pub token: String,
    // pub addr: Addr<BugWebSock>,
    pub recipient: Recipient<ClientMessage>,
}

/// Session is disconnected
#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
    pub id: ConnID,
}
