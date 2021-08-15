use bughouse::{BoardID, Color};

use crate::connection_mgr::UserID;
use crate::game::{Game, GamePlayers};

pub struct Player {
    id: UserID,
    board: BoardID,
    color: Color,
}

impl Player {
    pub fn new(id: UserID, board: BoardID, color: Color) -> Self {
        Player { id, board, color }
    }
    pub fn get_uid(&self) -> UserID {
        self.id
    }
    pub fn get_color(&self) -> Color {
        self.color
    }
    pub fn get_board(&self) -> BoardID {
        self.board
    }
}

pub struct Players {
    players: [Player; 4],
}

impl Players {
    pub fn new(game_players: &GamePlayers) -> Self {
        let [[a_white, a_black], [b_white, b_black]] = game_players;
        Players {
            players: [
                Player::new(Game::uid(a_white), BoardID::A, Color::White),
                Player::new(Game::uid(a_black), BoardID::A, Color::Black),
                Player::new(Game::uid(b_white), BoardID::B, Color::White),
                Player::new(Game::uid(b_black), BoardID::B, Color::Black),
            ],
        }
    }

    pub fn get_players(&self) -> &[Player; 4] {
        &self.players
    }
}
