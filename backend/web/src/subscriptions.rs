use actix::prelude::*;
use bytestring::ByteString;
use serde_json;
use std::collections::HashSet;
use std::sync::Arc;

use crate::messages::{ClientMessage, ClientMessageKind};

// Simple wrapper over a set of Recipients to which we
// can send a certain subset of messages
// (public table updates, games in progress updates, etc)
// Handles recipients to whom we can no longer send messages by removing them from consideration
pub struct Subscriptions {
    subs: HashSet<Recipient<ClientMessage>>,
}

impl Subscriptions {
    pub fn new() -> Self {
        Subscriptions {
            subs: HashSet::new(),
        }
    }

    pub fn unsub(&mut self, recipient: Recipient<ClientMessage>) {
        self.subs.remove(&recipient);
    }

    pub fn sub(&mut self, recipient: Recipient<ClientMessage>) {
        self.subs.insert(recipient);
    }

    fn _notify(&self, msg: ClientMessage) -> Vec<Recipient<ClientMessage>> {
        let mut subs_to_remove = Vec::new();
        let rsubs: &HashSet<Recipient<ClientMessage>> = &self.subs;
        for recipient in rsubs.iter() {
            let res = recipient.do_send(msg.clone());
            if let Err(e) = res {
                if let SendError::Closed(_) = e {
                    subs_to_remove.push(recipient.clone());
                } else {
                    eprintln!("Full mailbox for uid: {:?}", recipient);
                }
            }
        }
        subs_to_remove
    }

    pub fn notify_value(&mut self, val: serde_json::Value) {
        let bytestr = Arc::new(ByteString::from(val.to_string()));
        let msg = ClientMessage::new(ClientMessageKind::Text(bytestr));
        self.notify(msg);
    }
    pub fn notify(&mut self, msg: ClientMessage) {
        let to_remove = self._notify(msg);
        // let mut wsubs = self.subs.write().unwrap();
        for recipient in to_remove.iter() {
            self.subs.remove(recipient);
        }
    }
}
