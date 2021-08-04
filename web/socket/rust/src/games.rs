use actix::prelude::*;
use bughouse::{BoardID, BughouseMove};
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
        user: Arc<RwLock<User>>,
    ) -> Result<ClientMessage, Error> {
        let game = Game::table(id, time_ctrl, user.clone());
        let locked_game = Arc::new(RwLock::new(game));
        {
            let mut games = self.games.write().unwrap();
            games.insert(id, locked_game.clone());
        }
        {
            let mut user_games = self.user_games.write().unwrap();
            user_games.insert(user.read().unwrap().id, id);
        }
        let game_json = GameJson::new(locked_game.clone(), GameJsonKind::FormTable);
        self.notify_observers(locked_game, game_json);
        Ok(ClientMessage::new(ClientMessageKind::Empty))
    }

    pub fn start_game(
        &self,
        id: GameID,
        start: DateTime<Utc>,
        time_ctrl: TimeControl,
        players: GamePlayers,
    ) -> Result<(Arc<RwLock<Game>>, ClientMessage), Error> {
        println!("Games::start_game");
        // let (id, start) = self.server.insert_game(&time_ctrl, &players).await?;
        let game = Game::start(id, start, time_ctrl, players.clone());
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
            .ok_or(Error::InvalidMoveNotPlaying(uid))?;
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
        game_json: GameJson
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

    pub fn update_game_observers(&self, ar_game: Arc<RwLock<Game>>) {
        let result = ar_game.read().unwrap().get_result();
        let kind = if result.is_none() {
            GameJsonKind::Update
        } else {
            GameJsonKind::End
        };
        let game_json = GameJson::new(ar_game.clone(), kind);
        println!("Notifying game players {:?}", game_json);
        Self::debug_print_clocks(ar_game.clone());
        // let msg = self.notify_observers(ar_game.clone(), game_json);
        if result.is_some() {
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
            Some(self.games.read().unwrap().get(game_id).unwrap().clone())
        } else {
            None
        }
    }
}
