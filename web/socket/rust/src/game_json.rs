use bughouse::{BoardID, Color};
use serde_json::json;
use serde_json::Value;
use std::sync::{Arc, RwLock};

use crate::b66::B66;
use crate::game::{Game, GameID};

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
    holdings: String,
    board: BoardFenJson,
}

pub struct GameJson {
    id: GameID,
    a: BoardJson,
    b: BoardJson,
}

impl GameJson {
    pub fn to_string(&self, kind: &str) -> Value {
        json!({
            "kind": kind,
            "id": B66::encode_uuid(self.id),
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

fn get_board_json(game: &Game, board_id: BoardID) -> BoardJson {
    let board = game.get_board(board_id);
    let players = game.get_players();
    let [white_lock, black_lock] = &players[board_id.to_index()];
    let white = white_lock.read().unwrap();
    let black = black_lock.read().unwrap();
    let clocks = game.get_clocks()[board_id.to_index()];
    BoardJson {
        holdings: board.get_holdings().to_string(),
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

impl From<Arc<RwLock<Game>>> for GameJson {
    fn from(locked_game: Arc<RwLock<Game>>) -> GameJson {
        let game = locked_game.read().unwrap();
        GameJson {
            id: *game.get_id(),
            a: get_board_json(&game, BoardID::A),
            b: get_board_json(&game, BoardID::B),
        }
    }
}
