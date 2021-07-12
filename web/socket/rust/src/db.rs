use bughouse::{BoardID, BughouseMove};
use chrono::Duration;
use chrono::prelude::*;
use noneifempty::NoneIfEmpty;
use scylla::SessionBuilder;
use scylla::cql_to_rust::{FromCqlVal, FromRow};
use scylla::frame::value::Timestamp as ScyllaTimestamp;
use scylla::macros::{FromRow, FromUserType, IntoUserType};
use scylla::query::Query;
use scylla::statement::Consistency;
use scylla::transport::session::{IntoTypedRows, Session};
use std::env;
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::{Arc, RwLock};
use uuid::Uuid;
use uuid::v1::{Context, Timestamp};

use crate::b73::B73;
use crate::connection_mgr::UserID;
use crate::error::Error;
use crate::firebase::*;
use crate::game::GameID;
use crate::rating::Rating;
use crate::time_control::TimeControl;
use crate::users::User;

const DEFAULT_URI: &str = "127.0.0.1:9042";

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

#[derive(Clone, Debug, FromRow, IntoUserType, FromUserType)]
pub struct UserRowData {
    id: Option<Uuid>,
    firebase_id: Option<String>,
    handle: Option<String>,
    deviation: Option<i16>,
    email: Option<String>,
    name: Option<String>,
    photo_url: Option<String>,
    rating: Option<i16>,
}

// User's GLICKO rating snapshot before game start
#[derive(Clone, Debug, FromRow, IntoUserType, FromUserType)]
pub struct UserRatingSnapshot {
    user_id: UserID,
    rating: i16,
    deviation: i16,
}

impl From<Arc<RwLock<User>>> for UserRatingSnapshot {
    fn from(user_lock: Arc<RwLock<User>>) -> Self {
        let user = user_lock.read().unwrap();
        UserRatingSnapshot {
            user_id: user.get_uid(),
            rating: user.get_rating(),
            deviation: user.get_deviation(),
        }
    }
}

impl From<&User> for UserRatingSnapshot {
    fn from(user: &User) -> Self {
        UserRatingSnapshot {
            user_id: user.get_uid(),
            rating: user.get_rating(),
            deviation: user.get_deviation(),
        }
    }
}

pub type BoardSnapshot = (UserRatingSnapshot, UserRatingSnapshot);
pub type PregameRatingSnapshot = (BoardSnapshot, BoardSnapshot);

impl UserRowData {
    pub fn get_uid(&self) -> Uuid {
        self.id.unwrap()
    }

    pub fn get_firebase_id(&self) -> String {
        self.firebase_id.as_ref().unwrap().clone()
    }

    pub fn get_handle(&self) -> String {
        self.handle.as_ref().unwrap().clone()
    }

    pub fn get_email(&self) -> Option<String> {
        self.email.clone()
    }

    pub fn get_name(&self) -> Option<String> {
        self.name.clone()
    }

    pub fn get_rating(&self) -> i16 {
        self.rating.unwrap()
    }

    pub fn get_deviation(&self) -> i16 {
        self.deviation.unwrap()
    }

    pub fn get_photo_url(&self) -> Option<String> {
        self.photo_url.clone()
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

    // cqlsh:bughouse> INSERT INTO handles (id, handle) VALUES (now(), 'Guest_XYZ') IF NOT EXISTS;
    //
    //  [applied] | handle | id
    // -----------+--------+------
    //       True |   null | null
    //
    // cqlsh:bughouse> INSERT INTO handles (id, handle) VALUES (now(), 'Guest_XYZ') IF NOT EXISTS;
    //
    //  [applied] | handle    | id
    // -----------+-----------+--------------------------------------
    //      False | Guest_XYZ | 8ac88980-d963-11eb-bb7e-000000000002
    //
    async fn new_guest_handle(&self) -> Result<(Uuid, String), Error> {
        let uuid = self.now()?;
        let handle =
            format!("Guest_{}", B73::encode_num(uuid.as_fields().0 as u128));
        let mut query = Query::new(
            "INSERT INTO bughouse.handles (handle, id) VALUES (?, ?) IF NOT EXISTS".to_string()
            );
        query.set_consistency(Consistency::One);
        query.set_serial_consistency(Some(Consistency::Serial));
        self.session.query(query, (&handle, uuid)).await?;
        Ok((uuid, handle))
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

    pub fn to_timestamp(time: DateTime<Utc>) -> ScyllaTimestamp {
        ScyllaTimestamp(Duration::milliseconds(time.timestamp_millis()))
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
                (user_id, time, rating, deviation) VALUES (?, ?, ?, ?)",
                (
                    id,
                    Self::to_timestamp(Utc::now()),
                    rating.get_rating(),
                    rating.get_deviation(),
                ),
            )
            .await;
        if res.is_err() {
            eprintln!("Couldn't insert rating: {:?}", res);
        }
        res?;
        Ok(())
    }

    pub async fn get_user(&self, uid: &UserID) -> Option<UserRowData> {
        let res = self
            .session
            .query(
                "SELECT (id, firebase_id, handle, deviation, email, name, photo_url, rating)
            FROM bughouse.users
            WHERE id = ?"
                    .to_string(),
                (uid,),
            )
            .await
            .ok()?;
        if let Some(rows) = res.rows {
            for row in rows.into_typed::<UserRowData>() {
                // return Some(row?);
                return row.ok();
            }
        }
        None
    }

    pub async fn mk_user_for_fid(
        &self,
        fid: &str,
    ) -> Result<UserRowData, Error> {
        println!("mk_user_for_fid {}", fid);
        let firebase_data = Db::fetch_firebase_data(fid)?;
        let (id, handle) = self.new_guest_handle().await?;
        let rating = Rating::default();
        self.session
            .query(
                "INSERT INTO bughouse.users
               (id, firebase_id, handle, deviation, email, name, rating)
               VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    id,
                    &firebase_data.fid,
                    &handle,
                    rating.get_deviation(),
                    &firebase_data.email,
                    &firebase_data.display_name,
                    rating.get_rating(),
                ),
            )
            .await?;
        self.add_rating(id, &rating).await?;
        Ok(UserRowData {
            id: Some(id),
            firebase_id: Some(firebase_data.fid),
            name: firebase_data.display_name,
            handle: Some(handle),
            rating: Some(rating.get_rating()),
            deviation: Some(rating.get_deviation()),
            photo_url: firebase_data.photo_url,
            email: firebase_data.email,
        })
    }

