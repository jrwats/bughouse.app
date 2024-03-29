use bughouse::{BoardID, BughouseMove};
use chrono::prelude::*;
use chrono::Duration;
use noneifempty::NoneIfEmpty;
use scylla::batch::Batch;
use scylla::cql_to_rust::FromCqlVal;
use scylla::frame::value::Timestamp as ScyllaTimestamp;
use scylla::macros::{FromRow, FromUserType, IntoUserType};
use scylla::prepared_statement::PreparedStatement;
use scylla::query::Query;
use scylla::statement::{Consistency, SerialConsistency};
use scylla::transport::session::{IntoTypedRows, Session};
use scylla::QueryResult;
use scylla::SessionBuilder;
use std::collections::HashMap;
use std::env;
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::{Arc, RwLock};
use uuid::v1::{Context, Timestamp};
use uuid::Uuid;

use crate::b66::B66;
use crate::error::Error;
use crate::firebase::*;
use crate::game::{Game, GameID};
use crate::game_row::{GameRow, IntoUserGameRow, UserGameRow};
use crate::guest::guest_handle::GuestHandle;
use crate::players::Players;
use crate::rating::{Rating, UserRating};
use crate::time_control::TimeControl;
use crate::users::{User, UserID};

const DEFAULT_URI: &str = "127.0.0.1:9042";

// User's GLICKO rating snapshot before game start
#[derive(Copy, Clone, Debug, FromRow, IntoUserType, FromUserType)]
pub struct UserRatingSnapshot {
    pub rating: i16,
    pub uid: UserID,
}

impl UserRatingSnapshot {
    pub fn nil() -> Self {
        UserRatingSnapshot::from(None)
    }
}

impl Default for UserRatingSnapshot {
    fn default() -> Self {
        UserRatingSnapshot::nil()
    }
}

pub type BoardSnapshot = (UserRatingSnapshot, UserRatingSnapshot);
pub type TableSnapshot = (BoardSnapshot, BoardSnapshot);

pub struct Db {
    session: Session,
    ctx: Context,
}

#[derive(Debug, FromRow)]
pub struct FirebaseRowData {
    fid: String,
    display_name: Option<String>,
    email: Option<String>,
    photo_url: Option<String>,
    provider_id: Option<String>,
}

impl FirebaseRowData {
    pub fn is_guest(&self) -> bool {
        self.provider_id == Some("anonymous".to_string())
    }
}

impl From<Option<Arc<RwLock<User>>>> for UserRatingSnapshot {
    fn from(maybe_user: Option<Arc<RwLock<User>>>) -> Self {
        match maybe_user {
            None => UserRatingSnapshot {
                uid: Uuid::nil(),
                rating: 0,
            },
            Some(user_lock) => UserRatingSnapshot::from(user_lock),
        }
    }
}

impl From<Arc<RwLock<User>>> for UserRatingSnapshot {
    fn from(user_lock: Arc<RwLock<User>>) -> Self {
        let user = user_lock.read().unwrap();
        UserRatingSnapshot {
            uid: *user.get_uid(),
            rating: user.rating,
        }
    }
}

impl Db {
    pub async fn new() -> Result<Self, Error> {
        let uri =
            env::var("SCYLLA_URI").unwrap_or_else(|_| DEFAULT_URI.to_string());
        let session: Session =
            SessionBuilder::new().known_node(uri).build().await?;
        let ctx = Context::new(0);
        Ok(Db { session, ctx })
    }

    pub fn session(&self) -> &Session {
        &self.session
    }

    // cqlsh:bughouse> INSERT INTO handles (id, handle) VALUES (now(), 'Guest_XYZ') IF NOT EXISTS;
    //
    //  [applied] | handle | id
    // -----------+--------+------
    //       True |   null | null
    //
    // cqlsh:bughouse> INSERT INTO handles (id, handle) VALUES (now(), 'Guest_XYZ') IF NOT EXISTS;
    //
    //  [applied] | handle     | id
    // -----------+------------+--------------------------------------
    //      False | Player_XYZ | 8ac88980-d963-11eb-bb7e-000000000002
    //
    async fn new_player_handle(
        &self,
        firebase_data: &FirebaseRowData,
    ) -> Result<(Uuid, String), Error> {
        let uuid = self.now()?;
        println!("Inserting into firebase_user...");
        self.session
            .query(
                "INSERT INTO bughouse.firebase_users
               (firebase_id, uid)
               VALUES (?, ?) IF NOT EXISTS",
                (&firebase_data.fid, uuid),
            )
            .await?;
        let handle = if firebase_data.is_guest() {
            GuestHandle::generate(&uuid)
        } else {
            format!("Player_{}", B66::encode_num(uuid.as_fields().0 as u128))
        };
        self.insert_handle(&handle, &uuid).await?;
        Ok((uuid, handle))
    }

