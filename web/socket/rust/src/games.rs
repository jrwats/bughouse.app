use chrono::prelude::*;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::connection_mgr::UserID;
use crate::error::Error;
use crate::game::{Game, GameID, GamePlayers};
use crate::players::Players;
use crate::time_control::TimeControl;
// use crate::db::Db;
// use crate::bughouse_server::BughouseServer;

// Ongoing games
pub struct Games {
    // db: Arc<Db>,
    // server: &'static BughouseServer,
    games: RwLock<HashMap<GameID, Arc<RwLock<Game>>>>,
    user_games: RwLock<HashMap<UserID, GameID>>,
}

impl Games {
    pub fn new(// db: Arc<Db>,
        // server: &'static BughouseServer,
    ) -> Self {
        Games {
            // db,
            // server,
            games: RwLock::new(HashMap::new()),
            user_games: RwLock::new(HashMap::new()),
        }
    }

    pub fn start_game(
        &self,
        id: GameID,
        start: DateTime<Utc>,
        time_ctrl: TimeControl,
        players: GamePlayers,
    ) -> Result<Arc<RwLock<Game>>, Error> {
        // let (id, start) = self.server.insert_game(&time_ctrl, &players).await?;
        let game = Game::new(id, start, time_ctrl, players.clone());
        let locked_game = Arc::new(RwLock::new(game));
        {
            let mut games = self.games.write().unwrap();
            games.insert(id, locked_game.clone());
        }
        {
            let mut user_games = self.user_games.write().unwrap();
            let iplayers = Players::new(&players);
            for player in iplayers.get_players().iter() {
                user_games.insert(player.get_uid(), id);
            }
        }
        Ok(locked_game)
    }

    pub fn rm_game(&self, game_id: GameID) {
        let games = self.games.read().unwrap();
        let res = games.get(&game_id);
        if let Some(game) = res {
            let game = game.read().unwrap();
            let players = Players::new(game.get_players());
            let mut user_games = self.user_games.write().unwrap();
            for player in players.get_players() {
                user_games.remove(&player.get_uid());
            }
            let mut wgames = self.games.write().unwrap();
            wgames.remove(&game_id);
        }
    }

    pub fn is_in_game(&self, uid: &UserID) -> bool {
        self.get_user_game(uid).is_some()
    }

    pub fn get(&self, game_id: &GameID) -> Option<Arc<RwLock<Game>>> {
        let games = self.games.read().unwrap();
        games.get(game_id).map(|a| a.clone())
    }

    pub fn get_user_game(&self, uid: &UserID) -> Option<Arc<RwLock<Game>>> {
        let games = self.user_games.read().unwrap();
        if let Some(game_id) = games.get(uid) {
            return Some(
                self.games.read().unwrap().get(game_id).unwrap().clone(),
            );
        }
        None
    }
}
