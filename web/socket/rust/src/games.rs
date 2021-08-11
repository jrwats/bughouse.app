use actix::prelude::*;
use bughouse::{BoardID, BughouseMove, Color, ALL_COLORS, BOARD_IDS};
use bytestring::ByteString;
use chrono::prelude::*;
use num_integer::div_rem;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::connection_mgr::{ConnectionMgr, UserID};
use crate::error::Error;
use crate::game::{Game, GameID, GamePlayers};
use crate::game_json::{GameJson, GameJsonKind};
use crate::messages::{ClientMessage, ClientMessageKind};
use crate::observers::Observers;
use crate::players::Players;
use crate::time_control::TimeControl;
use crate::users::User;
// use crate::db::Db;
// use crate::bughouse_server::BughouseServer;

// Ongoing games
pub struct Games {
    games: RwLock<HashMap<GameID, Arc<RwLock<Game>>>>,
    user_games: RwLock<HashMap<UserID, GameID>>,
    observers: Observers,
    conns: Arc<ConnectionMgr>,
}

impl Games {
    pub fn new(
        // db: Arc<Db>,
        conns: Arc<ConnectionMgr>,
    ) -> Self {
        Games {
            // db,
            // server,
            games: RwLock::new(HashMap::new()),
            user_games: RwLock::new(HashMap::new()),
            observers: Observers::new(),
            conns,
        }
    }

    pub fn form_table(
        &self,
        id: GameID,
        time_ctrl: TimeControl,
        rated: bool,
        user: Arc<RwLock<User>>,
    ) -> Result<ClientMessage, Error> {
        let game = Game::table(id, time_ctrl, rated, user.clone());
        let locked_game = Arc::new(RwLock::new(game));
        {
            let mut games = self.games.write().unwrap();
            games.insert(id, locked_game.clone());
        }
        self.set_user_game(user, id);
        let game_json =
            GameJson::new(locked_game.clone(), GameJsonKind::FormTable);
        self.notify_observers(locked_game, game_json);
        Ok(ClientMessage::new(ClientMessageKind::Empty))
    }

    pub fn get_user_seat(
        players: &GamePlayers,
        candidate: Arc<RwLock<User>>,
    ) -> Option<(BoardID, Color)> {
        let needle = candidate.read().unwrap();
        for (board_idx, boards) in players.iter().enumerate() {
            for (color_idx, maybe_user) in boards.iter().enumerate() {
                if let Some(user) = maybe_user {
                    let candidate = user.read().unwrap();
                    if needle.id == candidate.id {
                        return Some((
                            BOARD_IDS[board_idx],
                            ALL_COLORS[color_idx],
                        ));
                    }
                }
            }
        }
        None
    }

    fn set_user_game(&self, user: Arc<RwLock<User>>, game_id: GameID) {
        let uid = user.read().unwrap().id;
        let mut user_games = self.user_games.write().unwrap();
        user_games.insert(uid, game_id);
    }

    pub fn sit(
        &self,
        game_id: GameID,
        board_id: BoardID,
        color: Color,
        user: Arc<RwLock<User>>,
        ) -> Result<Arc<RwLock<Game>>, Error> {
        let game = self.get(&game_id).ok_or(Error::InvalidGameID(game_id))?;
        let game_clone = game.clone();
        let clone = user.clone();
        let ruser = clone.read().unwrap();
        {
            let mut wgame = game_clone.write().unwrap();
            if wgame.players[board_id.to_index()][color.to_index()].is_some() {
                eprintln!("Seat taken: {}, {}, {:?}", game_id, board_id, color);
                return Err(Error::SeatTaken(
                        game_id,
                        board_id,
                        color.to_index(),
                        ));
            } else if ruser.guest && wgame.rated {
                return Err(Error::SeatGuestAtRatedGame(ruser.id, game_id));
            }
            if let Some((prev_board, prev_color)) =
                Self::get_user_seat(&wgame.players, user.clone())
                {
                    wgame.players[prev_board.to_index()][prev_color.to_index()] =
                        None;
                }
            wgame.players[board_id.to_index()][color.to_index()] = Some(user.clone());
        }
        self.set_user_game(user.clone(), game_id);
        println!("sitting: {:?}", game.read().unwrap().players);
        Ok(game)
    }

    pub fn start_game(
        &self,
        game: Arc<RwLock<Game>>,
    ) -> Result<DateTime<Utc>, Error> {
        let start = game.write().unwrap().start();
        let game_json = GameJson::new(game.clone(), GameJsonKind::Start);
        println!("start: {:?}", game_json);
        self.notify_observers(game, game_json);
        Ok(start)
    }

    pub fn start_new_game(
        &self,
        id: GameID,
        start: DateTime<Utc>,
        time_ctrl: TimeControl,
        rated: bool,
        players: GamePlayers,
    ) -> Result<(Arc<RwLock<Game>>, ClientMessage), Error> {
        println!("Games::start_game");
        // let (id, start) = self.server.insert_game(&time_ctrl, &players).await?;
        let game = Game::start_new(id, start, time_ctrl, rated, players.clone());
        let locked_game = Arc::new(RwLock::new(game));
        {
            let mut games = self.games.write().unwrap();
            games.insert(id, locked_game.clone());
        }
        {
            let mut user_games = self.user_games.write().unwrap();
            let iplayers = Players::new(&players);
            for player in iplayers.get_players().iter() {
                user_games.insert(player.get_uid(), id);
            }
        }
        let game_json = GameJson::new(locked_game.clone(), GameJsonKind::Start);
        println!("json: {:?}", game_json);
        let msg = self.notify_observers(locked_game.clone(), game_json);
        Ok((locked_game, msg))
    }