    async fn insert_handle(
        &self,
        handle: &str,
        uid: &UserID,
    ) -> Result<(), Error> {
        let mut query = Query::new(
            "INSERT INTO bughouse.handles (handle, uid) VALUES (?, ?) IF NOT EXISTS".to_string()
            );
        query.set_consistency(Consistency::One);
        query.set_serial_consistency(Some(SerialConsistency::Serial));
        self.session.query(query, (handle, uid)).await?;
        Ok(())
    }

    async fn update_handle(
        &self,
        handle: &str,
        uid: &UserID,
    ) -> Result<(), Error> {
        // Delete old handles periodically.
        // Don't let people "steal" recently abandoned handles
        self.insert_handle(handle, uid).await?;
        self.session
            .query(
                "UPDATE bughouse.users SET handle = ? WHERE id = ?",
                (handle, uid),
            )
            .await?;
        Ok(())
    }

    pub async fn set_handle(
        &self,
        handle: &str,
        user: Arc<RwLock<User>>,
    ) -> Result<(), Error> {
        println!("db.set_handle");
        let uid = user.read().unwrap().id;
        let res = self.update_handle(handle, &uid).await;
        if let Err(e) = res {
            eprintln!("err: {:?}", e);
            return Err(e);
        }
        println!("db.set_handle SUCCESS");
        Ok(())
    }

    pub fn uuid_from_time(
        &self,
        time: DateTime<Utc>,
    ) -> Result<uuid::Uuid, uuid::Error> {
        let ns = time.timestamp_subsec_nanos();
        let secs = time.timestamp() as u64;
        let timestamp = Timestamp::from_unix(&self.ctx, secs, ns);
        Uuid::new_v1(timestamp, &[1, 3, 3, 7, 4, 2])
    }

    pub fn now(&self) -> Result<uuid::Uuid, uuid::Error> {
        self.uuid_from_time(Utc::now())
    }

    pub fn to_duration(time: DateTime<Utc>) -> Duration {
        Duration::milliseconds(time.timestamp_millis())
    }

    pub fn to_timestamp(time: DateTime<Utc>) -> ScyllaTimestamp {
        ScyllaTimestamp(Self::to_duration(time))
    }

    pub async fn add_rating(
        &self,
        id: UserID,
        rating: &Rating,
    ) -> Result<(), Error> {
        let res = self
            .session
            .query(
                "INSERT INTO bughouse.rating_history
                (uid, time, rating, deviation) VALUES (?, ?, ?, ?)",
                (
                    id,
                    Self::to_timestamp(Utc::now()),
                    rating.rating,
                    rating.deviation,
                ),
            )
            .await;
        if res.is_err() {
            eprintln!("Couldn't insert rating: {:?}", res);
        }
        res?;
        Ok(())
    }

    pub async fn get_game_row(
        &self,
        game_id: &GameID,
    ) -> Result<GameRow, Error> {
        let res = self
            .session
            .query(
                "SELECT id, start_time, result, time_ctrl, rated, players, moves
                FROM bughouse.games
                WHERE id = ?",
                (game_id,),
            )
            .await?;
        if let Some(rows) = res.rows {
            for row in rows.into_typed::<GameRow>() {
                let mut result = row?;
                result.moves = result.moves.or(Some(HashMap::new()));
                return Ok(result);
            }
        } else {
            eprintln!("error fetching {}: {:?}", game_id, res);
        }
        Err(Error::InvalidGameID(*game_id))
    }

    pub async fn get_user(&self, uid: &UserID) -> Option<User> {
        let res = self
            .session
            .query(
                "SELECT id, firebase_id, deviation, email, guest, handle, name, photo_url, rating, role
            FROM bughouse.users
            WHERE id = ?",
                (uid,),
            )
            .await
            .ok()?;
        if let Some(rows) = res.rows {
            for row in rows.into_typed::<User>() {
                // return Some(row?);
                return row.ok();
            }
        }
        eprintln!("DB.get_user failed: {}", uid);
        None
    }

