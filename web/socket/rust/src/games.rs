use actix::prelude::*;
use bughouse::{BoardID, BughouseMove, Color, ALL_COLORS, BOARD_IDS};
use bytestring::ByteString;
use chrono::prelude::*;
use num_integer::div_rem;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};

use crate::b66::B66;
use crate::connection_mgr::{ConnectionMgr, UserID};
use crate::error::Error;
use crate::game::{Game, GameID, GamePlayers, GameStatus};
use crate::game_json::{GameJson, GameJsonKind};
use crate::messages::{
    ClientMessage, ClientMessageKind, UserStateKind, UserStateMessage,
};
use crate::observers::Observers;
use crate::players::Players;
use crate::subscriptions::Subscriptions;
use crate::time_control::TimeControl;
use crate::users::User;
// use crate::db::Db;
// use crate::bughouse_server::BughouseServer;

// Ongoing games
pub struct Games {
    games: RwLock<HashMap<GameID, Arc<RwLock<Game>>>>,
    user_games: RwLock<HashMap<UserID, GameID>>,
    game_observers: Observers,
    public_table_subs: RwLock<Subscriptions>,
    conns: Arc<ConnectionMgr>,
}

#[derive(PartialEq)]
pub enum TableUpdateType {
    Add,
    Remove,
    Update,
}

pub struct GameUserHandler {
    games: Arc<Games>,
}

impl Actor for GameUserHandler {
    /// Just need ability to communicate with other actors.
    type Context = Context<Self>;
}

impl Handler<UserStateMessage> for GameUserHandler {
    type Result = Result<(), Error>;

    fn handle(
        &mut self,
        msg: UserStateMessage,
        _ctx: &mut Context<Self>,
    ) -> Self::Result {
        match msg.kind {
            UserStateKind::Offline(uid) => {
                self.games.on_offline_user(uid);
            }
            UserStateKind::Online(_uid) => {
                // no-op
            }
        }
        Ok(())
    }
}

