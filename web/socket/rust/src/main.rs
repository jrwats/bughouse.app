use std::time::{Duration, Instant};
use std::os::unix::net::UnixStream;
use std::io::prelude::*;

use actix::prelude::*;
use actix_files as fs;
use actix_web::{middleware, web, App, Error as ActixError, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use chrono::prelude::*;
// use serde::{Serialize, Deserialize};
use serde_json::{json, /*, Result as JsonResult */ Value};

mod error; // Error
use error::Error;


/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const ENQ_INTERVAL: Duration = Duration::from_secs(2);
/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

/// do websocket handshake and start `MyWebSocket` actor
async fn ws_index(r: HttpRequest, stream: web::Payload) -> Result<HttpResponse, ActixError> {
    println!("{:?}", r);
    let res = ws::start(MyWebSocket::new(), &r, stream);
    println!("{:?}", res);
    res
}

// firebase-go-srv
const FIRE_AUTH: u8 = 1;
// const FIRE_HEARTBEAT: u8 = 2;
// const FIRE_LOGOUT: u8 = 3;

pub fn get_timestamp_ns() -> u64 { Utc::now().timestamp_nanos() as u64}

/// websocket connection is long running connection, it easier
/// to handle with an actor
struct MyWebSocket {
    /// Client must send ping at least once per 10 seconds (CLIENT_TIMEOUT),
    /// otherwise we drop connection.
    hb_instant: Instant,
}

impl Actor for MyWebSocket {
    type Context = ws::WebsocketContext<Self>;

    /// Method is called on actor start. We start the heartbeat process here.
    fn started(&mut self, ctx: &mut Self::Context) {
        self.on_start(ctx);
    }
}
/// Handler for `ws::Message`
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for MyWebSocket {
    fn handle(
        &mut self,
        msg: Result<ws::Message, ws::ProtocolError>,
        ctx: &mut Self::Context,
    ) {
        // process websocket messages
        // println!("WS: {:?}", msg);
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

fn env_or(env_var: &str, alt: &str) -> String {
    std::env::var(env_var).unwrap_or(alt.to_string())
}

impl MyWebSocket {
    fn new() -> Self {
        Self { hb_instant: Instant::now() }
    }

    fn send_enq(ctx: &mut <Self as Actor>::Context) {
        let enq = json!({"kind": "enq", "timestamp": get_timestamp_ns()});
        ctx.text(enq.to_string());
    }

    /// Helper method that sends ENQ to client every N seconds.
    /// This method checks heartbeats from client
    fn on_start(&self, ctx: &mut <Self as Actor>::Context) {
        MyWebSocket::send_enq(ctx);
        ctx.run_interval(ENQ_INTERVAL, |_act, ctx| {
            MyWebSocket::send_enq(ctx);
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

    fn msg_handler(&self, text: &String, ctx: &mut <Self as Actor>::Context) -> Result<(), Error> {
        let val: Value = serde_json::from_str(text)?;
        let kind = val["kind"].as_str().ok_or_else(
            || Error::MalformedClientMsg {
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
                    return Ok(())
                }
                let then = val["timestamp"].as_u64().unwrap();
                let delta = now - then;
                let ms = delta as f64 / 500_000.0; // 1M / 2.0 = Round-trip time / 2
                ctx.text(json!({"kind": "latency", "ms": ms}).to_string());
                println!("latency: {}ms", ms);
            },
            "auth" => {
                let token = val["token"].as_str().ok_or(Error::Auth { 
                    reason: "Malformed token".to_string()
                })?;
                let sock = env_or("SOCK", "/tmp/firebase.sock");
                let mut stream = UnixStream::connect(sock)?;
                write!(stream, "{}\n{}\n", FIRE_AUTH, token)?;
                let mut resp = String::new();
                stream.read_to_string(&mut resp)?;
                let (kind, payload) = resp.split_once(':').unwrap();
                match kind {
                    "uid" => {
                        println!("uid: {}", payload);
                    },
                    "err" => {
                        return Err(Error::AuthError { reason: payload.to_string() });
                    }
                    _ => {
                        let msg = format!("Unknown response: {}", resp);
                        return Err(Error::AuthError { reason: payload.to_string() });
                    }
                }
                println!("response: {}", resp);
            }
            _ => println!("Unknown message: {}", text)
        }
        Ok(())
    }

}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_server=info,actix_web=info");
    env_logger::init();

    HttpServer::new(|| {
        App::new()
            // enable logger
            .wrap(middleware::Logger::default())
            // websocket route
            .service(web::resource("/ws/").route(web::get().to(ws_index)))
            // static files
            .service(fs::Files::new("/", "static/").index_file("index.html"))
    })
    // start http server on 127.0.0.1:8080
    .bind(format!("127.0.0.1:{}", env_or("PORT", "8080")))?
    .run()
    .await
}
