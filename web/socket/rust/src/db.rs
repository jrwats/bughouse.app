use chrono::prelude::*;
use chrono::Duration;
use noneifempty::NoneIfEmpty;
use scylla::cql_to_rust::{FromCqlVal, FromRow};
use scylla::macros::{FromRow, FromUserType, IntoUserType};
use scylla::query::Query;
use scylla::statement::Consistency;
use scylla::transport::session::{IntoTypedRows, Session};
use scylla::SessionBuilder;
use std::env;
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use uuid::v1::{Context, Timestamp};
use uuid::Uuid;

use crate::b73_encode::b73_encode;
use crate::error::Error;
use crate::firebase::*;
use crate::game::{GameID, GamePlayers};
use crate::time_control::TimeControl;

const DEFAULT_URI: &str = "127.0.0.1:9042";
const GAME_SECS_IN_FUTURE: i64 = 5;

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
    name: Option<String>,
    handle: Option<String>,
    photo_url: Option<String>,
}

impl UserRowData {
    pub fn get_uid(&self) -> Uuid {
        self.id.unwrap()
    }

    pub fn get_handle(&self) -> &str{
        &self.handle.as_ref().unwrap()
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
        let handle = format!("Guest_{}", b73_encode(uuid.as_fields().0));

        let mut query = Query::new(
            "INSERT INTO bughouse.handles (handle, id) VALUES (?, ?) IF NOT EXISTS".to_string()
            );
        query.set_consistency(Consistency::One);
        query.set_serial_consistency(Some(Consistency::Serial));
        self.session.query(query, (&handle, uuid)).await?;
        Ok((uuid, handle))
    }

    pub fn uuid_from_time(&self, time: DateTime<Utc>) -> Result<uuid::Uuid, uuid::Error> {
        let ns = time.timestamp_subsec_nanos();
        let secs = time.timestamp() as u64;
        let timestamp = Timestamp::from_unix(&self.ctx, secs, ns);
        Uuid::new_v1(timestamp, &[1, 3, 3, 7, 4, 2])
    }

    pub fn now(&self) -> Result<uuid::Uuid, uuid::Error> {
        self.uuid_from_time(Utc::now())
    }

    pub async fn mk_user_for_fid(
        &self,
        fid: &str,
    ) -> Result<UserRowData, Error> {
        let firebase_data = Db::fetch_firebase_data(fid)?;
        let (id, handle) = self.new_guest_handle().await?;
        self.session
            .query(
                "INSERT INTO bughouse.users
               (id, firebase_id, name, handle) VALUES (?, ?, ?, ?)",
                (
                    id,
                    &firebase_data.fid,
                    &firebase_data.display_name,
                    &handle,
                ),
            )
            .await?;
        Ok(UserRowData {
            id: Some(id),
            firebase_id: Some(firebase_data.fid),
            name: firebase_data.display_name,
            handle: Some(handle),
            photo_url: firebase_data.photo_url,
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
        let query_str = format!(
            "SELECT id, firebase_id, name, handle, photo_url
             FROM bughouse.users WHERE firebase_id = '{}'",
            fid
        );
        let res = self.session.query(query_str, &[]).await?;
        if let Some(rows) = res.rows {
            for row in rows.into_typed::<UserRowData>() {
                return Ok(row?);
            }
        }
        Ok(self.mk_user_for_fid(fid).await?)
    }

    pub async fn create_game(
        &self,
        time_ctrl: &TimeControl,
        players: &GamePlayers
        ) -> Result<(GameID, DateTime<Utc>), Error> {
        let start = Utc::now() + Duration::seconds(GAME_SECS_IN_FUTURE);
        let id: GameID = self.uuid_from_time(start)?;
        let mut query = Query::new(
            "INSERT INTO bughouse.games 
             (id, start_time, time_ctrl, boards) VALUES (?, ?, ?, ?)".to_string()
            );
        self.session.query(query, (&id, start, time_ctrl, uuid)).await?;
        Ok((game_id, start))
    }

}
