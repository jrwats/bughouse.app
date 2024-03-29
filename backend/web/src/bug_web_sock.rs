use actix::prelude::*;
// use actix::ResponseFuture;
use actix_web::*;
use actix_web_actors::ws;
use bughouse::{BughouseMove, ALL_COLORS, BOARD_IDS};
use bytestring::ByteString;
use chrono::prelude::*;
use serde_json::{json, Value};
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::b66::B66;
use crate::bughouse_server::BughouseServer;
use crate::connection_mgr::{ConnID, ConnectionMgr};
use crate::db::Db;
use crate::error::Error;
use crate::game::GameID;
use crate::messages::{
    ClientMessage, ClientMessageKind, ServerMessage, ServerMessageKind,
};
use crate::seeks::seeks::SeekPool;
use crate::time_control::TimeControl;
use crate::users::Users;

pub fn get_timestamp_ns() -> u64 {
    Utc::now().timestamp_nanos() as u64
}

/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const ENQ_INTERVAL: Duration = Duration::from_secs(5);
/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Clone)]
pub struct BugContext {
    pub srv_recipient: Recipient<ServerMessage>,
    pub server: &'static BughouseServer,
    pub db: Arc<Db>,
    pub users: Arc<Users>,
}

impl BugContext {
    pub fn create(
        srv_recipient: Recipient<ServerMessage>,
        server: &'static BughouseServer,
        db: Arc<Db>,
        users: Arc<Users>,
    ) -> Self {
        BugContext {
            srv_recipient,
            server,
            db,
            users,
        }
    }

    pub fn get_srv_recipient(&self) -> &Recipient<ServerMessage> {
        &self.srv_recipient
    }

    pub fn get_db(&self) -> Arc<Db> {
        self.db.clone()
    }
}

pub struct BugWebSock {
    /// Client must send ping at least once per 10 seconds (CLIENT_TIMEOUT),
    /// otherwise we drop connection.
    hb_instant: Instant,
    data: web::Data<BugContext>,
    // srv_recipient: Recipient<ServerMessage>,
    // server: &'static BughouseServer,
    /// unique session id
    id: ConnID,
}

impl Actor for BugWebSock {
    type Context = ws::WebsocketContext<Self>;

    /// Method is called on actor start. We start the heartbeat process here.
    fn started(&mut self, ctx: &mut Self::Context) {
        self.on_start(ctx);
    }

    fn stopped(&mut self, ctx: &mut Self::Context) {
        eprintln!("WS stopped: {}", self.id);
        self.data.server.on_close(&ctx.address().recipient());
    }
}

