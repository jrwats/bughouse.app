use bughouse::{
    BoardID, BughouseBoard, BughouseGame, BughouseMove, Color, ALL_COLORS,
    BOARD_IDS,
};
use chrono::prelude::*;
use chrono::Duration;
use serde::ser::{Serialize, SerializeStruct};
use std::sync::{Arc, RwLock};

use crate::db::{TableSnapshot, UserRatingSnapshot};
use crate::error::Error;
use crate::time_control::TimeControl;
use crate::users::User;
use crate::users::UserID;

//                      White, Black
pub type BoardPlayers = [Option<Arc<RwLock<User>>>; 2];

//                      A,B
pub type GamePlayers = [BoardPlayers; 2];

pub type BoardClocks = [i32; 2];
pub type GameClocks = [BoardClocks; 2];

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GameResult {
    pub board: BoardID,
    pub winner: Color,
    pub kind: GameResultType,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum GameResultType {
    Flagged,
    Checkmate,
}

#[derive(PartialEq)]
pub enum GameStatus {
    Over(GameResult),
    InProgress,
    Starting,
    WaitingForPlayers,
}

impl Serialize for GameResult {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("GameResultType", 3)?;
        state.serialize_field("board", &(self.board as u8))?;
        state.serialize_field("winner", &(self.winner as u8))?;
        state.serialize_field("kind", &(self.kind as u8))?;
        state.end()
    }
}

pub type GameID = uuid::Uuid;

const GAME_MS_IN_FUTURE: i64 = 5500; // 5.5s from now

pub struct Game {
    id: GameID,
    start: Option<DateTime<Utc>>,
    game: BughouseGame,
    pub time_ctrl: TimeControl,
    pub players: GamePlayers,
    clocks: GameClocks,
    pub rated: bool,
    pub public: bool,
    result: Option<GameResult>,
    last_move_time: [DateTime<Utc>; 2], // Time of last move on either board
    pub last_moves: [Option<BughouseMove>; 2], // Time of last move on either board
}

impl Game {
    pub fn start_new(
        id: GameID,
        start: DateTime<Utc>,
        time_ctrl: TimeControl,
        rated: bool,
        players: GamePlayers,
    ) -> Self {
        let base = time_ctrl.get_base_ms();
        Game {
            id,
            start: Some(start),
            time_ctrl,
            game: BughouseGame::default(),
            players,
            clocks: [[base; 2]; 2],
            last_move_time: [start; 2],
            last_moves: [None; 2],
            rated,
            public: false,
            result: None,
        }
    }

    // Form a "table" still waiting for players
    pub fn table(
        id: GameID,
        time_ctrl: TimeControl,
        rated: bool,
        public: bool,
        user: Arc<RwLock<User>>,
    ) -> Self {
        let base = time_ctrl.get_base_ms();
        let nil_date = Utc::now();
        Game {
            id,
            start: None,
            time_ctrl,
            game: BughouseGame::default(),
            players: [[Some(user), None], [None, None]],
            clocks: [[base; 2]; 2],
            last_move_time: [nil_date; 2],
            last_moves: [None; 2],
            rated,
            public,
            result: None,
        }
    }

    pub fn get_user_seat(&self, uid: &UserID) -> Option<(usize, usize)> {
        for (board, players) in self.players.iter().enumerate() {
            for (color, maybe_player) in players.iter().enumerate() {
                if let Some(player) = maybe_player {
                    if player.read().unwrap().id == *uid {
                        return Some((board, color));
                    }
                }
            }
        }
        None
    }

    pub fn get_rating_snapshots(players: &GamePlayers) -> TableSnapshot {
        let [[aw, ab], [bw, bb]] = players;
        let (aws, abs, bws, bbs) = (
            UserRatingSnapshot::from(aw.clone()),
            UserRatingSnapshot::from(ab.clone()),
            UserRatingSnapshot::from(bw.clone()),
            UserRatingSnapshot::from(bb.clone()),
        );
        ((aws, abs), (bws, bbs))
    }

    pub fn handle(maybe_user: &Option<Arc<RwLock<User>>>) -> Option<String> {
        if let Some(user_lock) = maybe_user {
            let user = user_lock.read().unwrap();
            Some(user.handle.clone())
        } else {
            None
        }
    }

