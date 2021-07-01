use crate::bughouse_server::{BughouseServer, ConnID};
use crate::bug_web_sock::BugWebSock;
use crate::error::Error;
use actix::{prelude::*, Recipient};

/// BughouseSever sends these messages to Socket session
#[derive(Message)]
#[rtype(result = "()")]
pub struct WsMessage(pub String);


/// Authentication with firebase
#[derive(Message)]
#[rtype(result = "Result<ConnID, Error>")]
pub struct Auth {
  pub token: String,
  pub addr: Addr<BugWebSock>,
}

/// Session is disconnected
#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
  pub id: ConnID,
}


