use bughouse::{BoardID, BughouseBoard, BughouseGame, BughouseMove, Color};

use crate::error::Error;
use crate::time_control::TimeControl;
use crate::connection_mgr::UserID;

//                      White, Black
pub type BoardPlayers = [UserID; 2];

//                      A,B
pub type GamePlayers = [BoardPlayers; 2];

pub type GameID = uuid::Uuid;

pub struct Game {
    id: GameID,
    game: BughouseGame,
    time_ctrl: TimeControl,
    //        board A       board B
    players: GamePlayers,
}

impl Game {
    pub fn new(
        id: GameID,
        time_ctrl: TimeControl,
        players: GamePlayers
        ) -> Self {
        Game { id, time_ctrl, game: BughouseGame::default(), players }
    }

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
        let [[a_white, a_black], [b_white, b_black]] = self.players;
        if a_white == user_id || a_black == user_id {
            Some(BoardID::A)
        } else if b_white == user_id || b_black == user_id {
            Some(BoardID::B)
        } else {
            None
        }
    }

    fn get_color(
        &mut self,
        board_id: BoardID,
        user_id: UserID,
        ) -> Color {
        let [a, b] = self.players;
        let [white, black] = if board_id == BoardID::A { a } else { b };
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
