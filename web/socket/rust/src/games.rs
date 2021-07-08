use std::sync::Arc;
use bughouse::{BoardID, BughouseBoard, BughouseGame, BughouseMove, Color, Error as BugError};

use crate::db::Db;
use crate::game::{Game, GamePlayers};
use crate::error::Error;
use crate::connection_mgr::UserID;


// Ongoing games
pub struct Games {
    db: Arc<Db>,
}

impl Games {
    pub fn new(db: Arc<Db>) -> Self {
        Games {
            db,
        }
    }

    pub fn start_game(&self, players: GamePlayers) -> Result<(), Error> {
        let id = self.db.now()?;
        let game = Game::new(id, players);
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