    pub fn fetch_firebase_data(fid: &str) -> Result<FirebaseRowData, Error> {
        println!("Fetch firebase data...");
        let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
        write!(stream, "{}\n{}\n", FIRE_USER, fid)?;
        let mut resp = String::new();
        stream.read_to_string(&mut resp)?;
        println!("Response: {}", resp);
        let (kind, payload) = resp.split_once(':').unwrap();
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

    pub async fn user_from_firebase_id(
        &self,
        fid: &str,
    ) -> Result<UserRowData, Error> {
        println!("user_from_firebase_id: {}", fid);
        let query_str = format!(
            "SELECT id, firebase_id, handle, deviation, email, name, photo_url, rating
             FROM bughouse.users WHERE firebase_id = '{}'",
            fid
        );
        println!("Querying session...");
        let res = self.session.query(query_str, &[]).await?;
        if let Some(rows) = res.rows {
            for row in rows.into_typed::<UserRowData>() {
                println!("got a row: {:?}", row);
                return Ok(row?);
            }
        }
        println!("no rows");
        Ok(self.mk_user_for_fid(fid).await?)
    }

    // async fn get_user_rating_snapshot(
    //     &self,
    //     player: &UserID,
    // ) -> Result<UserRatingSnapshot, Error> {
    //     let res = self
    //         .session
    //         .query(
    //             "SELECT user_id, rating, deviation FROM bughouse.users
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

    pub fn to_move_key(duration: &Duration, board_id: BoardID) -> i16 {
        // let duration = Utc::now() - *game.get_start();
        let mut ms = duration.num_milliseconds() as i16;
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
    pub fn serialize_move(mv: &BughouseMove) -> i16 {
        let res = mv.get_dest().to_int() as i16;
        match mv.get_source() {
            None => -(res | (mv.get_piece().unwrap().to_index() as i16) << 6),
            Some(src) => (src.to_index() as i16) << 6 | res,
        }
    }

    pub async fn record_move(
        &self,
        duration: &Duration,
        game_id: &GameID,
        board_id: BoardID,
        mv: &BughouseMove,
    ) -> Result<(), Error> {
        let move_key = Self::to_move_key(duration, board_id);
        let move_val = Self::serialize_move(mv);
        let _res = self
            .session
            .query(
                "UPDATE bughouse.games SET moves[?] = ? WHERE id = ?"
                    .to_string(),
                (move_key, move_val, game_id),
            )
            .await?;
        Ok(())
    }

    pub async fn create_game(
        &self,
        start: DateTime<Utc>,
        time_ctrl: &TimeControl,
        rating_snapshots: &PregameRatingSnapshot,
    ) -> Result<GameID, Error> {
        let id: GameID = self.uuid_from_time(start)?;
        // let rating_snapshots = self.rating_snapshots(players).await?;
        self.session
            .query(
                "INSERT INTO bughouse.games 
             (id, start_time, time_ctrl, boards)
              VALUES (?, ?, ?, ?)"
                    .to_string(),
                (&id, Self::to_timestamp(start), time_ctrl, rating_snapshots),
            )
            .await?;
        Ok(id)
    }
}