    pub fn uid(maybe_user: &Option<Arc<RwLock<User>>>) -> UserID {
        if let Some(user) = maybe_user {
            *user.read().unwrap().get_uid()
        } else {
            uuid::Uuid::nil()
        }
    }

    pub fn get_start(&self) -> Option<DateTime<Utc>> {
        self.start
    }

    pub fn start(&mut self) -> DateTime<Utc> {
        let start = Self::new_start();
        self.start = Some(start);
        self.last_move_time = [start; 2];
        start
    }

    pub fn get_id(&self) -> &GameID {
        &self.id
    }

    pub fn new_start() -> DateTime<Utc> {
        Utc::now() + Duration::milliseconds(GAME_MS_IN_FUTURE)
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

    pub fn get_last_move(&self, board_id: BoardID) -> Option<BughouseMove> {
        self.last_moves[board_id.to_index()]
    }

    pub fn side_to_move(&self, board_id: BoardID) -> Color {
        self.game.get_board(board_id).side_to_move()
    }

    pub fn get_board_id_for_user(
        &self,
        user_id: &UserID,
    ) -> Option<(BoardID, Color)> {
        let [[a_white, a_black], [b_white, b_black]] = &self.players;
        if Game::uid(a_white) == *user_id {
            return Some((BoardID::A, Color::White));
        } else if Game::uid(a_black) == *user_id {
            return Some((BoardID::A, Color::Black));
        } else if Game::uid(b_white) == *user_id {
            return Some((BoardID::B, Color::White));
        } else if Game::uid(b_black) == *user_id {
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

    pub fn get_partner(&self, uid: &UserID) -> Option<UserID> {
        if let Some((board_id, color)) = self.get_board_id_for_user(uid) {
            let maybe_player =
                &self.players[1 - board_id.to_index()][1 - color.to_index()];
            if let Some(player) = maybe_player {
                return Some(player.read().unwrap().id);
            }
        }
        None
    }

    fn update_clocks(&mut self, board_id: BoardID, moved_color: Color) {
        let idx = board_id.to_index();
        let now = Utc::now();
        if self.start.is_none() || now < self.start.unwrap() {
            return;
        }
        let elapsed =
            (now - self.last_move_time[idx]).num_milliseconds() as i32;
        let inc = self.time_ctrl.get_inc_ms() as i32;
        self.last_move_time[idx] = now;
        self.clocks[idx][moved_color.to_index()] += inc - elapsed;
    }

    pub fn check_for_mate(&mut self) -> bool {
        if self.result.is_some() {
            return true;
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

    pub fn has_empty_seat(&self) -> bool {
        let [[aw, ab], [bw, bb]] = &self.players;
        aw.is_none() || ab.is_none() || bw.is_none() || bb.is_none()
    }

    pub fn is_public_table(&self) -> bool {
        self.public && self.get_status() == GameStatus::WaitingForPlayers
    }

    pub fn get_status(&self) -> GameStatus {
        if let Some(result) = self.result {
            GameStatus::Over(result)
        } else if self.start.is_some() && self.start.unwrap() > Utc::now() {
            GameStatus::Starting
        } else if self.has_empty_seat() {
            GameStatus::WaitingForPlayers
        } else {
            GameStatus::InProgress
        }
    }

    pub fn get_result(&self) -> Option<GameResult> {
        self.result
    }

    pub fn make_move(
        &mut self,
        user_id: &UserID,
        mv: &BughouseMove,
    ) -> Result<BoardID, Error> {
        if self.start.is_none() || Utc::now() < self.start.unwrap() {
            return Err(Error::InvalidMoveTurn);
        }
        let (board_id, color) = self
            .get_board_id_for_user(user_id)
            .ok_or(Error::InvalidMoveUser(*user_id))?;
        if color != self.side_to_move(board_id) {
            return Err(Error::InvalidMoveTurn);
        }
        self.game.make_move(board_id, mv)?;
        self.last_moves[board_id.to_index()] = Some(mv.clone());
        self.check_for_mate();
        self.update_clocks(board_id, color);
        Ok(board_id)
    }
}

#[cfg(test)]
mod test {

    #[test]
    fn uuid_ref_eq_sanity() {
        let uid_nil_1 = uuid::Uuid::nil();
        let uid_nil_2 = uuid::Uuid::nil();
        assert!(&uid_nil_1 == &uid_nil_2);
    }
}
