#[macro_use]
extern crate lazy_static;

use actix_web::{
    middleware, web, App, Error as ActixError, HttpRequest, HttpResponse,
    HttpServer
};
use actix_files as fs;
use actix_web_actors::ws;
// use serde::{Serialize, Deserialize};

mod error;
mod firebase;
mod bughouse_server;
mod bug_web_sock;
use bug_web_sock::BugWebSock;


/// do websocket handshake and start `BugWebSock` actor
async fn ws_index(
    r: HttpRequest,
    stream: web::Payload,
) -> Result<HttpResponse, ActixError> {
    // println!("{:?}", r);
    ws::start(BugWebSock::new(), &r, stream)
    // println!("{:?}", res);
    // res
}

/// websocket connection is long running connection, it easier
/// to handle with an actor

fn env_or(env_var: &str, alt: &str) -> String {
    std::env::var(env_var).unwrap_or(alt.to_string())
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
