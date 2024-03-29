use bughouse::{BoardID, BughouseMove, Color};
use chrono::prelude::*;
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::{Arc, RwLock};

use crate::b66::B66;
use crate::game::{Game, GameID, GameResult};
use crate::time_control::TimeControl;

#[derive(Clone, Copy, Debug)]
pub enum GameJsonKind {
    Current,   // Current game (singular) update
    Currents,  // CurrentGames (batch)
    End,       // Game over
    FormTable, // Formation of a table
    Table,     // Table updates (sitting/leaving)
    Start,     // Game start
    Update,    // moves
}

impl std::fmt::Display for GameJsonKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let string = match self {
            GameJsonKind::End => "game_end",
            GameJsonKind::FormTable => "form_table",
            GameJsonKind::Start => "game_start",
            GameJsonKind::Table => "table",
            GameJsonKind::Update => "game_update",
            GameJsonKind::Currents => "current_games",
            GameJsonKind::Current => "current_game",
        };
        f.write_str(string)
    }
}

impl Serialize for GameJsonKind {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
        // let mut state = serializer.serialize_struct("GameJsonKind", 3)?;
        // state.serialize_field("board", &(self.board as u8))?;
        // state.serialize_field("color", &(self.color as u8))?;
        // state.serialize_field("kind", &(self.kind as u8))?;
        // state.end()
    }
}

#[derive(Debug)]
pub struct PlayerJson {
    handle: Option<String>,
    ms: i32,
}

#[derive(Debug)]
pub struct BoardFenJson {
    fen: String,
    last_move: Option<BughouseMove>,
    white: PlayerJson,
    black: PlayerJson,
}

#[derive(Debug)]
pub struct BoardJson {
    // kind: GameJsonKind,
    holdings: String,
    board: BoardFenJson,
}

#[derive(Debug)]
pub struct GameJson {
    id: GameID,
    kind: GameJsonKind,
    rated: bool,
    time_ctrl: TimeControl,
    result: Option<GameResult>,
    start_in_ms: i32,
    a: BoardJson,
    b: BoardJson,
}

fn get_squares(maybe_mv: &Option<BughouseMove>) -> Option<Vec<String>> {
    if let Some(mv) = maybe_mv {
        let mut squares = Vec::new();
        if let Some(sq) = mv.get_source() {
            squares.push(sq.to_string());
        }
        squares.push(mv.get_dest().to_string());
        Some(squares)
    } else {
        None
    }
}

impl GameJson {
    fn start_in_ms(maybe_start: Option<DateTime<Utc>>) -> i32 {
        if let Some(start) = maybe_start {
            let now = Utc::now();
            if now < start {
                (start - now).num_milliseconds() as i32
            } else {
                0
            }
        } else {
            -1
        }
    }

    pub fn new(locked_game: Arc<RwLock<Game>>, kind: GameJsonKind) -> Self {
        let game = locked_game.read().unwrap();
        GameJson {
            kind,
            id: *game.get_id(),
            time_ctrl: game.time_ctrl.clone(),
            rated: game.rated,
            result: game.get_result(),
            start_in_ms: Self::start_in_ms(game.get_start()),
            a: get_board_json(&game, BoardID::A), // kind),
            b: get_board_json(&game, BoardID::B), // kind),
        }
    }

    pub fn to_val(&self) -> Value {
        json!({
            "kind": self.kind,
            "id": B66::encode_uuid(&self.id),
            "rated": self.rated,
            "result": self.result,
            "timeCtrl": self.time_ctrl,
            "delayStartMillis": self.start_in_ms,
            "a": {
                "holdings": self.a.holdings,
                "board": {
                    "fen": self.a.board.fen,
                    "lastMove": get_squares(&self.a.board.last_move),
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
                    "lastMove": get_squares(&self.b.board.last_move),
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
    let [maybe_white, maybe_black] = &players[board_id.to_index()];
    let clocks = game.get_clocks()[board_id.to_index()];
    BoardJson {
        holdings: board.get_holdings().to_string(),
        // kind,
        board: BoardFenJson {
            fen: board.get_board().to_string(),
            last_move: game.get_last_move(board_id),
            white: PlayerJson {
                handle: Game::handle(maybe_white),
                ms: clocks[Color::White.to_index()],
            },
            black: PlayerJson {
                handle: Game::handle(maybe_black),
                ms: clocks[Color::Black.to_index()],
            },
        },
    }
}
