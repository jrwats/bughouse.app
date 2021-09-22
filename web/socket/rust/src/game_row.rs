use bughouse::{
    BughouseMove, ALL_COLORS, ALL_PIECES, ALL_SQUARES, BOARD_IDS, NUM_PIECES,
};
use chrono::Duration;
use scylla::cql_to_rust::{FromCqlVal, FromRow};
use scylla::macros::{FromRow, FromUserType};
use scylla::frame::value::Timestamp as ScyllaTimestamp;
use serde_json::{json, Value};
use std::collections::HashMap;

use crate::b66::B66;
use crate::db::{UserRatingSnapshot, TableSnapshot};
use crate::users::UserID;
use crate::game::{GameID, GameResult, GameResultType};
use crate::time_control::TimeControl;

#[derive(Clone, Debug, FromRow)]
pub struct GameRow {
    pub id: GameID,
    pub start_time: Duration,
    pub result: i16,
    pub time_ctrl: TimeControl,
    pub rated: bool,
    pub players: TableSnapshot,
    pub moves: HashMap<i32, i16>,
}

#[derive(Clone, FromRow, FromUserType)]
pub struct UserGameRow {
    pub uid: UserID,
    pub start_time: Duration,
    pub game_id: GameID,
    pub result: i16,
    pub rated: bool,
    pub players: TableSnapshot,
}

// UserGameRow works for reading from DB.  IntoUserGameRow is for writing (Unfortunately Scylla
// rust driver is a bit awkward around timestamps).
pub type IntoUserGameRow = (
    UserID, ScyllaTimestamp, GameID, i16, bool, TableSnapshot
    );

impl UserGameRow {
    pub fn into_row(self) -> IntoUserGameRow {
        (
            self.uid,
            ScyllaTimestamp(self.start_time),
            self.game_id,
            self.result,
            self.rated,
            self.players
        )
    }
}

impl Default for UserGameRow {
    fn default() -> Self {
        let rating = UserRatingSnapshot::nil();
        UserGameRow {
            uid: UserID::nil(),
            game_id: GameID::nil(),
            start_time: Duration::zero(),
            result: 0,
            rated: false,
            players: ((rating.clone(), rating.clone()), (rating.clone(), rating))
        }
    }
}


//                            src             dest    piece
// type ClientBughouesMove = (Option<String>, String, Option<String>);

impl GameRow {
    pub fn to_json(
        &self,
        handles: ((String, String), (String, String)),
        kind: Option<String>,
    ) -> Value {
        // let mut moves: [HashMap<i32, ClientBughouesMove>; 2] =
        //     [HashMap::new(), HashMap::new()];
        // for (key, mv_num) in self.moves.iter() {
        //     let bug_move = Self::deserialize_move(*mv_num);
        //     let serialized = (
        //         bug_move.get_source().map(|s| s.to_string()),
        //         bug_move.get_dest().to_string(),
        //         bug_move.get_piece().map(|p| p.to_string(Color::Black)),
        //     );
        //     moves[(key & 1) as usize].insert(key >> 1, serialized);
        // }
        let ((aw, ab), (bw, bb)) = &self.players;
        let ((awh, abh), (bwh, bbh)) = &handles;
        let result: GameResult = Self::deserialize_result(self.result);
        let msg_kind = match kind {
            None => "game_row".to_string(),
            Some(k) => k,
        };
        json!({
            "id": B66::encode_uuid(&self.id),
            "kind": msg_kind,
            "start_time": self.start_time.num_milliseconds(),
            "result": result,
            "time_ctrl": format!("{}", self.time_ctrl),
            "rated": self.rated,
            "players": [
                [{
                    "rating": aw.rating,
                    "handle": awh,
                }, {
                    "rating": ab.rating,
                    "handle": abh,
                }],
                [{
                    "rating": bw.rating,
                    "handle": bwh,
                }, {
                    "rating": bb.rating,
                    "handle": bbh,
                }],
            ],
            "moves": self.moves
        })
    }

    pub fn deserialize_result(result_col: i16) -> GameResult {
        let board_idx = (result_col & 1) as usize;
        let winner = ((result_col >> 1) & 1) as usize;
        let result = if ((result_col >> 2) & 1) == 0 {
            GameResultType::Flagged
        } else {
            GameResultType::Checkmate
        };
        GameResult {
            board: BOARD_IDS[board_idx],
            winner: ALL_COLORS[winner],
            kind: result,
        }
    }

    pub fn serialize_result(result: &GameResult) -> i16 {
        result.board as i16
            | ((result.winner as i16) << 1)
            | ((result.kind as i16) << 2)
    }

    pub fn deserialize_move(mv_num: i16) -> BughouseMove {
        let (src, dest, piece) = if mv_num < 0 {
            // drop move
            let pos_mv = -mv_num;
            let piece = ALL_PIECES[(pos_mv >> 6) as usize];
            (None, ALL_SQUARES[(pos_mv & 0x3F) as usize], Some(piece))
        } else {
            let piece_idx = ((mv_num >> 6) & 0b111) as usize;
            let piece = if piece_idx >= NUM_PIECES {
                None
            } else {
                Some(ALL_PIECES[piece_idx])
            };
            let src_idx = (mv_num >> 9) as usize;
            (
                Some(ALL_SQUARES[src_idx]),
                ALL_SQUARES[(mv_num & 0x3F) as usize],
                piece,
            )
        };
        BughouseMove::new(src, dest, piece)
    }

    // HSB => LSB
    // bit count 6    3    6
    // move:     src|piece|dest
    // drop:         piece|dest (negative)
    pub fn serialize_move(mv: &BughouseMove) -> i16 {
        let res = mv.get_dest().to_int() as i16;
        match mv.get_source() {
            None => -(res | (mv.get_piece().unwrap().to_index() as i16) << 6),
            Some(src) => {
                let piece_idx = if let Some(piece) = mv.get_piece() {
                    piece.to_index() as usize
                } else {
                    NUM_PIECES
                };
                res | (piece_idx << 6) as i16 | (src.to_index() << 9) as i16
            }
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use bughouse::{Piece, Square, NUM_SQUARES};

    #[test]
    fn move_serialization() {
        let tests = [
            (
                BughouseMove::new(None, Square::F7, Some(Piece::Bishop)),
                -181,
            ),
            (
                BughouseMove::new(
                    Some(Square::C4),
                    Square::F7,
                    Some(Piece::Bishop),
                ),
                13493,
            ),
            (
                BughouseMove::new(
                    Some(ALL_SQUARES[NUM_SQUARES - 1]),
                    ALL_SQUARES[NUM_SQUARES - 1],
                    Some(Piece::King),
                ),
                32639,
            ),
            (
                BughouseMove::new(
                    Some(ALL_SQUARES[NUM_SQUARES - 1]),
                    ALL_SQUARES[NUM_SQUARES - 1],
                    None,
                ),
                32703,
            ),
        ];
        for (mv, expected_num) in tests.iter() {
            let mv_num = GameRow::serialize_move(&mv);
            assert!(*expected_num == mv_num);
            let dmv = GameRow::deserialize_move(mv_num);
            assert!(*mv == dmv);
        }
    }
}
