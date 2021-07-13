use actix::prelude::*;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::game::GameID;
use crate::hash::hash;
use crate::messages::ClientMessage;

pub type AnonConnID = u64;
pub type Recipients = HashMap<AnonConnID, Recipient<ClientMessage>>;

pub struct Observers {
    game_to_observers: RwLock<HashMap<GameID, Recipients>>,
    observer_to_games: RwLock<HashMap<AnonConnID, GameID>>,
}

impl Observers {
    pub fn new() -> Self {
        Observers {
            game_to_observers: RwLock::new(HashMap::new()),
            observer_to_games: RwLock::new(HashMap::new()),
        }
    }

    pub fn observe(
        &self,
        game_id: GameID,
        recipient: Recipient<ClientMessage>,
    ) {
        let anon_id = hash(&recipient);
        let mut observing = self.observer_to_games.write().unwrap();
        if let Some(old_game_id) = observing.insert(anon_id, game_id) {
            self.remove_from_game(&anon_id, &old_game_id);
        }
        {
            let mut games = self.game_to_observers.write().unwrap();
            if let Some(r) = games.get_mut(&game_id) {
                r.insert(hash(&recipient), recipient);
            } else {
                let mut new_map = HashMap::new();
                new_map.insert(hash(&recipient), recipient);
                games.insert(game_id, new_map);
            }
        }
    }

    fn remove_from_game(&self, anon_id: &AnonConnID, game_id: &GameID) {
        let mut games = self.game_to_observers.write().unwrap();
        if let Some(recipients) = games.get_mut(game_id) {
            if recipients.remove(anon_id).is_none() {
                eprintln!("Tried removing non-existent anonymous observer");
            }
        }
    }

    pub fn notify(&self, game_id: &GameID, msg: ClientMessage) {
        let observers = self.game_to_observers.read().unwrap();
        if let Some(observers) = observers.get(&game_id) {
            for (_, recipient) in observers.iter() {
                let res = recipient.do_send(msg.clone());
                if let Err(e) = res {
                    eprintln!("Failed sending anon msg: {}", e);
                }
            }
        }
    }

    pub fn remove_recipient(&self, recipient: &Recipient<ClientMessage>) {
        let anon_id = hash(&recipient);
        {
            let observers = self.observer_to_games.read().unwrap();
            if let Some(game_id) = observers.get(&anon_id) {
                self.remove_from_game(&anon_id, &game_id);
            }
        }
        let mut observers = self.observer_to_games.write().unwrap();
        observers.remove(&anon_id);
    }
}
