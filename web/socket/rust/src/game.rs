use bughouse::{BoardID, BughouseBoard, BughouseGame, BughouseMove, Color, Holdings};
use chrono::prelude::*;
use chrono::Duration;
use serde_json::json;
use serde_json::Value;
use std::sync::{Arc, RwLock};

use crate::b73::B73;
use crate::connection_mgr::UserID;
use crate::error::Error;
use crate::game_json::GameJson;
use crate::users::User;
use crate::time_control::TimeControl;

//                      White, Black
pub type BoardPlayers = [Arc<RwLock<User>>; 2];

//                      A,B
pub type GamePlayers = [BoardPlayers; 2];

// pub type GameUserIDs = [BoardPlayers; 2];

pub type GameID = uuid::Uuid;

const GAME_SECS_IN_FUTURE: i64 = 5;

pub struct Game {
    id: GameID,
    start: DateTime<Utc>,
    game: BughouseGame,
    time_ctrl: TimeControl,
    //        board A       board B
    players: GamePlayers,
}

impl Game {
    pub fn new(
        id: GameID,
        start: DateTime<Utc>,
        time_ctrl: TimeControl,
        players: GamePlayers,
    ) -> Self {
        Game {
            id,
            start,
            time_ctrl,
            game: BughouseGame::default(),
            players,
        }
    }

    pub fn get_start(&self) -> &DateTime<Utc> {
        &self.start
    }

    pub fn get_id(&self) -> &GameID {
        &self.id
    }

    pub fn new_start() -> DateTime<Utc> {
        Utc::now() + Duration::seconds(GAME_SECS_IN_FUTURE)
    }

    pub fn get_players(&self) -> &GamePlayers {
        &self.players
    }

    pub fn get_board(&self, board_id: BoardID) -> &BughouseBoard {
        self.game.get_board(board_id)
    }

    // pub fn get_board_json(
    //     board: &BughouseBoard,
    //     ) -> BoardJson {
    //     BoardJson {
    //         holdings: board.get_holdings().to_string(),
    //         board: BoardFenJson {
    //             fen: board.get_board().to_string(),
    //             white: PlayerJson  {
    //                 handle: "".to_string(),
    //                 clock_ms: 0,
    //             },
    //             black: PlayerJson  {
    //                 handle: "".to_string(),
    //                 clock_ms: 0,
    //             },
    //         }
    //     }
    // }
    //
    // pub fn to_json(&self) -> GameJson {
    //     GameJson {
    //         id: (self.id),
    //         a: Self::get_board_json(self.get_board(BoardID::A)),
    //         b: Self::get_board_json(self.get_board(BoardID::B)),
    //     }
    // }
    //
    pub fn side_to_move(&self, board_id: BoardID) -> Color {
        self.game.get_board(board_id).side_to_move()
    }

    pub fn get_board_id_for_user(
        &self,
        user_id: UserID,
    ) -> Option<(BoardID, Color)> {
        let [[a_white, a_black], [b_white, b_black]] = &self.players;
        if a_white.read().unwrap().get_uid() == user_id {
            return Some((BoardID::A, Color::White));
        } else if a_black.read().unwrap().get_uid() == user_id {
            return Some((BoardID::A, Color::Black));
        } else if b_white.read().unwrap().get_uid() == user_id {
            return Some((BoardID::B, Color::White));
        } else if b_black.read().unwrap().get_uid() == user_id {
            return Some((BoardID::B, Color::Black));
        }
        None
    }

    // fn get_color(&self, board_id: BoardID, user_id: UserID) -> Color {
    //     let [a, b] = self.players;
    //     let [white, _] = if board_id == BoardID::A { a } else { b };
    //     if white == user_id {
    //         Color::White
    //     } else {
    //         Color::Black
    //     }
    // }

    pub fn make_move(
        &mut self,
        user_id: UserID,
        mv: &BughouseMove,
    ) -> Result<BoardID, Error> {
        let (board_id, color) = self
            .get_board_id_for_user(user_id)
            .ok_or(Error::InvalidMoveUser(user_id))?;
        let board = self.game.get_board(board_id);
        if color != board.side_to_move() {
            return Err(Error::InvalidMoveTurn);
        }
        self.game.make_move(board_id, mv)?;
        Ok(board_id)
    }
}
