use std::sync::Arc;

use bughouse::{BoardID, BughouseBoard, BughouseGame, Color};
use crate::db::Db;
use crate::connection_mgr::UserID;

// Ongoing games
pub struct Games {
    db: Arc<Db>,
}

pub struct Game {
    game: BughouseGame,
}

impl Game {
    pub fn get_board(&self, board_id: BoardID) -> &BughouseBoard {
        self.game.get_board(board_id)
    }

    pub fn side_to_move(&self, board_id: BoardID) -> Color {
        self.game.get_board(board_id).side_to_move()
    }

}

impl Games {
    pub fn new(db: Arc<Db>) -> Self {
        Games {
            db,
        }
    }

    pub fn is_in_game(&self, uid: UserID) -> bool {
        self.get_game(uid).is_none()
    }

    pub fn get_game(&self, _uid: UserID) -> Option<Game> {
        // TODO
        None
    }
}
