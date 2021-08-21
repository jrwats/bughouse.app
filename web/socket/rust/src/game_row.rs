use chrono::prelude::*;
use chrono::Duration;
use scylla::cql_to_rust::{FromCqlVal, FromRow};
use scylla::frame::value::Timestamp;
use scylla::macros::{FromRow, FromUserType, IntoUserType};

use scylla::frame::response::result::CqlValue;
// use scylla::frame::value::{Date, Time, Timestamp};
use scylla::transport::session::{IntoTypedRows, Session};

use serde_json::{json, Value};
use std::collections::HashMap;

use crate::db::TableSnapshot;
use crate::game::GameID;
use crate::time_control::TimeControl;

#[derive(Clone, FromRow, IntoUserType)]
pub struct GameRow {
    pub id: GameID,
    // pub start_time: Duration,
    pub result: i16,
    pub time_ctrl: TimeControl,
    pub rated: bool,
    pub players: TableSnapshot,
    pub moves: HashMap<i32, i16>,
}

impl GameRow {
    pub fn to_json(&self) -> Value {
        json!({})
    }
}
