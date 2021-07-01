#[macro_use]
extern crate lazy_static;

use actix::prelude::*;
use actix_web::*;
use web::Data;
use actix_files as fs;
use actix_web::{
    middleware, web, App, HttpRequest, HttpResponse, HttpServer,
};
use actix_web_actors::ws;
use std::io;

mod b73_encode;
mod bug_web_sock;
mod bughouse_server;
mod db;
mod error;
mod firebase;
mod messages;
use db::Db;
use bug_web_sock::{BugWebSock, BugContext};
use bughouse_server::BughouseServer;

pub async fn ws_route(
  req: HttpRequest,
  stream: web::Payload,
  context: web::Data<BugContext>,
) -> Result<HttpResponse, actix_web::Error> {
  ws::start(
    BugWebSock::new(context.get_srv_addr().to_owned()),
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

    let res = Db::new().await;
    let db = res.expect("Couldn't start DB");
    println!("starting server...");
    let bug_srv = BughouseServer::startup(db).start();
    println!("started");

    // let server = BughouseServer::startup().await.expect("Couldn't start server");
    // let srv = Arc::new(server);
    HttpServer::new(move || {
        let context = BugContext::create(bug_srv.to_owned());
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
