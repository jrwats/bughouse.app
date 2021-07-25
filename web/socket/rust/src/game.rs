use bughouse::{
    ALL_COLORS, BOARD_IDS, BoardID, BughouseBoard, BughouseGame, BughouseMove, Color, Holdings,
};
use chrono::prelude::*;
use chrono::Duration;
use std::sync::{Arc, RwLock};
use serde::ser::{Serialize, Serializer, SerializeStruct};

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

#[derive(Clone, Copy, Debug)]
pub struct GameResult {
    pub board: BoardID,
    pub winner: Color,
    pub kind: GameResultType,
}

#[derive(Clone, Copy, Debug)]
pub enum GameResultType {
    Flagged,
    Checkmate,
}

pub enum GameStatus {
    Over(GameResult),
    InProgress,
    Starting,
    WaitingForPlayers,
}

impl Serialize for GameResult {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where S: serde::Serializer {
            let mut state = serializer.serialize_struct("GameResultType", 3)?;
            state.serialize_field("board", &(self.board as u8))?;
            state.serialize_field("winner", &(self.winner as u8))?;
            state.serialize_field("kind", &(self.kind as u8))?;
            state.end()
        }
}


pub type GameID = uuid::Uuid;

const GAME_SECS_IN_FUTURE: i64 = 5;

pub struct Game {
    id: GameID,
    start: DateTime<Utc>,
    game: BughouseGame,
    time_ctrl: TimeControl,
    players: GamePlayers,
    clocks: GameClocks,
    result: Option<GameResult>,
    status: GameStatus,
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
            result: None,
            status: GameStatus::Starting,
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

    pub fn side_to_move(&self, board_id: BoardID) -> Color {
        self.game.get_board(board_id).side_to_move()
    }

    pub fn get_board_id_for_user(
        &self,
        user_id: &UserID,
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

    pub fn get_min_to_move_clock_ms(&self) -> i32 {
        let a_color = self.side_to_move(BoardID::A).to_index();
        let b_color = self.side_to_move(BoardID::B).to_index();
        std::cmp::min(self.clocks[0][a_color], self.clocks[1][b_color])
    }

    pub fn update_all_clocks(&mut self) {
        for board_id in [BoardID::A, BoardID::B].iter() {
            self.update_clocks(*board_id, self.side_to_move(*board_id));
        }
    }

    fn update_clocks(&mut self, board_id: BoardID, moved_color: Color) {
        let idx = board_id.to_index();
        let now = Utc::now();
        if now < self.start {
            return;
        }
        let elapsed = (now - self.last_move[idx]).num_milliseconds() as i32;
        let inc = self.time_ctrl.get_inc_ms() as i32;
        self.last_move[idx] = now;
        self.clocks[idx][moved_color.to_index()] += inc - elapsed;
    }

    pub fn check_for_mate(&mut self) -> bool {
        if self.result.is_some() {
            return true
        }

        // Double check for checkmated boards
        for board_id in [BoardID::A, BoardID::B].iter() {
            let board = self.game.get_board(*board_id);
            if board.is_mated() {
                self.result = Some(GameResult {
                    board: *board_id,
                    winner: !board.side_to_move(), // winner
                    kind: GameResultType::Checkmate,
                });
                return true;
            }
        }
        false
    }

    pub fn end_game(&mut self) {
        println!("game.end_game()");
        if self.check_for_mate() {
            return;
        }
        self.update_all_clocks();
        let mut flaggee = (std::i32::MAX, BoardID::A, Color::White);
        for (bidx, boards) in self.clocks.iter().enumerate() {
            for (cidx, clock) in boards.iter().enumerate() {
                if *clock < flaggee.0 {
                    flaggee = (*clock, BOARD_IDS[bidx], ALL_COLORS[cidx]);
                }
            }
        }
        println!("flaggee: {:?}", flaggee);
        self.result = Some(GameResult {
            board: flaggee.1,
            winner: !flaggee.2,
            kind: GameResultType::Flagged,
        });
        println!("self.result: {:?}", self.result);
    }

    pub fn get_status(&self) -> Option<GameStatus> {
        self.status
    }

    pub fn get_result(&self) -> Option<GameResult> {
        self.result
    }

    pub fn make_move(
        &mut self,
        user_id: &UserID,
        mv: &BughouseMove,
    ) -> Result<BoardID, Error> {
        if Utc::now() < self.start {
            return Err(Error::InvalidMoveTurn);
        }
        let (board_id, color) = self
            .get_board_id_for_user(user_id)
            .ok_or(Error::InvalidMoveUser(*user_id))?;
        if color != self.side_to_move(board_id) {
            return Err(Error::InvalidMoveTurn);
        }
        self.game.make_move(board_id, mv)?;
        self.check_for_mate();
        self.update_clocks(board_id, color);
        Ok(board_id)
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn uuid_ref_eq_sanity() {
        let uid_nil_1 = uuid::Uuid::nil();
        let uid_nil_2 = uuid::Uuid::nil();
        assert!(&uid_nil_1 == &uid_nil_2);
    }
}