/// BughouseSever sends these messages to Socket session
impl actix::Handler<ClientMessage> for BugWebSock {
    type Result = ();
    fn handle(
        &mut self,
        msg: ClientMessage,
        ctx: &mut Self::Context,
    ) -> Self::Result {
        match msg.kind {
            ClientMessageKind::Auth(conn_id) => {
                println!("Auth({})", conn_id);
                self.id = conn_id;
                let maybe_user = self.data.server.user_from_conn(conn_id);
                ctx.text("authenticated".to_string());
                if let Some(user) = maybe_user {
                    let ruser = user.read().unwrap();
                    // TODO - rethink - emulating old FICS login auth
                    let msg = json!({
                        "kind": "login",
                        "uid": B66::encode_uuid(&ruser.id),
                        "fid": ruser.firebase_id,
                        "handle": ruser.handle,
                        "rating": ruser.rating,
                        "deviation": ruser.deviation,
                        "guest": ruser.guest,
                        "role": ruser.role,
                    });
                    println!("Sending 'login': {}", msg);
                    ctx.text(msg.to_string());
                }
            }
            ClientMessageKind::Text(json) => {
                ctx.text(json.to_string());
            }
            ClientMessageKind::Empty => {
                eprintln!("We don't expect to receive EMPTY");
            }
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct TextPassthru(pub String);

impl actix::Handler<TextPassthru> for BugWebSock {
    type Result = ();
    fn handle(
        &mut self,
        msg: TextPassthru,
        ctx: &mut Self::Context,
    ) -> Self::Result {
        println!("TextPassThru. Grabbing user data from server");
        ctx.text(msg.0);
    }
}

/// Handler for `ws::Message`
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for BugWebSock {
    fn handle(
        &mut self,
        msg: Result<ws::Message, ws::ProtocolError>,
        ctx: &mut Self::Context,
    ) {
        match msg {
            Ok(ws::Message::Ping(msg)) => {
                self.hb_instant = Instant::now();
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                self.hb_instant = Instant::now();
            }
            Ok(ws::Message::Text(text)) => {
                match self.msg_handler(&text, ctx) {
                    Ok(_) => {
                        return;
                    }
                    Err(e) => {
                        println!("Error: {}", e);
                    }
                }
                ctx.text(text);
            }
            Ok(ws::Message::Binary(bin)) => {
                eprintln!("Got binary message? {:?}", bin);
            }
            Ok(ws::Message::Close(reason)) => {
                eprintln!("StreamHandler ws_msg_close: {}", self.id);
                ctx.close(reason);
                ctx.stop();
            }
            _ => {
                eprintln!("!!!!!!!!! WUT IS THIS? !!!!!!!!!");
                ctx.stop();
            }
        }
    }
}

impl BugWebSock {
    pub fn new(data: web::Data<BugContext>) -> Self {
        Self {
            hb_instant: Instant::now(),
            data,
            id: 0,
        }
    }

    fn send_enq(ctx: &mut <Self as Actor>::Context) {
        let enq = json!({"kind": "enq", "timestamp": get_timestamp_ns()});
        ctx.text(enq.to_string());
    }

    /// Helper method that sends ENQ to client every N seconds.
    /// This method checks heartbeats from client
    fn on_start(&self, ctx: &mut <Self as Actor>::Context) {
        BugWebSock::send_enq(ctx);
        ctx.run_interval(ENQ_INTERVAL, |_act, ctx| {
            BugWebSock::send_enq(ctx);
        });

        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            // check client heartbeats
            if Instant::now().duration_since(act.hb_instant) > CLIENT_TIMEOUT {
                eprintln!("heartbeat timeout, disconnecting: {}", act.id);
                let close_reason = ws::CloseReason::from((
                    ws::CloseCode::Policy,
                    "Heartbeat timeout",
                ));
                ctx.close(Some(close_reason));
                ctx.stop();
                return;
            }
            ctx.ping(b"");
        });
    }

    fn ensure_authed(&self) -> Result<(), Error> {
        if self.id == 0 || !self.data.server.is_authenticated(self.id) {
            return Err(Error::AuthError {
                reason: "Unauthenticated".to_string(),
            });
        }
        Ok(())
    }

    fn get_field_bool(
        val: &Value,
        field: &str,
        kind: &str,
    ) -> Result<bool, Error> {
        let bool_res =
            val[field].as_bool().ok_or(Error::MalformedClientMsg {
                reason: format!(
                    "Missing '{}' field for time' field for '{}'",
                    field, kind
                ),
                msg: val.to_string(),
            })?;
        Ok(bool_res)
    }

    fn get_field_str(
        val: &Value,
        field: &str,
        kind: &str,
    ) -> Result<String, Error> {
        let str_res = val[field].as_str().ok_or(Error::MalformedClientMsg {
            reason: format!(
                "Missing '{}' field for time' field for '{}'",
                field, kind
            ),
            msg: val.to_string(),
        })?;
        Ok(str_res.to_string())
    }

    fn get_field_u64(
        val: &Value,
        field: &str,
        kind: &str,
    ) -> Result<u64, Error> {
        let u_res = val[field].as_u64().ok_or(Error::MalformedClientMsg {
            reason: format!(
                "Missing '{}' field for time' field for '{}'",
                field, kind
            ),
            msg: val.to_string(),
        })?;
        Ok(u_res)
    }

    fn get_uuid(
        val: &Value,
        field: &str,
        kind: &str,
    ) -> Result<uuid::Uuid, Error> {
        let id_str = Self::get_field_str(val, field, kind)?;
        let id = B66::decode_uuid(&id_str).ok_or_else(|| {
            Error::MalformedClientMsg {
                reason: format!(
                    "Couldn't parse '{}' as uuid in '{}'",
                    field, kind
                ),
                msg: val.to_string(),
            }
        })?;
        Ok(id)
    }

    fn authed_handler(
        &self,
        kind: &str,
        val: &Value,
        ctx: &mut <Self as Actor>::Context,
    ) -> Result<(), Error> {
        let recipient = ctx.address().recipient();
        let res = self.ensure_authed();
        if res.is_err() {
            eprintln!(
                "unauthed {}, conn: {}",
                kind,
                ConnectionMgr::get_conn_id(&recipient)
            );
            res?;
        }
        match kind {
            "seek" => {
                let time_str = Self::get_field_str(val, "time", kind)?;
                let time_ctrl = TimeControl::from_str(&time_str)?;
                let rated = val["rated"].as_bool().or(Some(true)).unwrap();
                let seek_pool = SeekPool::new(time_ctrl, rated);
                let res = self.data.server.add_seek(seek_pool, recipient);
                if let Err(e) = res {
                    eprintln!("add_seek err: {}", e);
                }
            }
            "set_handle" => {
                let handle_str = Self::get_field_str(val, "handle", kind)?;
                let res =
                    self.data.server.queue_set_handle(handle_str, &self.id);
                if let Err(e) = res {
                    eprintln!("Couldn't set handle: {}", e);
                }
            }
            "create_table" => {
                let time_str = Self::get_field_str(val, "time", kind)?;
                let public = Self::get_field_bool(val, "public", kind)?;
                let time_ctrl = TimeControl::from_str(&time_str)?;
                let rated = val["rated"].as_bool().ok_or_else(|| {
                    Error::MalformedClientMsg {
                        reason: format!("Missing/malformed 'rated'"),
                        msg: val.to_string(),
                    }
                })?;
                println!("form: {} {}", time_str, rated);
                let res = self
                    .data
                    .server
                    .queue_formation(time_ctrl, rated, public, &self.id);
                if let Err(e) = res {
                    eprintln!("table formation error: {}", e);
                }
            }
            "analyze" => {
                let game_id: GameID = Self::get_uuid(&val, "id", kind)?;
                self.data.server.queue_send_game_row(&game_id, recipient)?;
            }
            "sit" => {
                let game_id: GameID = Self::get_uuid(val, "id", kind)?;
                // TODO implement from_str for BoardID / color
                let board_idx = Self::get_field_u64(val, "board", kind)?;
                let board_id = BOARD_IDS[board_idx as usize];
                let color_idx = Self::get_field_u64(val, "color", kind)?;
                let color = ALL_COLORS[color_idx as usize];
                let res = self
                    .data
                    .server
                    .queue_sit(&game_id, board_id, color, &self.id);
                if let Err(e) = res {
                    eprintln!("sit err: {}", e);
                }
                println!("sit: {:?}", val);
            }
            "vacate" => {
                let game_id: GameID = Self::get_uuid(val, "id", kind)?;
                // TODO implement from_str for BoardID / color
                let board_idx = Self::get_field_u64(val, "board", kind)?;
                let board_id = BOARD_IDS[board_idx as usize];
                let color_idx = Self::get_field_u64(val, "color", kind)?;
                let color = ALL_COLORS[color_idx as usize];
                let res = self.data.server.queue_vacate(
                    &game_id,
                    board_id,
                    color,
                    ctx.address().recipient(),
                );
                if let Err(e) = res {
                    eprintln!("sit err: {}", e);
                }
                println!("vacate: {:?}", val);
            }
            "sub_current_games" => {
                self.data
                    .server
                    .sub_current_games(ctx.address().recipient())
                    .ok();
                let players_msg = self.data.server.get_current_games_json()?;
                println!("sub_current_games: {}", players_msg);
                ctx.text(players_msg);
            }
            "unsub_current_games" => {
                self.data
                    .server
                    .unsub_current_games(ctx.address().recipient())
                    .ok();
            }
            "sub_public_tables" => {
                self.data
                    .server
                    .sub_public_tables(ctx.address().recipient())
                    .ok();
                // TODO enable paging?
                // (Not until we have 100s of concurrent tables...)
                let tables_msg = self.data.server.get_public_tables_msg()?;
                ctx.text(tables_msg);
            }
            "unsub_public_tables" => {
                self.data
                    .server
                    .unsub_public_tables(ctx.address().recipient())
                    .ok();
            }
            "sub_online_players" => {
                self.data
                    .server
                    .sub_online_players(ctx.address().recipient())
                    .ok();
                let players_msg = self.data.server.get_online_players_msg(
                    None,
                    u64::MAX,
                    None,
                )?;
                ctx.text(players_msg);
            }
            "unsub_online_players" => {
                self.data
                    .server
                    .unsub_online_players(ctx.address().recipient())
                    .ok();
            }
            "online_players" => {
                let cursor = if let Some(uid_str) = val["cursor"].as_str() {
                    Some(B66::decode_uuid(&uid_str).ok_or_else(|| {
                        Error::MalformedClientMsg {
                            reason: "Malformed 'online_players'".to_string(),
                            msg: "cursor not uuid".to_string(),
                        }
                    })?)
                } else {
                    None
                };
                let count: u64 = Self::get_field_u64(val, "count", kind)?;
                let order_by = val["order_by"].as_str();
                let players_msg = self
                    .data
                    .server
                    .get_online_players_msg(cursor, count, order_by)?;
                ctx.text(players_msg);
            }
            "game_msg" => {
                println!("game_msg: {}", val);
                let game_id: GameID = Self::get_uuid(val, "id", kind)?;
                println!("game_msg: {}", game_id);
                self.data.server.send_game_msg(game_id, val, &self.id).ok();
            }
            "premove" => {
                let game_id: GameID = Self::get_uuid(val, "id", kind)?;
                let mv_str = Self::get_field_str(val, "move", kind)?;
                let bug_mv = BughouseMove::from_str(&mv_str)?;
                println!("premove: {:?}", bug_mv);
                self.data.server.premove(game_id, bug_mv, self.id);
            }
            "cancel_premove" => {
                let game_id: GameID = Self::get_uuid(val, "id", kind)?;
                println!("cancel_premove: {}, {}", game_id, self.id);
                self.data.server.cancel_premove(game_id, self.id);
            }
            "move" => {
                let game_id: GameID = Self::get_uuid(val, "id", kind)?;
                let mv_str = Self::get_field_str(val, "move", kind)?;
                let bug_mv = BughouseMove::from_str(&mv_str)?;
                println!("bug_mv: {:?}", bug_mv);
                let res = self.data.server.make_move(game_id, &bug_mv, self.id);
                if let Err(e) = res {
                    eprintln!("move err: {}", e);
                    let game_msg =
                        self.data.server.get_game_json_payload(game_id)?;
                    eprintln!("sending: {}", game_msg);
                    ctx.text(game_msg);
                };
            }
            _ => {
                eprintln!("Unknown kind: {}", kind);
                return Err(Error::MalformedClientMsg {
                    reason: "Unknown  'kind'".to_string(),
                    msg: val.to_string(),
                });
            }
        }

        Ok(())
    }

    fn get_game_or_send_row(
        &self,
        game_id: GameID,
        recipient: Recipient<ClientMessage>,
    ) -> Result<ByteString, Error> {
        let res = self.data.server.get_game_json_payload(game_id);
        if let Err(e) = res {
            println!("queueing_game_row: {}", game_id);
            self.data.server.queue_send_game_row(&game_id, recipient)?;
            return Err(e);
        }
        res
    }

    fn msg_handler(
        &self,
        text: &ByteString,
        ctx: &mut <Self as Actor>::Context,
    ) -> Result<(), Error> {
        if &text[0..1] != "{" {
            println!("cmd: {}", text);
            return Ok(());
        }

        let val: Value = serde_json::from_str(text)?;
        let kind = (&val)["kind"].as_str().ok_or_else(|| {
            Error::MalformedClientMsg {
                reason: "Malformed 'kind'".to_string(),
                msg: text.to_string(),
            }
        })?;
        if kind != "ack" && kind != "enq" {
            println!("handling: {}", kind);
        }
        match kind {
            "enq" => {
                let ack = json!({"kind": "ack", "timestamp": val["timestamp"]});
                ctx.text(ack.to_string());
            }
            "ack" => {
                let now = get_timestamp_ns();
                if !val["timestamp"].is_u64() {
                    println!("Invalid `ack` message");
                    return Ok(());
                }
                let then = val["timestamp"].as_u64().unwrap();
                let delta = now - then;
                // Round-trip-time in milliseconds / 2 = latency
                let ms = delta as f64 / 1_000_000.0 / 2.0;
                ctx.text(json!({"kind": "latency", "ms": ms}).to_string());
                // println!("latency: {}ms", ms);
            }
            "observe" => {
                let game_id: GameID = Self::get_uuid(&val, "id", kind)?;
                self.data
                    .server
                    .observe(&game_id, ctx.address().recipient());
                let msg = self
                    .get_game_or_send_row(game_id, ctx.address().recipient())?;
                ctx.text(msg);
            }
            "unobserve" => {
                let game_id: GameID = Self::get_uuid(&val, "id", kind)?;
                self.data
                    .server
                    .unobserve(&game_id, ctx.address().recipient());
            }
            "refresh" => {
                let game_id: GameID = Self::get_uuid(&val, "id", kind)?;
                let msg = self
                    .get_game_or_send_row(game_id, ctx.address().recipient())?;
                ctx.text(msg);
            }
            "auth" => {
                let token =
                    val["firebase_token"].as_str().ok_or(Error::AuthError {
                        reason: "Malformed token".to_string(),
                    })?;

                println!("firebase_token: {}", token);
                self.data
                    .srv_recipient
                    .try_send(ServerMessage::new(ServerMessageKind::Auth(
                        ctx.address().recipient(),
                        token.to_string(),
                    )))
                    .expect("WTF");
            }
            _ => {
                self.authed_handler(kind, &val, ctx)?;
            }
        }
        Ok(())
    }
}
