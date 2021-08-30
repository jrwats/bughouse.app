use actix::{prelude::*, Recipient};
use bughouse::{BoardID, BughouseMove, Color};
use bytestring::ByteString;
use chrono::Duration;
use std::sync::Arc;

use crate::connection_mgr::{ConnID, UserID};
use crate::error::Error;
use crate::game::{GameID, GamePlayers};
use crate::time_control::TimeControl;

// server => client => browser messages - i.e. client-side pushes
#[derive(Debug, Clone)]
pub enum ClientMessageKind {
    Auth(ConnID),
    // GameStart(GameID),
    Text(Arc<ByteString>),
    Empty,
}

/// BughouseSever sends these messages to Socket session
#[derive(Message, Debug, Clone)]
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
    CheckGame(GameID),
    CreateGame(TimeControl, bool, GamePlayers),
    FormTable(TimeControl, bool, bool, UserID),
    GetGameRow(GameID, Recipient<ClientMessage>),
    RecordMove(Duration, GameID, BoardID, BughouseMove),
    SetHandle(String, UserID),
    Sit(GameID, BoardID, Color, UserID),
    Vacate(GameID, BoardID, Color, Recipient<ClientMessage>),
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

#[derive(Clone)]
pub enum UserStateKind {
    Offline(UserID),
    Online(UserID),
}

#[derive(Message, Clone)]
#[rtype(result = "Result<(), Error>")]
pub struct UserStateMessage {
    pub kind: UserStateKind,
}

impl UserStateMessage {
    pub fn new(kind: UserStateKind) -> Self {
        UserStateMessage { kind }
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
