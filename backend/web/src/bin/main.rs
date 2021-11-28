use actix::prelude::*;
use actix_cors::Cors;
use actix_files as fs;
use actix_redis::RedisSession;
use actix_session::Session; //, CookieSession};
use actix_web::*;
use actix_web::{middleware, web, App, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use async_graphql::{EmptyMutation, EmptySubscription, Schema};
// use jsonwebtoken::decode_header;
use serde::Deserialize;
use serde_json::json;
use std::io;
use std::sync::Arc;

use bughouse_app::b66::B66;
use bughouse_app::bug_web_sock::{BugContext, BugWebSock};
use bughouse_app::bughouse_server::{BughouseServer, ServerHandler};
use bughouse_app::db::Db;
use bughouse_app::firebase;
use bughouse_app::firebase::FirebaseID;
use bughouse_app::graphql::query::{gql_handle_schema_with_header, QueryRoot};
use bughouse_app::users::Users;

#[derive(Debug, Deserialize)]
struct AuthPost {
    firebase_token: String,
}

// 1. Read the firebase token in JSON body,
// 2. Validate it
// 3. Store user session uid/role data
async fn auth_post(
    _req: HttpRequest,
    info: web::Json<AuthPost>,
    session: Session,
    context: web::Data<BugContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let db = context.db.clone();
    let resp = match firebase::authenticate(&info.firebase_token, db).await {
        Ok((FirebaseID(fid), _)) => {
            let conns = context.server.get_conns();
            let res = conns.user_from_fid(&fid).await;
            match res {
                Ok(user) => {
                    let ruser = user.read().unwrap();
                    let b66_uid = B66::encode_uuid(ruser.get_uid());
                    session.insert("uid", &b66_uid)?;
                    session.insert("role", ruser.role)?;
                    json!({ "uid": b66_uid, "role": ruser.role })
                }
                Err(e) => {
                    json!({ "err": format!("{}", e) })
                }
            }
        }
        Err(e) => {
            json!({ "err": format!("{}", e) })
        }
    };
    Ok(HttpResponse::Ok().body(format!("{}", resp)))
}

#[get("/test")]
async fn test_get() -> Result<HttpResponse, actix_web::Error> {
    let json = json!({ "test": "worked" });
    Ok(HttpResponse::Ok().body(format!("{}", json)))
}

async fn auth_get(session: Session) -> Result<HttpResponse, actix_web::Error> {
    let uid = session.get::<String>("uid").ok();
    let role = session.get::<i8>("role").ok();
    let resp = json!({ "uid": uid, "role": role });
    Ok(HttpResponse::Ok().body(format!("{}", resp,)))
}

async fn ws_route(
    req: HttpRequest,
    stream: web::Payload,
    context: web::Data<BugContext>,
) -> Result<HttpResponse, actix_web::Error> {
    ws::start(BugWebSock::new(context), &req, stream)
}

fn env_or(env_var: &str, alt: &str) -> String {
    std::env::var(env_var).unwrap_or(alt.to_string())
}

fn get_cors() -> Cors {
    if env_or("DEV", "0") == "1" {
        return Cors::default()
            .allow_any_header()
            .allow_any_origin()
            .allow_any_method()
            .send_wildcard();
    }
    Cors::default()
        .allow_any_header()
        .allowed_origin("http://localhost")
        .allowed_origin("http://localhost:7777")
        .allowed_origin("http://localhost:5000")
        .allowed_origin("http://127.0.0.1")
        .allowed_origin("https://ws.bughouse.app")
        .allowed_origin("https://bughouse.app")
        .allowed_methods(vec!["GET", "POST"])
}

#[actix_web::main]
async fn main() -> Result<(), io::Error> {
    std::env::set_var("RUST_LOG", "actix_server=info,actix_web=info");
    env_logger::init();

    let db = Db::new().await.expect("Could not start DB");
    let adb = Arc::new(db);
    let users = Arc::new(Users::new(adb.clone()));
    let addr = ServerHandler::new(adb.clone(), users.clone()).start();
    let server = BughouseServer::get(
        adb.clone(),
        addr.clone().recipient(),
        users.clone(),
    );

    HttpServer::new(move || {
        let context = BugContext::create(
            addr.to_owned().recipient(),
            server,
            adb.clone(),
            users.clone(),
        );
        let session = RedisSession::new("127.0.0.1:6379", &[0; 32]);
        let schema = Schema::build(QueryRoot, EmptyMutation, EmptySubscription)
            .data(context.clone())
            .data(adb.clone())
            .finish();
        // let srv_cp = srv.clone();
        App::new()
            .app_data(web::Data::new(context.clone()))
            // enable logger
            .wrap(middleware::Logger::default())
            // enable logger
            .wrap(session)
            // websocket route
            .service(web::resource("/ws/").to(ws_route))
            // auth / session route
            .service(test_get)
            .service(
                web::resource("/auth")
                    .wrap(get_cors())
                    .route(web::post().to(auth_post))
                    .route(web::get().to(auth_get)),
            )
            .service(
                web::resource("/graphql")
                    .wrap(get_cors())
                    .app_data(web::Data::new(schema))
                    .route(
                        web::post()
                            .to(gql_handle_schema_with_header::<QueryRoot>),
                    ),
            )
            // static files
            .service(fs::Files::new("/", "static/").index_file("index.html"))
    })
    // start http server on 127.0.0.1:8080
    .bind(format!("127.0.0.1:{}", env_or("PORT", "8081")))?
    .run()
    .await
}
