use bughouse::{
    BoardID, BughouseBoard, BughouseGame, BughouseMove, Color, Holdings,
};
use chrono::prelude::*;
use chrono::Duration;
use std::sync::{Arc, RwLock};

use crate::connection_mgr::UserID;
use crate::error::Error;
use crate::time_control::TimeControl;
use crate::users::User;

//                      White, Black
pub type BoardPlayers = [Arc<RwLock<User>>; 2];

//                      A,B
pub type GamePlayers = [BoardPlayers; 2];

pub type BoardClocks = [i32; 2];
pub type GameClocks = [BoardClocks; 2];
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
    clocks: GameClocks,
    last_move: [DateTime<Utc>; 2], // Time of last move on either board
}

impl Game {
    pub fn new(
        id: GameID,
        start: DateTime<Utc>,
        time_ctrl: TimeControl,
        players: GamePlayers,
    ) -> Self {
        let base = time_ctrl.get_base_ms();
        Game {
            id,
            start,
            time_ctrl,
            game: BughouseGame::default(),
            players,
            clocks: [[base; 2]; 2],
            last_move: [start; 2],
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

    pub fn get_clocks(&self) -> &GameClocks {
        &self.clocks
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

    fn update_clocks(&mut self, board_id: BoardID, moved_color: Color) {
        let idx = board_id.to_index();
        let now = Utc::now();
        let elapsed = (now - self.last_move[idx]).num_milliseconds() as i32;
        let inc = self.time_ctrl.get_inc_ms() as i32;
        self.last_move[idx] = now;
        self.clocks[idx][moved_color.to_index()] += inc - elapsed;
    }

    pub fn make_move(
        &mut self,
        user_id: UserID,
        mv: &BughouseMove,
    ) -> Result<BoardID, Error> {
        let (board_id, color) = self
            .get_board_id_for_user(user_id)
            .ok_or(Error::InvalidMoveUser(user_id))?;
        if color != self.side_to_move(board_id) {
            return Err(Error::InvalidMoveTurn);
        }
        self.game.make_move(board_id, mv)?;
        self.update_clocks(board_id, color);
        Ok(board_id)
    }
}
