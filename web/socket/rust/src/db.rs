use bughouse::{
    BoardID, BughouseMove, Piece, Square, ALL_PIECES, ALL_SQUARES, NUM_PIECES,
    NUM_SQUARES,
};
use chrono::prelude::*;
use chrono::Duration;
use noneifempty::NoneIfEmpty;
use scylla::batch::Batch;
use scylla::cql_to_rust::{FromCqlVal, FromRow};
use scylla::frame::value::Timestamp as ScyllaTimestamp;
use scylla::macros::{FromRow, FromUserType, IntoUserType};
use scylla::prepared_statement::PreparedStatement;
use scylla::query::Query;
use scylla::statement::Consistency;
use scylla::transport::connection::QueryResult;
use scylla::transport::session::{IntoTypedRows, Session};
use scylla::SessionBuilder;
use std::env;
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::sync::{Arc, RwLock};
use uuid::v1::{Context, Timestamp};
use uuid::Uuid;

use crate::b66::B66;
use crate::connection_mgr::UserID;
use crate::error::Error;
use crate::firebase::*;
use crate::game::{Game, GameID};
use crate::guest::guest_handle::GuestHandle;
use crate::rating::Rating;
use crate::time_control::TimeControl;
use crate::users::User;

const DEFAULT_URI: &str = "127.0.0.1:9042";

pub struct Db {
    session: Session,
    ctx: Context,
}

// #[derive(Clone, FromRow, IntoUserType, FromUserType)]
// pub struct UserRatingRow {
//     pub uid: UserID,
//     pub time: DateTime<Utc>,
//     pub deviation: i16,
//     pub rating: i16,
// }

#[derive(Debug, FromRow)]
pub struct FirebaseRowData {
    fid: String,
    display_name: Option<String>,
    email: Option<String>,
    photo_url: Option<String>,
    provider_id: Option<String>,
}