impl GameUserHandler {
    pub fn new(games: Arc<Games>) -> Self {
        GameUserHandler { games }
    }
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
            game_observers: Observers::new(conns.clone()),
            public_table_subs: RwLock::new(Subscriptions::new()),
            conns,
        }
    }

    pub fn form_table(
        &self,
        id: GameID,
        time_ctrl: TimeControl,
        rated: bool,
        public: bool,
        user: Arc<RwLock<User>>,
    ) -> Result<ClientMessage, Error> {
        let game = Game::table(id, time_ctrl, rated, public, user.clone());
        let locked_game = Arc::new(RwLock::new(game));
        {
            let mut games = self.games.write().unwrap();
            games.insert(id, locked_game.clone());
        }
        self.set_user_game(user, id)?;
        let game_json =
            GameJson::new(locked_game.clone(), GameJsonKind::FormTable);
        self.notify_game_observers(locked_game.clone(), game_json);
        self.notify_public_subs(TableUpdateType::Add, locked_game);
        Ok(ClientMessage::new(ClientMessageKind::Empty))
    }

    fn rm_user_game(&self, uid: &UserID) {
        let mut wgames = self.user_games.write().unwrap();
        wgames.remove(uid);
    }

    fn set_user_game(
        &self,
        user: Arc<RwLock<User>>,
        game_id: GameID,
    ) -> Result<(), Error> {
        self.ensure_game_id_matches(user.clone(), &game_id)?;
        let mut user_games = self.user_games.write().unwrap();
        user_games.insert(user.read().unwrap().id, game_id);
        Ok(())
    }

    fn ensure_game_id_matches(
        &self,
        user: Arc<RwLock<User>>,
        game_id: &GameID,
    ) -> Result<(), Error> {
        let ruser = user.read().unwrap();
        if let Some(user_game_id) =
            self.user_games.read().unwrap().get(&ruser.id)
        {
            if game_id != user_game_id {
                return Err(Error::InGame(
                    ruser.handle.to_string(),
                    B66::encode_uuid(game_id),
                ));
            }
        }
        Ok(())
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
        self.ensure_game_id_matches(user.clone(), &game_id)?;
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
                wgame.get_user_seat(&user.read().unwrap().id)
            {
                wgame.players[prev_board][prev_color] = None;
            }
            wgame.players[board_id.to_index()][color.to_index()] =
                Some(user.clone());
        }
        self.set_user_game(user.clone(), game_id)?;
        self.notify_public_subs(TableUpdateType::Update, game.clone());
        println!("sitting: {:?}", game.read().unwrap().players);
        Ok(game)
    }

    pub fn vacate(
        &self,
        game_id: GameID,
        board_id: BoardID,
        color: Color,
        uid: UserID,
    ) -> Result<Arc<RwLock<Game>>, Error> {
        let game = self.get(&game_id).ok_or(Error::InvalidGameID(game_id))?;
        {
            let mut wgame = game.write().unwrap();
            let bidx = board_id.to_index();
            let cidx = color.to_index();
            let seat = wgame.players[bidx][cidx].clone();
            match seat {
                None => {
                    eprintln!(
                        "Seat already empty: {}, {}, {:?}",
                        game_id, board_id, color
                    );
                    return Err(Error::SeatEmpty(game_id, board_id, cidx));
                }
                Some(user) => {
                    let ruser = user.read().unwrap();
                    if uid != ruser.id {
                        eprintln!(
                            "Can only vacate self: {}, {}, {:?}",
                            game_id, board_id, color
                        );
                        return Err(Error::SeatUnowned(
                            game_id, board_id, cidx,
                        ));
                    } else {
                        wgame.players[bidx][cidx] = None;
                    }
                }
            }
        }
        self.notify_public_subs(TableUpdateType::Update, game.clone());
        Ok(game)
    }

    pub fn start_game(
        &self,
        game: Arc<RwLock<Game>>,
    ) -> Result<DateTime<Utc>, Error> {
        let start = game.write().unwrap().start();
        let game_json = GameJson::new(game.clone(), GameJsonKind::Start);
        println!("start: {:?}", game_json);
        self.notify_game_observers(game.clone(), game_json);
        self.notify_public_subs(TableUpdateType::Remove, game);
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
        let game =
            Game::start_new(id, start, time_ctrl, rated, players.clone());
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
        let msg = self.notify_game_observers(locked_game.clone(), game_json);
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
            .ok_or(Error::InvalidUserNotPlaying(uid, game_id))?;
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

    pub fn notify_game_observers(
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
            self.conns.send_to_user(&player.get_uid(), &msg);
        }
        let players = Self::get_player_set(ar_game.clone());
        self.game_observers.notify(game.get_id(), &msg, players);
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

    fn get_player_set(ar_game: Arc<RwLock<Game>>) -> HashSet<UserID> {
        let game = ar_game.read().unwrap();
        let mut players = HashSet::new();
        for player in Players::new(game.get_players()).get_players().iter() {
            players.insert(player.get_uid());
        }
        players
    }

    pub fn update_game_observers(&self, ar_game: Arc<RwLock<Game>>) {
        let game_json =
            GameJson::new(ar_game.clone(), Self::get_kind(ar_game.clone()));
        Self::debug_print_clocks(ar_game.clone());
        self.notify_game_observers(ar_game, game_json);
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
        self.game_observers.observe(*game_id, recipient);
    }

    pub fn remove_recipient(&self, recipient: &Recipient<ClientMessage>) {
        self.game_observers.remove_recipient(recipient);
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

    pub fn sub_public_tables(&self, recipient: Recipient<ClientMessage>) {
        let mut wsubs = self.public_table_subs.write().unwrap();
        wsubs.sub(recipient);
    }

    pub fn unsub_public_tables(&self, recipient: Recipient<ClientMessage>) {
        let mut wsubs = self.public_table_subs.write().unwrap();
        wsubs.unsub(recipient);
    }

    fn notify_public_subs(
        &self,
        kind: TableUpdateType,
        game: Arc<RwLock<Game>>,
    ) {
        if !game.read().unwrap().public {
            return;
        }
        let msg = match kind {
            TableUpdateType::Add | TableUpdateType::Update => {
                let (id, json) =
                    Self::get_table_json(game, GameJsonKind::FormTable);
                json!({
                    "kind": "public_table",
                    "id": id,
                    "add": kind == TableUpdateType::Add,
                    "update": kind == TableUpdateType::Update,
                    "table": json,
                })
            }
            TableUpdateType::Remove => {
                json!({
                    "kind": "public_table",
                    "id": B66::encode_uuid(game.read().unwrap().get_id()),
                    "rm": true,
                })
            }
        };
        let bytestr = Arc::new(ByteString::from(msg.to_string()));
        let msg = ClientMessage::new(ClientMessageKind::Text(bytestr));
        let mut wsubs = self.public_table_subs.write().unwrap();
        wsubs.notify(msg);
    }

    fn get_table_json(
        game: Arc<RwLock<Game>>,
        kind: GameJsonKind,
    ) -> (String, Value) {
        let game_json = GameJson::new(game.clone(), kind);
        let val = game_json.to_val();
        let id = val["id"].as_str().unwrap();
        return (id.to_string(), val);
    }

    fn is_table(game: Arc<RwLock<Game>>) -> bool {
        game.read().unwrap().has_empty_seat()
    }

    fn on_offline_user(&self, uid: UserID) {
        if let Some(game) = self.get_user_game(&uid) {
            if Self::is_table(game.clone()) {
                {
                    let mut wgame = game.write().unwrap();
                    let (board_idx, color_idx) =
                        wgame.get_user_seat(&uid).unwrap();
                    wgame.players[board_idx][color_idx] = None;
                }
                let game_json =
                    GameJson::new(game.clone(), GameJsonKind::Table);
                self.notify_game_observers(game.clone(), game_json);
                self.notify_public_subs(TableUpdateType::Update, game);
                self.rm_user_game(&uid);
            }
        }
    }

    fn is_public(game: &Arc<RwLock<Game>>) -> bool {
        game.read().unwrap().is_public_table()
    }

    pub fn get_public_table_json(&self) -> HashMap<String, serde_json::Value> {
        let mut jsons = HashMap::new();
        let games = self.games.read().unwrap();
        for (_gid, game) in games.iter().filter(|g| Self::is_public(g.1)) {
            let (id, json) =
                Self::get_table_json(game.clone(), GameJsonKind::Table);
            jsons.insert(id.to_string(), json);
        }
        jsons
    }
}
