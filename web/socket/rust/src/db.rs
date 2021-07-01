use chrono::prelude::*;
use noneifempty::NoneIfEmpty;
use scylla::cql_to_rust::FromRow;
use scylla::macros::FromRow;
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

#[derive(Clone, Debug, FromRow)]
pub struct UserRowData {
    uid: Uuid,
    firebase_id: String,
    name: Option<String>,
    handle_id: Uuid,
    photo_id: Option<Uuid>,
}

impl UserRowData {
    pub fn get_uid(&self) -> Uuid {
        self.uid
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
        let uuid = Uuid::new_v4();
        let handle = format!("Guest_{}", b73_encode(uuid.as_fields().0));
        let _res = self.session.query(
           "INSERT INTO bughouse.handles (id, handle) VALUES(?) IF NOT EXISTS",
           (uuid, &handle)
           ).await?;
        Ok((uuid, handle))
    }

    pub fn now(&self) -> Result<uuid::Uuid, uuid::Error> {
        let utc_now = Utc::now();
        let ns = utc_now.timestamp_subsec_nanos();
        let secs = utc_now.timestamp() as u64;
        let timestamp = Timestamp::from_unix(&self.ctx, secs, ns);
        Uuid::new_v1(timestamp, &[1, 3, 3, 7, 4, 2])
    }

    pub async fn mk_user_for_fid(
        &self,
        fid: &str,
    ) -> Result<UserRowData, Error> {
        let firebase_data = Db::fetch_firebase_data(fid)?;
        let (handle_id, _handle) = self.new_guest_handle().await?;
        let uid = self.now()?;
        let res = self
            .session
            .query(
                "INSERT INTO bughouse.users
               (id, firebase_id, name, handle_id) VALUES(?)",
                (
                    uid,
                    &firebase_data.fid,
                    &firebase_data.display_name,
                    handle_id,
                ),
            )
            .await?;
        println!("mk_user_for_fid: {:?}", res);
        let row = &res.rows.unwrap()[0];
        println!("row: {:?}", row);
        Ok(UserRowData {
            uid,
            firebase_id: firebase_data.fid,
            name: firebase_data.display_name,
            handle_id,
            photo_id: None,
        })
    }

    pub fn fetch_firebase_data(fid: &str) -> Result<FirebaseRowData, Error> {
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
        let query_str =
            format!("SELECT * FROM bughouse.users WHERE firebase_id = {}", fid);
        let res = self.session.query(query_str, &[]).await?;
        if let Some(rows) = res.rows {
            // let urows = rows.into_typed::<UserRowData>();
            // let user = urows.nth(0).unwrap();
            for row in rows.into_typed::<UserRowData>() {
                return Ok(row?);
            }
            return Err(Error::Unexpected("WTF no row?".to_string()));
        } else {
            Ok(self.mk_user_for_fid(fid).await?)
        }
    }
}