    pub async fn mk_user_for_fid(&self, fid: &str) -> Result<User, Error> {
        println!("mk_user_for_fid {}", fid);
        let firebase_data = Self::fetch_firebase_data(fid)?;
        println!("firebase_data:\n{:?}", firebase_data);
        let (id, handle) = self.new_player_handle(&firebase_data).await?;
        let rating = Rating::default();
        let role = User::get_default_role(firebase_data.is_guest()) as i8;
        println!("Inserting into users...");
        let res = self.session
            .query(
              "INSERT INTO bughouse.users
               (id, firebase_id, deviation, email, guest, handle, name, rating, role)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    id,
                    &firebase_data.fid,
                    rating.deviation,
                    &firebase_data.email,
                    firebase_data.is_guest(),
                    &handle,
                    &firebase_data.display_name,
                    rating.rating,
                    role,
                ),
            )
            .await;
        if let Err(e) = res {
            println!("Insertion err: {:?}", e);
            return Err(e.into());
        }
        println!("Inserted: {}", id);
        self.add_rating(id, &rating).await?;
        let is_guest = firebase_data.is_guest();
        Ok(User {
            id,
            firebase_id: firebase_data.fid,
            handle,
            deviation: rating.deviation,
            email: firebase_data.email,
            guest: is_guest,
            name: firebase_data.display_name,
            photo_url: firebase_data.photo_url,
            rating: rating.rating,
            role,
        })
    }

    pub fn fetch_firebase_data(fid: &str) -> Result<FirebaseRowData, Error> {
        println!("Fetch firebase data...");
        let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
        write!(stream, "{}\n{}\n", FIRE_USER, fid)?;
        let mut resp = String::new();
        stream.read_to_string(&mut resp)?;
        println!("Response: {}", resp);
        let (kind, payload) = resp.trim_end().split_once(':').unwrap();
        match kind {
            "user" => {
                let parts: Vec<&str> = payload.split('\x1e').collect();
                if let [name, email, photo_url, provider_id] = parts[..] {
                    println!(
                        "name: {}\temail: {}, photo: {}, provider: {}",
                        name, email, photo_url, provider_id
                    );
                    Ok(FirebaseRowData {
                        fid: fid.to_string(),
                        display_name: name.to_string().none_if_empty(),
                        email: email.to_string().none_if_empty(),
                        photo_url: photo_url.to_string().none_if_empty(),
                        provider_id: provider_id.to_string().none_if_empty(),
                    })
                } else {
                    let err = format!("Couldn't parse: {}", payload);
                    Err(Error::FirebaseError(err))
                }
            }
            "err" => {
                eprintln!("err: {}", payload);
                Err(Error::FirebaseError(payload.to_string()))
            }
            _ => Err(Error::FirebaseError(format!(
                "UnknownKind: {}",
                payload.to_string()
            ))),
        }
    }

    pub async fn get_user_from_fid(&self, fid: &str) -> Result<User, Error> {
        let query_str = format!(
            "SELECT id, firebase_id, deviation, email, guest, handle, name, photo_url, rating, role
             FROM bughouse.users WHERE firebase_id = '{}'",
            fid
        );
        let res = self.session.query(query_str, &[]).await?;
        if let Some(rows) = res.rows {
            for row in rows.into_typed::<User>() {
                return Ok(row?);
            }
        }

        Err(Error::UnknownFirebaseID(fid.to_string()))
    }

    pub async fn user_from_firebase_id(
        &self,
        fid: &str,
    ) -> Result<User, Error> {
        let result = self.get_user_from_fid(fid).await;
        if let Err(Error::UnknownFirebaseID(_)) = result {
            Ok(self.mk_user_for_fid(fid).await?)
        } else {
            return result;
        }
    }

    // async fn get_user_rating_snapshot(
    //     &self,
    //     player: &UserID,
    // ) -> Result<UserRatingSnapshot, Error> {
    //     let res = self
    //         .session
    //         .query(
    //             "SELECT id, rating, deviation FROM bughouse.users
    //           WHERE id = '?'"
    //                 .to_string(),
    //             (&player,),
    //         )
    //         .await?;
    //     if let Some(rows) = res.rows {
    //         for rating in rows.into_typed::<UserRatingSnapshot>() {
    //             return Ok(rating?);
    //         }
    //     }
    //     Err(Error::Unexpected(
    //         "Couldn't get user rating snapshot".to_string(),
    //     ))
    // }

    // async fn rating_snapshots(
    //     &self,
    //     players: &GamePlayers,
    // ) -> Result<(BoardSnapshot, BoardSnapshot), Error> {
    //     let [[a_white, a_black], [b_white, b_black]] = players;
    //     let (aw, ab, bw, bb) = try_join!(
    //         self.get_user_rating_snapshot(a_white),
    //         self.get_user_rating_snapshot(a_black),
    //         self.get_user_rating_snapshot(b_white),
    //         self.get_user_rating_snapshot(b_black),
    //     )?;
    //     Ok(((aw, ab), (bw, bb)))
    // }

    pub fn to_move_key(duration: &Duration, board_id: BoardID) -> i32 {
        // let duration = Utc::now() - *game.get_start();
        let mut ms = duration.num_milliseconds() as i32;
        ms <<= 1;
        if board_id == BoardID::B {
            ms |= 0x1;
        }
        ms
    }

    // HSB => LSB
    //          6   6
    // move:   src|dest
    // drop: piece|dest (negative)
    pub async fn record_game_result(
        &self,
        game: Arc<RwLock<Game>>,
    ) -> Result<(), Error> {
        let rgame = game.read().unwrap();
        let val = GameRow::serialize_result(&rgame.get_result().unwrap());
        let res = self
            .session
            .query(
                "UPDATE bughouse.games SET result = ? WHERE id = ?",
                (val, rgame.get_id()),
            )
            .await;
        if let Err(e) = res {
            eprintln!("Error writing result to DB: {:?}", e);
            Err(e)?;
        }

        let [[aw, ab], [bw, bb]] = &rgame.players;
        let mut batch: Batch = Default::default();
        let prepared: PreparedStatement = self
            .session
            .prepare(
                "UPDATE bughouse.user_games SET result = ?
             WHERE uid = ? AND start_time = ? AND game_id = ?;",
            )
            .await?;
        for _i in 0..4 {
            batch.append_statement(prepared.clone());
        }
        let start = Self::to_timestamp(rgame.get_start().unwrap());
        let res2 = self
            .session
            .batch(
                &batch,
                (
                    (
                        val,
                        aw.as_ref().unwrap().read().unwrap().id,
                        start,
                        rgame.get_id(),
                    ),
                    (
                        val,
                        ab.as_ref().unwrap().read().unwrap().id,
                        start,
                        rgame.get_id(),
                    ),
                    (
                        val,
                        bw.as_ref().unwrap().read().unwrap().id,
                        start,
                        rgame.get_id(),
                    ),
                    (
                        val,
                        bb.as_ref().unwrap().read().unwrap().id,
                        start,
                        rgame.get_id(),
                    ),
                ),
            )
            .await;
        if let Err(e) = res2 {
            eprintln!("db.record_result user err: {:?}", e);
        }
        Ok(())
    }

    pub async fn record_ratings(
        &self,
        ratings: &[UserRating; 4],
    ) -> Result<(), Error> {
        println!("new ratings: {:?}", ratings);
        let now = Self::to_timestamp(Utc::now());
        let mut rows: [(UserID, ScyllaTimestamp, i16, i16); 4] =
            [(UserID::nil(), now, 0, 0); 4];
        for (i, user_rating) in ratings.iter().enumerate() {
            rows[i] = (
                user_rating.uid,
                now,
                user_rating.rating.rating,
                user_rating.rating.deviation,
            );
        }
        // Add a prepared query to the batch
        let mut batch: Batch = Default::default();
        let prepared: PreparedStatement = self.session.prepare(
            "INSERT INTO bughouse.rating_history (uid, time, rating, deviation) VALUES (?, ?, ?, ?)"
            ).await?;
        for _i in 0..4 {
            batch.append_statement(prepared.clone());
        }
        let res = self.session.batch(&batch, &rows[0..4]).await;
        if let Err(e) = res {
            eprintln!("batch error rating_history: {:?}", e);
        }

        let mut batch2: Batch = Default::default();
        let prepared2: PreparedStatement = self.session.prepare(
            "UPDATE bughouse.users SET rating = ?, deviation = ? WHERE id = ?"
            ).await?;
        for _i in 0..4 {
            batch2.append_statement(prepared2.clone());
        }
        let rating_rows: [(i16, i16, UserID); 4] = [
            ratings[0].to_row(),
            ratings[1].to_row(),
            ratings[2].to_row(),
            ratings[3].to_row(),
        ];
        let res2 = self.session.batch(&batch2, &rating_rows[0..4]).await;
        if let Err(e) = res2 {
            eprintln!("batch error users: {:?}", e);
        }
        Ok(())
    }

    pub async fn record_move(
        &self,
        duration: &Duration,
        game_id: &GameID,
        board_id: BoardID,
        mv: &BughouseMove,
    ) -> Result<(), Error> {
        let move_key = Self::to_move_key(duration, board_id);
        let move_val = GameRow::serialize_move(mv);
        println!("make_move: {}, {}", move_key, move_val);
        let res = self
            .session
            .query(
                "UPDATE bughouse.games SET moves[?] = ? WHERE id = ?"
                    .to_string(),
                (move_key, move_val, game_id),
            )
            .await;
        if let Err(e) = res {
            eprintln!("Error writing move to DB: {:?}", e);
        }
        Ok(())
    }

    async fn insert_game(
        &self,
        id: GameID,
        time: &ScyllaTimestamp,
        time_ctrl: &TimeControl,
        rated: bool,
        public: bool,
        rating_snapshots: &TableSnapshot,
    ) -> Result<GameID, Error> {
        self.session
            .query(
                "INSERT INTO bughouse.games
             (id, start_time, time_ctrl, rated, result, public, players)
              VALUES (?, ?, ?, ?, ?, ?, ?)"
                    .to_string(),
                (
                    id,
                    time,
                    time_ctrl,
                    rated,
                    -1 as i16,
                    public,
                    rating_snapshots,
                ),
            )
            .await?;
        Ok(id)
    }

    pub async fn sit(
        &self,
        game_id: &GameID,
        user_snaps: &TableSnapshot,
    ) -> Result<(), Error> {
        let query =
            "UPDATE bughouse.games SET players = ? WHERE id = ?".to_string();
        self.session.query(query, (user_snaps, game_id)).await?;
        Ok(())
    }

    pub async fn get_handles(
        &self,
        uids: Vec<UserID>,
    ) -> Result<HashMap<Uuid, String>, Error> {
        let res = self
            .session
            .query(
                "SELECT id, handle from bughouse.users WHERE id IN ?",
                (uids,),
            )
            .await?;
        if let Some(rows) = res.rows {
            let mut uid2handle: HashMap<UserID, String> = HashMap::new();
            for row in rows.into_typed::<(UserID, String)>() {
                let (uid, handle) = row?;
                uid2handle.insert(uid, handle);
            }
            return Ok(uid2handle);
        }
        return Err(Error::Unexpected("Could not get user handles".into()));
    }

    fn user_rows(game: Arc<RwLock<Game>>) -> [IntoUserGameRow; 4] {
        let rgame = game.read().unwrap();
        let start = rgame.get_start().unwrap();
        let game_players = rgame.get_players();
        let players = Game::get_rating_snapshots(game_players);
        let mut rows: [IntoUserGameRow; 4] =
            [UserGameRow::default().into_row(); 4];
        for (idx, player) in Players::new(rgame.get_players())
            .get_players()
            .iter()
            .enumerate()
        {
            rows[idx] = UserGameRow {
                uid: player.get_uid(),
                start_time: Duration::milliseconds(start.timestamp_millis()),
                game_id: *rgame.get_id(),
                result: -1,
                rated: rgame.rated,
                players: players.clone(),
            }
            .into_row();
        }
        rows
    }

    pub async fn start_game(
        &self,
        game: Arc<RwLock<Game>>,
    ) -> Result<QueryResult, Error> {
        let clone = game.clone();
        let rgame = clone.read().unwrap();
        let game_id = rgame.get_id();
        let start = rgame.get_start().unwrap();
        let query = "UPDATE bughouse.games SET start_time = ? WHERE id = ?";
        let res = self
            .session
            .query(query.to_string(), (&Self::to_timestamp(start), game_id))
            .await?;

        let mut batch: Batch = Default::default();
        let prepared: PreparedStatement = self
            .session
            .prepare(
                "INSERT INTO bughouse.user_games
            (uid, start_time, game_id, result, rated, players) VALUES
            (?,   ?,          ?,       ?,      ?,     ?)",
            )
            .await?;
        for _i in 0..4 {
            batch.append_statement(prepared.clone());
        }
        let rows = Self::user_rows(game);
        let res2 = self.session.batch(&batch, &rows[0..4]).await;
        if let Err(e) = res2 {
            eprintln!("db.start_game err: {:?}", e);
        }
        Ok(res)
    }

    pub async fn form_table(
        &self,
        time_ctrl: &TimeControl,
        rated: bool,
        public: bool,
        rating_snapshots: &TableSnapshot,
    ) -> Result<GameID, Error> {
        let id: GameID = self.uuid_from_time(Utc::now())?;
        let zero_time = ScyllaTimestamp(Duration::zero());
        self.insert_game(
            id,
            &zero_time,
            time_ctrl,
            rated,
            public,
            rating_snapshots,
        )
        .await
    }

    pub async fn create_game(
        &self,
        start: DateTime<Utc>,
        time_ctrl: &TimeControl,
        rated: bool,
        rating_snapshots: &TableSnapshot,
    ) -> Result<GameID, Error> {
        let id: GameID = self.uuid_from_time(start)?;
        self.insert_game(
            id,
            &Self::to_timestamp(start),
            time_ctrl,
            rated,
            false, // public is only relevant to "tables" (unstarted games)
            rating_snapshots,
        )
        .await
    }
}
