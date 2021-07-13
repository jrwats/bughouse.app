#[macro_use]
extern crate lazy_static;

use actix::prelude::*;
use actix_files as fs;
use actix_web::*;
use actix_web::{middleware, web, App, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use std::io;
use std::sync::Arc;
use web::Data;

mod b66;
mod bug_web_sock;
mod bughouse_server;
mod connection_mgr;
mod db;
mod error;
mod firebase;
mod game;
mod game_json;
mod games;
mod observers;
mod hash;
mod messages;
mod players;
mod rating;
mod seeks;
mod time_control;
mod users;
use bug_web_sock::{BugContext, BugWebSock};
use bughouse_server::{BughouseServer, ServerHandler};
use db::Db;

pub async fn ws_route(
    req: HttpRequest,
    stream: web::Payload,
    context: web::Data<BugContext>,
) -> Result<HttpResponse, actix_web::Error> {
    ws::start(
        BugWebSock::new(context),
        // BugWebSock::new(context.get_srv_recipient().to_owned(), context.server),
        &req,
        stream,
    )
}
/// websocket connection is long running connection, it easier
/// to handle with an actor

fn env_or(env_var: &str, alt: &str) -> String {
    std::env::var(env_var).unwrap_or(alt.to_string())
}

#[actix_web::main]
async fn main() -> Result<(), io::Error> {
    std::env::set_var("RUST_LOG", "actix_server=info,actix_web=info");
    env_logger::init();

    let db = Db::new().await.expect("Could not start DB");
    // let _db = Db::new();
    let adb = Arc::new(db);
    let addr = ServerHandler::new(adb.clone()).start();
    let server = BughouseServer::get(adb.clone(), addr.clone().recipient());

    // server.start();
    // let addr = (&server).start();
    // let addr = server.get_addr();
    // server.set_loopback(bug_srv.clone().recipient());

    println!("starting server...");
    println!("started");
    eprintln!("testing STDERR");

    // let server = BughouseServer::startup().await.expect("Couldn't start server");
    // let srv = Arc::new(server);
    HttpServer::new(move || {
        let context = BugContext::create(
            addr.to_owned().recipient(),
            server,
            adb.clone(),
        );
        // let srv_cp = srv.clone();
        App::new()
            .app_data(Data::new(context))
            // enable logger
            .wrap(middleware::Logger::default())
            // websocket route
            .service(web::resource("/ws/").to(ws_route))
            // route(web::get().to(move |r, s| { ws_index(r, s, srv_cp.clone()) })))
            // static files
            .service(fs::Files::new("/", "static/").index_file("index.html"))
    })
    // start http server on 127.0.0.1:8080
    .bind(format!("127.0.0.1:{}", env_or("PORT", "8080")))?
    .run()
    .await
}