// User's GLICKO rating snapshot before game start
#[derive(Clone, Debug, FromRow, IntoUserType, FromUserType)]
pub struct UserRatingSnapshot {
    pub uid: UserID,
    pub rating: i16,
    pub deviation: i16,
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

impl From<Option<Arc<RwLock<User>>>> for UserRatingSnapshot {
    fn from(maybe_user: Option<Arc<RwLock<User>>>) -> Self {
        match maybe_user {
            None => UserRatingSnapshot {
                uid: Uuid::nil(),
                rating: 0,
                deviation: 0,
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
            deviation: user.deviation,
        }
    }
}

pub type BoardSnapshot = (UserRatingSnapshot, UserRatingSnapshot);
pub type TableSnapshot = (BoardSnapshot, BoardSnapshot);

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
    //  [applied] | handle     | id
    // -----------+------------+--------------------------------------
    //      False | Player_XYZ | 8ac88980-d963-11eb-bb7e-000000000002
    //
    async fn new_player_handle(
        &self,
        is_guest: bool,
    ) -> Result<(Uuid, String), Error> {
        let uuid = self.now()?;
        let handle = if is_guest {
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
            "INSERT INTO bughouse.handles (handle, id) VALUES (?, ?) IF NOT EXISTS".to_string()
            );
        query.set_consistency(Consistency::One);
        query.set_serial_consistency(Some(Consistency::Serial));
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
                (uid, time, rating, deviation) VALUES (?, ?, ?, ?)",
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

    pub async fn get_user(&self, uid: &UserID) -> Option<User> {
        let res = self
            .session
            .query(
                "SELECT (id, firebase_id, deviation, email, guest, handle, name, photo_url, rating)
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
        None
    }

    pub async fn mk_user_for_fid(&self, fid: &str) -> Result<User, Error> {
        println!("mk_user_for_fid {}", fid);
        let firebase_data = Self::fetch_firebase_data(fid)?;
        let is_guest =
            firebase_data.provider_id == Some("anonymous".to_string());
        println!("firebase_data:\n{:?}", firebase_data);
        let (id, handle) = self.new_player_handle(is_guest).await?;
        let rating = Rating::default();
        println!("Inserting into firebase_user...");
        self.session
            .query(
                "INSERT INTO bughouse.firebase_users
               (firebase_id, uid)
               VALUES (?, ?)",
                (&firebase_data.fid, id),
            )
            .await?;
        println!("Inserting into users...");
        self.session
            .query(
                "INSERT INTO bughouse.users
               (id, firebase_id, deviation, email, guest, handle, name, rating)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    id,
                    &firebase_data.fid,
                    rating.get_deviation(),
                    &firebase_data.email,
                    is_guest,
                    &handle,
                    &firebase_data.display_name,
                    rating.get_rating(),
                ),
            )
            .await?;
        println!("Inserted");
        self.add_rating(id, &rating).await?;
        Ok(User {
            id,
            firebase_id: firebase_data.fid,
            handle,
            deviation: rating.get_deviation(),
            email: firebase_data.email,
            guest: is_guest,
            name: firebase_data.display_name,
            photo_url: firebase_data.photo_url,
            rating: rating.get_rating(),
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

    pub async fn user_from_firebase_id(
        &self,
        fid: &str,
    ) -> Result<User, Error> {
        println!("user_from_firebase_id: {}", fid);
        let query_str = format!(
            "SELECT id, firebase_id, deviation, email, guest, handle, name, photo_url, rating
             FROM bughouse.users WHERE firebase_id = '{}'",
            fid
        );
        println!("Querying session...");
        let res = self.session.query(query_str, &[]).await?;
        if let Some(rows) = res.rows {
            for row in rows.into_typed::<User>() {
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

    pub async fn record_game_result(
        &self,
        game: Arc<RwLock<Game>>,
    ) -> Result<(), Error> {
        let rgame = game.read().unwrap();
        let result = rgame.get_result().unwrap();
        // TODO implement serialization
        let val: i16 = result.board as i16
            | ((result.winner as i16) << 1)
            | ((result.kind as i16) << 2);
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
        Ok(())
    }

    pub async fn record_ratings(
        &self,
        ratings: &[UserRatingSnapshot; 4],
    ) -> Result<(), Error> {
        println!("new ratings: {:?}", ratings);
        let now = Self::to_timestamp(Utc::now());
        let mut rows: [(UserID, ScyllaTimestamp, i16, i16); 4] =
            [(UserID::nil(), now, 0, 0); 4];
        for (i, snap) in ratings.iter().enumerate() {
            rows[i] = (snap.uid, now, snap.rating, snap.deviation);
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
        let res2 = self
            .session
            .batch(
                &batch2,
                (
                    (ratings[0].rating, ratings[0].deviation, ratings[0].uid),
                    (ratings[1].rating, ratings[1].deviation, ratings[1].uid),
                    (ratings[2].rating, ratings[2].deviation, ratings[2].uid),
                    (ratings[3].rating, ratings[3].deviation, ratings[3].uid),
                ),
            )
            .await;
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
        let move_val = Self::serialize_move(mv);
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
        rating_snapshots: &TableSnapshot,
    ) -> Result<GameID, Error> {
        self.session
            .query(
                "INSERT INTO bughouse.games
             (id, start_time, time_ctrl, rated, players)
              VALUES (?, ?, ?, ?, ?)"
                    .to_string(),
                (id, time, time_ctrl, rated, rating_snapshots),
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

    pub async fn start_game(
        &self,
        start: DateTime<Utc>,
        game_id: &GameID,
    ) -> Result<QueryResult, Error> {
        let query = "UPDATE bughouse.games SET start_time = ? WHERE id = ?";
        let res = self
            .session
            .query(query.to_string(), (&Self::to_timestamp(start), game_id))
            .await?;
        Ok(res)
    }

    pub async fn form_table(
        &self,
        time_ctrl: &TimeControl,
        rated: bool,
        rating_snapshots: &TableSnapshot,
    ) -> Result<GameID, Error> {
        let id: GameID = self.uuid_from_time(Utc::now())?;
        let zero_time = ScyllaTimestamp(Duration::zero());
        self.insert_game(id, &zero_time, time_ctrl, rated, rating_snapshots)
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
            rating_snapshots,
        )
        .await
    }
}

#[cfg(test)]
mod test {
    use super::*;

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
            let mv_num = Db::serialize_move(&mv);
            assert!(*expected_num == mv_num);
            let dmv = Db::deserialize_move(mv_num);
            assert!(*mv == dmv);
        }
    }
}
