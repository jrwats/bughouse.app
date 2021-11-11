use crate::b66::B66;
use crate::db::{Db, UserRatingSnapshot};
use crate::error::Error;
use crate::game::GameID;
use crate::game_row::UserGameRow;
use crate::users::UserID;
use chrono::prelude::*;
use chrono::Duration;
use scylla::cql_to_rust::{FromCqlVal, FromRow};
use scylla::macros::{FromRow, FromUserType, IntoUserType};
use scylla::transport::session::IntoTypedRows;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use uuid::Uuid;

use async_graphql::Object;

#[derive(Clone, Debug, FromRow, IntoUserType, FromUserType)]
pub struct CompleteRatingSnapshot {
    pub rating: i16,
    pub id: UserID,
    pub handle: String,
}

#[Object]
impl CompleteRatingSnapshot {
    async fn rating(&self) -> i16 {
        self.rating
    }

    async fn handle(&self) -> &str {
        &self.handle
    }

    async fn id(&self) -> String {
        B66::encode_uuid(&self.id)
    }
}

pub type CompleteRatingSnapshots = (
    (CompleteRatingSnapshot, CompleteRatingSnapshot),
    (CompleteRatingSnapshot, CompleteRatingSnapshot),
);

#[derive(Clone, FromRow, FromUserType)]
pub struct CompleteGameRow {
    pub uid: UserID,
    pub start_time: Duration,
    pub game_id: GameID,
    pub result: i16,
    pub rated: bool,
    pub players: CompleteRatingSnapshots,
}

pub struct UserGamesFetcher {
    db: Arc<Db>,
}

#[derive(PartialEq, Clone, Copy)]
pub enum TimeComp {
    Older,
    Newer,
}

impl TimeComp {
    pub fn get_op(&self) -> &'static str {
        match &self {
            TimeComp::Older => "<",
            TimeComp::Newer => ">",
        }
    }
}

impl UserGamesFetcher {
    pub fn new(db: Arc<Db>) -> Self {
        Self { db }
    }

    pub fn complete_game_row(
        row: &UserGameRow,
        uid2handle: &HashMap<UserID, String>,
    ) -> CompleteGameRow {
        let ((aw, ab), (bw, bb)) = row.players;
        let c = |s: UserRatingSnapshot| CompleteRatingSnapshot {
            id: s.uid,
            rating: s.rating,
            handle: if let Some(handle) = uid2handle.get(&s.uid) {
                handle.clone()
            } else {
                eprintln!("No handle found for {}", s.uid);
                "<None>".into()
            },
        };
        CompleteGameRow {
            uid: row.uid,
            start_time: row.start_time,
            result: row.result,
            game_id: row.game_id,
            rated: row.rated,
            players: ((c(aw), c(ab)), (c(bw), c(bb))),
        }
    }

    pub async fn total_count(
        &self,
        uid: &Uuid,
    ) -> Result<usize, Error> {
        // Over-fetch our user_games by 1 to calculate "has more"
        let query = "SELECT COUNT(*) FROM bughouse.user_games WHERE uid = ?";
        let res = self.db.session().query(query, (uid,)).await?;
        if let Some(rows) = res.rows {
            let row = rows.into_typed::<(i64,)>().next();
            // let (size,) = row.unwrap()?;
            // return Ok(size as usize)
            return Ok(row.unwrap()?.0 as usize)
        }
        Err(Error::Unexpected("WUT?".into()))
    }

    pub async fn get_chunk(
        &self,
        uid: &Uuid,
        cursor: Option<DateTime<Utc>>,
        maybe_count: Option<usize>,
        comparison: TimeComp,
    ) -> Result<(Vec<CompleteGameRow>, bool), Error> {
        let query = format!(
            "SELECT uid, start_time, game_id, result, rated, players
            FROM bughouse.user_games
            WHERE uid = ?
            AND start_time {} ?
            ORDER BY start_time DESC
            LIMIT ?",
            comparison.get_op(),
        );
        let cursor_time =
            Db::to_timestamp(cursor.unwrap_or_else(|| Utc::now()));
        let count = maybe_count.map_or(100, |u| u as i32);

        // Over-fetch our user_games by 1 to calculate "has more"
        let res = self
            .db
            .session()
            .query(query, (uid, cursor_time, count + 1))
            .await?;

        if let Some(rows) = res.rows {
            let len = rows.len();
            let max = std::cmp::min(count as usize, len);
            let mut user_games = Vec::with_capacity(max);
            for row in rows.into_typed::<UserGameRow>().take(max) {
                user_games.push(row?);
            }
            if user_games.is_empty() {
                return Ok((vec![], false));
            }

            // TODO: Cache uid => handle in REDIS to avoid double hop?
            let mut uids: HashSet<UserID> = HashSet::new();
            for user_game in &user_games {
                let ((aw, ab), (bw, bb)) = user_game.players;
                for s in [aw, ab, bw, bb].iter() {
                    uids.insert(s.uid);
                }
            }
            let uid2handle = self
                .db
                .get_handles(&uids.into_iter().collect::<Vec<UserID>>())
                .await?;
            let complete_games = user_games
                .iter()
                .map(|g| Self::complete_game_row(g, &uid2handle))
                .collect();
            Ok((complete_games, len > count as usize))
        } else {
            Ok((vec![], false))
        }
    }
}
