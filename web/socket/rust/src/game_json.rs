use bughouse::{BoardID, Color};
use chrono::prelude::*;
use chrono::Duration;
use serde::Serialize;
use serde::ser::{Serializer, SerializeStruct};
use serde_json::{json, Value};
use std::sync::{Arc, RwLock};

use crate::b66::B66;
use crate::game::{Game, GameID, GameResult};

#[derive(Clone, Copy, Debug)]
pub enum GameJsonKind {
    Start,
    Update,
    End,
}

impl std::fmt::Display for GameJsonKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let string = match self {
            GameJsonKind::Start => "game_start",
            GameJsonKind::Update => "game_update",
            GameJsonKind::End => "game_end",
        };
        f.write_str(string)
    }
}

impl Serialize for GameJsonKind {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where S: serde::Serializer {
            serializer.serialize_str(&self.to_string())
            // let mut state = serializer.serialize_struct("GameJsonKind", 3)?;
            // state.serialize_field("board", &(self.board as u8))?;
            // state.serialize_field("color", &(self.color as u8))?;
            // state.serialize_field("kind", &(self.kind as u8))?;
            // state.end()
        }
}

pub struct PlayerJson {
    handle: String,
    ms: i32,
}

pub struct BoardFenJson {
    fen: String,
    white: PlayerJson,
    black: PlayerJson,
}

pub struct BoardJson {
    // kind: GameJsonKind,
    holdings: String,
    board: BoardFenJson,
}

pub struct GameJson {
    id: GameID,
    kind: GameJsonKind,
    result: Option<GameResult>,
    start_in_ms: i32,
    a: BoardJson,
    b: BoardJson,
}

impl GameJson {
    pub fn new(locked_game: Arc<RwLock<Game>>, kind: GameJsonKind) -> Self {
        let game = locked_game.read().unwrap();
        let now = Utc::now();
        let start = *game.get_start();
        let mut start_in_ms = 0;
        if now < start {
            start_in_ms = (start - now).num_milliseconds() as i32;
        }
        GameJson {
            kind,
            id: *game.get_id(),
            result:  game.get_result(),
            start_in_ms,
            a: get_board_json(&game, BoardID::A), // kind),
            b: get_board_json(&game, BoardID::B), // kind),
        }
    }

    pub fn to_val(&self) -> Value {
        json!({
            "kind": self.kind,
            "id": B66::encode_uuid(self.id),
            "result": self.result,
            "delayStartMillis": self.start_in_ms,
            "a": {
                "holdings": self.a.holdings,
                "board": {
                    "fen": self.a.board.fen,
                    "white": {
                      "handle": self.a.board.white.handle,
                      "ms": self.a.board.white.ms,
                    },
                    "black": {
                      "handle": self.a.board.black.handle,
                      "ms": self.a.board.black.ms,
                    },
                }
            },
            "b": {
                "holdings": self.b.holdings,
                "board": {
                    "fen": self.b.board.fen,
                    "white": {
                      "handle": self.b.board.white.handle,
                      "ms": self.b.board.white.ms,
                    },
                    "black": {
                      "handle": self.b.board.black.handle,
                      "ms": self.b.board.black.ms,
                    },
                }
            },
        })
    }
}

fn get_board_json(
    game: &Game,
    board_id: BoardID,
    // kind: GameJsonKind,
    ) -> BoardJson {
    let board = game.get_board(board_id);
    let players = game.get_players();
    let [white_lock, black_lock] = &players[board_id.to_index()];
    let white = white_lock.read().unwrap();
    let black = black_lock.read().unwrap();
    let clocks = game.get_clocks()[board_id.to_index()];
    BoardJson {
        holdings: board.get_holdings().to_string(),
        // kind,
        board: BoardFenJson {
            fen: board.get_board().to_string(),
            white: PlayerJson {
                handle: white.handle.clone(),
                ms: clocks[Color::White.to_index()],
            },
            black: PlayerJson {
                handle: black.handle.clone(),
                ms: clocks[Color::Black.to_index()],
            },
        },
    }
}
