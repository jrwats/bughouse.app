use std::sync::Arc;
use std::collections::HashMap;

use crate::connection_mgr::UserID;
use crate::db::Db;
use crate::error::Error;
use crate::game::{Game, GameID, GamePlayers};
use crate::time_control::TimeControl;

// Ongoing games
pub struct Games {
    db: Arc<Db>,
    games: HashMap<GameID, Game>,
}

impl Games {
    pub fn new(db: Arc<Db>) -> Self {
        Games { db, games: HashMap::new() }
    }

    pub async fn start_game(
        &self,
        time_ctrl: TimeControl,
        players: GamePlayers
        ) -> Result<(), Error> {
        let (id, start) = self.db.create_game(&time_ctrl, &players).await?;
        let game = Game::new(id, time_ctrl, players);

        Ok(())
    }

    pub fn is_in_game(&self, uid: UserID) -> bool {
        self.get_game(uid).is_none()
    }

    pub fn get_game(&self, _uid: UserID) -> Option<Game> {
        // TODO
        None
    }
}
