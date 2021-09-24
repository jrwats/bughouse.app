use actix::prelude::*;
use std::sync::Arc;

use super::seeks::Seeks;
use crate::error::Error;
use crate::messages::{UserStateKind, UserStateMessage};

pub struct SeekUserHandler {
    seeks: Arc<Seeks>,
}

impl Actor for SeekUserHandler {
    type Context = Context<Self>;
}

impl Handler<UserStateMessage> for SeekUserHandler {
    type Result = Result<(), Error>;

    fn handle(
        &mut self,
        msg: UserStateMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        match msg.kind {
            UserStateKind::Offline(uid) => {
                self.seeks.clean_user(uid);
            }
            UserStateKind::Online(_uid) => {} // no-op
        }
        Ok(())
    }
}

impl SeekUserHandler {
    pub fn new(seeks: Arc<Seeks>) -> Self {
        SeekUserHandler { seeks }
    }
}
