use std::sync::Arc;
use bughouse::{BoardID, BughouseBoard, BughouseGame, BughouseMove, Color, Error as BugError};

use crate::db::Db;
use crate::error::Error;
use crate::connection_mgr::UserID;

//                       white   black
pub type BoardPlayers = (UserID, UserID);

pub struct Game {
    game: BughouseGame,
    //        board A       board B
    players: (BoardPlayers, BoardPlayers),
}

impl Game {
    pub fn get_board(&self, board_id: BoardID) -> &BughouseBoard {
        self.game.get_board(board_id)
    }

    pub fn side_to_move(&self, board_id: BoardID) -> Color {
        self.game.get_board(board_id).side_to_move()
    }

    pub fn get_board_id_for_user(
        &self,
        user_id: UserID,
        ) -> Option<BoardID> {
        let ((a_white, a_black), (b_white, b_black)) = self.players;
        if a_white == user_id || a_black == user_id {
            return Some(BoardID::A);
        } else if b_white == user_id || b_black == user_id {
            return Some(BoardID::B);
        }
        None
    }

    fn get_color(
        &mut self,
        board_id: BoardID,
        user_id: UserID,
        ) -> Color {
        let (a, b) = self.players;
        let (white, black) = if board_id == BoardID::A { a } else { b };
        if white == user_id { Color::White } else { Color::Black }
    }

    pub fn make_move(
        &mut self,
        user_id: UserID,
        mv: &BughouseMove,
        ) -> Result<(), Error> {
        let board_id = self.get_board_id_for_user(user_id)
            .ok_or(Error::InvalidMoveUser(user_id))?;
        let color = self.get_color(board_id, user_id);
        let board = self.game.get_board(board_id);
        if color != board.side_to_move() {
            return Err(Error::InvalidMoveTurn);
        }
        self.game.make_move(board_id, mv).map_err(|e| e.into())
    }

}


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

    pub fn is_in_game(&self, uid: UserID) -> bool {
        self.get_game(uid).is_none()
    }

    pub fn get_game(&self, _uid: UserID) -> Option<Game> {
        // TODO
        None
    }
}