    fn rm_from_user_games(&self, game_id: &GameID) -> bool {
        let games = self.games.read().unwrap();
        let res = games.get(game_id);
        if let Some(game) = res {
            let game = game.read().unwrap();
            let players = Players::new(game.get_players());
            let mut user_games = self.user_games.write().unwrap();
            for player in players.get_players() {
                user_games.remove(&player.get_uid());
            }
            return true;
        }
        false
    }

    pub fn rm_game(&self, game_id: &GameID) {
        if self.rm_from_user_games(game_id) {
            let mut wgames = self.games.write().unwrap();
            wgames.remove(game_id);
        }
    }

    pub fn make_move(
        &'static self,
        game_id: GameID,
        mv: &BughouseMove,
        uid: UserID,
    ) -> Result<(Arc<RwLock<Game>>, BoardID), Error> {
        let game = self
            .get_user_game(&uid)
            .ok_or(Error::InvalidMoveNotPlaying(uid, game_id))?;
        {
            let user_game = game.read().unwrap();
            let user_game_id = user_game.get_id();
            if *user_game_id != game_id {
                return Err(Error::InvalidGameIDForUser(
                    uid,
                    game_id,
                    (*user_game_id).clone(),
                ));
            }
            println!("Found game {}, for: {}", user_game_id, uid);
        }
        let board_id = game.write().unwrap().make_move(&uid, mv)?;
        self.update_game_observers(game.clone());
        Ok((game.clone(), board_id))
    }

    pub fn notify_observers(
        &self,
        ar_game: Arc<RwLock<Game>>,
        game_json: GameJson,
    ) -> ClientMessage {
        let game = ar_game.read().unwrap();
        let players = game.get_players();
        let msg_val = game_json.to_val();
        println!("notify msg: {}", msg_val);
        let bytestr = Arc::new(ByteString::from(msg_val.to_string()));
        let msg = ClientMessage::new(ClientMessageKind::Text(bytestr));
        for player in Players::new(&players).get_players().iter() {
            self.conns.send_to_user(player.get_uid(), &msg);
        }
        self.observers.notify(game.get_id(), &msg);
        msg
    }

    fn debug_print_clocks(ar_game: Arc<RwLock<Game>>) {
        let game = ar_game.read().unwrap();
        let board_clocks = game.get_clocks();
        print!("clocks: ");
        for clocks in board_clocks.iter() {
            for clock_ms in clocks.iter() {
                let (mins, secs) = div_rem(clock_ms / 1000, 60 as i32);
                print!("{}:{}, ", mins, secs);
            }
        }
        println!("");
    }

    pub fn is_table(ar_game: Arc<RwLock<Game>>) -> bool {
        let game = ar_game.read().unwrap();
        for board in game.players.iter() {
            for player in board {
                if player.is_none() {
                    return true;
                }
            }
        }
        false
    }

    pub fn get_kind(ar_game: Arc<RwLock<Game>>) -> GameJsonKind {
        if ar_game.read().unwrap().get_result().is_none() {
            if Self::is_table(ar_game.clone()) {
                GameJsonKind::Table
            } else {
                GameJsonKind::Update
            }
        } else {
            GameJsonKind::End
        }
    }

    pub fn update_game_observers(&self, ar_game: Arc<RwLock<Game>>) {
        let game_json =
            GameJson::new(ar_game.clone(), Self::get_kind(ar_game.clone()));
        println!("Notifying game players {:?}", game_json);
        Self::debug_print_clocks(ar_game.clone());
        let _msg = self.notify_observers(ar_game.clone(), game_json);
        if ar_game.read().unwrap().get_result().is_some() {
            self.rm_game(ar_game.read().unwrap().get_id());
        }
    }

    pub fn is_in_game(&self, uid: &UserID) -> bool {
        self.get_user_game(uid).is_some()
    }

    pub fn get(&self, game_id: &GameID) -> Option<Arc<RwLock<Game>>> {
        let games = self.games.read().unwrap();
        games.get(game_id).map(|a| a.clone())
    }

    pub fn observe(
        &self,
        game_id: &GameID,
        recipient: Recipient<ClientMessage>,
    ) {
        // Only observe if the user ISN'T playing a game
        let maybe_game = self.get(&game_id);
        if maybe_game.is_none() {
            return;
        }
        let locked_game = maybe_game.unwrap();
        let conn_id = ConnectionMgr::get_conn_id(&recipient);
        if let Some(uid) = self.conns.uid_from_conn(&conn_id) {
            let game = locked_game.read().unwrap();
            for player in Players::new(game.get_players()).get_players().iter()
            {
                if player.get_uid() == uid {
                    return;
                }
            }
        }
        self.observers.observe(*game_id, recipient);
    }

    pub fn remove_recipient(&self, recipient: &Recipient<ClientMessage>) {
        self.observers.remove_recipient(recipient);
    }

    pub fn get_user_game(&self, uid: &UserID) -> Option<Arc<RwLock<Game>>> {
        let games = self.user_games.read().unwrap();
        if let Some(game_id) = games.get(uid) {
            println!("Got game {} for uid: {}", game_id, uid);
            Some(self.games.read().unwrap().get(game_id).unwrap().clone())
        } else {
            None
        }
    }
}
