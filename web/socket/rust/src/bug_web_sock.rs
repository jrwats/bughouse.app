use actix::prelude::*;
// use actix::ResponseFuture;
use crate::bughouse_server::BughouseServer;
use crate::connection_mgr::ConnID;
use crate::db::{Db};
use crate::error::Error;
use crate::messages::{
    ClientMessage, ClientMessageKind, ServerMessage, ServerMessageKind,
};
use actix_web::*;
use actix_web_actors::ws;
use bytestring::ByteString;
use chrono::prelude::*;
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::{Duration, Instant};

pub fn get_timestamp_ns() -> u64 {
    Utc::now().timestamp_nanos() as u64
}

/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const ENQ_INTERVAL: Duration = Duration::from_secs(5);
/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

pub struct BugContext {
    pub srv_recipient: Recipient<ServerMessage>,
    pub server: &'static BughouseServer,
    db: Arc<Db>,
}

impl BugContext {
    pub fn create(
        srv_recipient: Recipient<ServerMessage>,
        server: &'static BughouseServer,
        db: Arc<Db>,
    ) -> Self {
        BugContext {
            srv_recipient,
            server,
            db,
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
    srv_recipient: Recipient<ServerMessage>,
    server: &'static BughouseServer,
    /// unique session id
    id: ConnID,
}

impl Actor for BugWebSock {
    type Context = ws::WebsocketContext<Self>;

    /// Method is called on actor start. We start the heartbeat process here.
    fn started(&mut self, ctx: &mut Self::Context) {
        self.on_start(ctx);
    }
}

/// BughouseSever sends these messages to Socket session
impl Handler<ClientMessage> for BugWebSock {
    type Result = ();
    fn handle(
        &mut self,
        msg: ClientMessage,
        ctx: &mut Self::Context,
    ) -> Self::Result {
        match msg.kind {
            ClientMessageKind::Auth(conn_id) => {
                self.id = conn_id;
                let user = self.server.user_from_conn(conn_id);
                ctx.text("authenticated".to_string());

                // TODO - rethink - emulating old FICS login auth
                let msg = json!({
                    "kind": "login",
                    "handle": user.unwrap().read().unwrap().get_handle()
                });
                ctx.text(msg.to_string());
            }
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct TextPassthru(pub String);

impl Handler<TextPassthru> for BugWebSock {
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
                self.server.on_close(ctx.address().recipient());
                ctx.close(reason);
                ctx.stop();
            }
            _ => ctx.stop(),
        }
    }
}

impl BugWebSock {
    pub fn new(
        srv_recipient: Recipient<ServerMessage>,
        server: &'static BughouseServer,
    ) -> Self {
        Self {
            hb_instant: Instant::now(),
            srv_recipient,
            server,
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
                // heartbeat timed out
                println!("Websocket Client heartbeat failed, disconnecting!");

                // stop actor
                ctx.stop();

                // don't try to send a ping
                return;
            }

            ctx.ping(b"");
        });
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
        let kind =
            val["kind"]
                .as_str()
                .ok_or_else(|| Error::MalformedClientMsg {
                    reason: "Malformed 'kind'".to_string(),
                    msg: text.to_string(),
                })?;
        println!("handling, {}", kind);
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
                println!("latency: {}ms", ms);
            }
            "auth" => {
                let token = val["token"].as_str().ok_or(Error::AuthError {
                    reason: "Malformed token".to_string(),
                })?;

                self.srv_recipient
                    .do_send(ServerMessage::new(ServerMessageKind::Auth(
                        ctx.address().recipient(),
                        token.to_string(),
                    )))
                    .expect("WTF");
                // self.srv_recipient
                //     .send(ServerMessage::new(ServerMessageKind::Auth(
                //         ctx.address().recipient(),
                //         token.to_string(),
                //     )))
                //     .into_actor(self)
                //     .then(|res, _, _ctx| {
                //         println!("future go there");
                //         match res {
                //             Ok(m) => {
                //                 if let Ok(msg) = m {
                //                     match msg.kind {
                //                         ClientMessageKind::Auth(id) => {
                //                             self.id = id;
                //                         }
                //                     }
                //                 }
                //                 println!("Auth success on websocket thread: {:?}", m)
                //             }
                //             Err(e) => { eprintln!("Auth error on websocket thread: {:?}", e) }
                //         }
                //         actix::fut::ready(())
                //     })
                // .spawn(ctx);
            }
            _ => eprintln!("TODO"),
        }
        Ok(())
    }
}
