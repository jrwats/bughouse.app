use bughouse::{BughouseMove, Square, ALL_PIECES, ALL_SQUARES, NUM_PIECES};
use chrono::Duration;
use scylla::cql_to_rust::FromRow;
use scylla::macros::FromRow;
use serde_json::{json, Value};
use std::collections::HashMap;

use crate::db::TableSnapshot;
use crate::game::GameID;
use crate::time_control::TimeControl;

#[derive(Clone, FromRow)]
pub struct GameRow {
    pub id: GameID,
    pub start_time: Duration,
    pub result: i16,
    pub time_ctrl: TimeControl,
    pub rated: bool,
    pub players: TableSnapshot,
    pub moves: HashMap<i32, i16>,
}

impl GameRow {
    pub fn to_json(&self) -> Value {
        // : [HashMap<i32, BughouseMove; 2] 
        let mut moves: [HashMap<i32, (Option<Square>, Square, Option<Piece>)>; 2] = [HashMap::new(), HashMap::new()];
        for (key, mv_num) in self.moves.iter() {
            let bug_move = Self::deserialize_move(*mv_num);
            let serialized = (bug_move.get_source(), bug_move.get_dest(), bug_move.get_piece());
            moves[(key & 1) as usize].insert(key >> 1, serialized);
        }
        let oh_hai = self.start_time.num_milliseconds();
        json!({
            id: self.id,
            start_time: oh_hai,
            result: self.result,
            time_ctrl: format!("{}", self.time_ctrl),
            rated: self.rated,
            // players: self.players,
            // moves: moves,
        })
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
    use bughouse::Piece;


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
