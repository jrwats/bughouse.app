use actix::prelude::*;
use actix_web_actors::ws;
use chrono::prelude::*;
use serde_json::{json, Value};
use std::io::prelude::{Read, Write};
use std::os::unix::net::UnixStream;
use std::time::{Duration, Instant};

use crate::error::Error;
use crate::firebase::*;
use crate::bughouse_server::BughouseServer;

pub fn get_timestamp_ns() -> u64 {
    Utc::now().timestamp_nanos() as u64
}

/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const ENQ_INTERVAL: Duration = Duration::from_secs(5);
/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

/// websocket connection is long running connection, it easier
/// to handle with an actor
#[derive(Debug)]
pub struct BugWebSock  {
    /// Client must send ping at least once per 10 seconds (CLIENT_TIMEOUT),
    /// otherwise we drop connection.
    hb_instant: Instant,
    // server: &'static BughouseServer,
}

impl Actor for BugWebSock {
    type Context = ws::WebsocketContext<Self>;

    /// Method is called on actor start. We start the heartbeat process here.
    fn started(&mut self, ctx: &mut Self::Context) {
        self.on_start(ctx);
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct TextPassthru(pub String);

impl Handler<TextPassthru> for BugWebSock {
    type Result = ();
    fn handle(&mut self, msg: TextPassthru, ctx: &mut Self::Context) -> Self::Result {
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
            Ok(ws::Message::Binary(bin)) => ctx.binary(bin),
            Ok(ws::Message::Close(reason)) => {
                ctx.close(reason);
                ctx.stop();
            }
            _ => ctx.stop(),
        }
    }
}

impl BugWebSock {
    pub fn new() -> Self {
        Self {
            hb_instant: Instant::now(),
            // server: BughouseServer::get(),
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
        text: &String,
        ctx: &mut <Self as Actor>::Context,
    ) -> Result<(), Error> {
        if &text[0..1] != "{" {
            println!("cmd: {}", text);
            return Ok(())
        }
       
        let val: Value = serde_json::from_str(text)?;
        let kind =
            val["kind"]
                .as_str()
                .ok_or_else(|| Error::MalformedClientMsg {
                    reason: "Malformed 'kind'".to_string(),
                    msg: text.to_string(),
                })?;
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
                let mut stream = UnixStream::connect(UNIX_SOCK.to_string())?;
                write!(stream, "{}\n{}\n", FIRE_AUTH, token)?;
                let mut resp = String::new();
                stream.read_to_string(&mut resp)?;
                let (kind, payload) = resp.split_once(':').unwrap();
                match kind {
                    "uid" => {
                        println!("auth.uid: {}", payload);
                        let msg = json!({"kind": "authenticated"});
                        ctx.text(msg.to_string());
                        
                        println!("state: {:?}", ctx.state());
                        println!("handle: {:?}", ctx.handle());
                        // println!("address: {:?}", ctx.address());
                        BughouseServer::get().add_conn(ctx, payload);

                        // TOOD - remove - just here emulating old auth
                        let msg = json!({"kind": "login", "handle": "fak3"});
                        ctx.text(msg.to_string());
                    }
                    "err" => {
                        let msg = json!({"kind": "auth/err", "msg": payload});
                        ctx.text(msg.to_string());
                        return Err(Error::AuthError {
                            reason: payload.to_string(),
                        });
                    }
                    _ => {
                        let msg = format!("Unknown response: {}", resp);
                        return Err(Error::AuthError { reason: msg });
                    }
                }
                println!("response: {}", resp);
            }
            _ => {
                println!("Unknown message: {}", text);
                // BughouseServer.get().handle(ctx, text)
            }
        }
        Ok(())
    }
}


