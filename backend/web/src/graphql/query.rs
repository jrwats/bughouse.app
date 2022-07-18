use super::rfc_3339::Rfc3339;
use super::user_games_fetcher::{
    CompleteGameRow, CompleteRatingSnapshot, TimeComp, UserGamesFetcher,
};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};
use crate::b66::B66;
use crate::bug_web_sock::BugContext;
use crate::game::GameResult;
use crate::game_row::GameRow;
use crate::users::{User as BackingUser, UserID};
use actix_web::*;
use actix_web::{HttpRequest, HttpResponse, Responder};
use async_graphql::connection::{query, Connection, Edge, EmptyFields};
use async_graphql::{
    Context, EmptyMutation, EmptySubscription, Interface,
    Object, ObjectType, Schema
};
use chrono::prelude::*;
use std::sync::{Arc, RwLock};

pub struct User(Arc<RwLock<BackingUser>>);

#[Object]
impl User {
    // GraphQL ID
    async fn id(&self) -> String {
        format!(
            "{}:{}",
            "user",
            B66::encode_uuid(&self.0.read().unwrap().id)
        )
    }

    async fn uid(&self) -> String {
        B66::encode_uuid(&self.0.read().unwrap().id)
    }

    async fn name(&self) -> Option<String> {
        if let Some(s) = &self.0.read().unwrap().name {
            return Some(s.clone());
        }
        None
    }

    async fn handle(&self) -> String {
        self.0.read().unwrap().handle.to_string()
    }

    async fn email(&self) -> Option<String> {
        self.0.read().unwrap().email.clone()
    }

    async fn rating(&self) -> i16 {
        self.0.read().unwrap().rating
    }

    async fn deviation(&self) -> i16 {
        self.0.read().unwrap().deviation
    }

    /// Fetch games in descending (most-recent) order.
    /// e.g. {after: $now} will fetch the most recent games in descending order.
    /// This means the logic is opposite of time.
    async fn games<'a>(
        &self,
        ctx: &Context<'a>,
        after: Option<String>,
        before: Option<String>,
        first: Option<i32>,
        last: Option<i32>,
    ) -> async_graphql::Result<
        Connection<Rfc3339, UserGame, GraphQLUserGamesFields, EmptyFields>,
        async_graphql::Error,
    > {
        let bug_ctx = ctx.data::<BugContext>().unwrap();
        let db = bug_ctx.db.clone();
        eprintln!("after: {:?}, first: {:?}", after, first);
        query(
            after,
            before,
            first,
            last,
            |after: Option<Rfc3339>, before: Option<Rfc3339>, first, last| async move {
                let fetcher = UserGamesFetcher::new(db);
                let id = self.0.read().unwrap().id;
                let direction = if before.is_some() || last.is_some() {
                    TimeComp::Newer
                } else {
                    TimeComp::Older // Default to a descending query
                };
                let cursor = if direction == TimeComp::Newer {
                    before.map_or_else(|| Some(zero_time()), |a| Some(a.0))
                } else {
                    after.map(|b| b.0)
                };
                let (games, has_more) = fetcher.get_chunk(&id, cursor, last.or(first), direction).await?;
                let mut edges = Vec::with_capacity(games.len());
                for user_game in games {
                    let ms = user_game.start_time.num_milliseconds();
                    let date = Utc.timestamp_millis(ms);
                    edges.push(Edge::new(Rfc3339(date), UserGame(user_game)));
                }
                let has_previous_page = direction == TimeComp::Newer && has_more;
                let has_next_page = direction == TimeComp::Older && has_more;
                let fields = GraphQLUserGamesFields { uid: self.0.read().unwrap().id };
                let mut conn =
                    Connection::with_additional_fields(has_previous_page, has_next_page, fields);
                conn.edges = edges;
                Ok::<_, async_graphql::Error>(conn)
        }).await
    }
}

#[derive(Interface)]
#[graphql(field(name = "id", type = "String"))]
enum Node {
    User(User),
}

pub struct GraphQLGameResult(GameResult);

#[Object]
impl GraphQLGameResult {
    async fn board(&self) -> i32 {
        self.0.board as i32
    }

    async fn winner(&self) -> i32 {
        self.0.winner as i32
    }

    async fn kind(&self) -> i32 {
        self.0.kind as i32
    }
}

pub struct UserGame(CompleteGameRow);

#[Object]
impl UserGame {
    async fn gid(&self) -> String {
        B66::encode_uuid(&self.0.game_id)
    }

    async fn result(&self) -> GraphQLGameResult {
        GraphQLGameResult(GameRow::deserialize_result(self.0.result))
    }

    async fn rated(&self) -> bool {
        self.0.rated
    }

    async fn timestamp(&self) -> i64 {
        let ms = self.0.start_time.num_milliseconds();
        let date = Utc.timestamp_millis(ms);
        date.timestamp()
    }

    async fn start_time(&self) -> String {
        let ms = self.0.start_time.num_milliseconds();
        let date = Utc.timestamp_millis(ms);
        date.to_rfc3339()
    }

    async fn players(&self) -> [&CompleteRatingSnapshot; 4] {
        let ((aw, ab), (bw, bb)) = &self.0.players;
        [aw, ab, bw, bb]
    }
}

fn zero_time() -> DateTime<Utc> {
    DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp(0, 0), Utc)
}

struct GraphQLUserGamesFields {
    uid: UserID,
}

#[Object]
impl<'a> GraphQLUserGamesFields {
    pub async fn total_count(&self, ctx: &Context<'a>) -> usize {
        let bug_ctx = ctx.data::<BugContext>().unwrap();
        UserGamesFetcher::new(bug_ctx.db.clone())
            .total_count(&self.uid)
            .await
            .unwrap()
    }
}

struct Hello(String);

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Returns hello
    async fn hello<'a>(&self, ctx: &'a Context<'_>) -> String {
        let name = ctx.data_opt::<Hello>().map(|hello| hello.0.as_str());
        format!("Hello, {}!", name.unwrap_or("world"))
    }

    async fn node<'a>(
        &self,
        ctx: &Context<'a>,
        #[graphql(desc = "encoded id of the node")] id: String,
    ) -> Option<Node> {
        let (kind, sub_id) = id.split_once(':')?;
        match kind {
            "user" => {
                let maybe_user =
                    self.user(ctx, sub_id.to_string()).await.ok()?;
                let user = maybe_user?;
                Some(Node::User(user))
                // let node_id = User::id(&user, ctx).await.ok()?;
                // Some(Node { id: node_id })
            }
            _ => None,
        }
    }

    async fn user<'a>(
        &self,
        ctx: &Context<'a>,
        #[graphql(desc = "decoded id of the user")] id: String,
    ) -> Option<User> {
        let uid = B66::decode_uuid(&id)?;
        eprintln!("id: {}, uid: {}", id, uid);
        let result = ctx.data::<BugContext>();
        if let Err(e) = result {
            eprintln!("Couldn't get context from graphQL ctx: {:?}", e);
            return None;
        }
        let bug_ctx = result.unwrap();
        let user = bug_ctx.users.maybe_user_from_uid(&uid).await?;
        eprintln!("Got user: {:?}", user);
        Some(User(user))
    }

    // async fn users(&self,
    //     after: Option<String>,
    //     before: Option<String>,
    //     first: Option<i32>,
    //     last: Option<i32>,
    // ) -> Result<Connection<usize, i32, EmptyFields, EmptyFields>> {
    //     query(after, before, first, last, |after, before, first, last| async move {
    //         let mut start = after.map(|after| after + 1).unwrap_or(0);
    //         let mut end = before.unwrap_or(10000);
    //         if let Some(first) = first {
    //             end = (start + first).min(end);
    //         }
    //         if let Some(last) = last {
    //             start = if last > end - start {
    //                  end
    //             } else {
    //                 end - last
    //             };
    //         }
    //         let mut connection = Connection::new(start > 0, end < 10000);
    //         connection.append(
    //             (start..end).into_iter().map(|n|
    //                 Ok(Edge::new_with_additional_fields(n, n as i32, EmptyFields)),
    //         ))?;
    //         Ok(connection)
    //     })
    // }
}

pub async fn gql_handle_schema_with_header<T: ObjectType + 'static>(
    schema: actix_web::web::Data<Schema<T, EmptyMutation, EmptySubscription>>,
    req: HttpRequest,
    gql_request: GraphQLRequest,
    // session: Session,
    // context: web::Data<BugContext>,
) -> Result<HttpResponse, actix_web::Error> {
    // eprintln!("gql_handle_schema_with_header");
    // eprintln!("headers: {:?}", req.headers());
    // let name = req
    //     .headers()
    //     .get("Name")
    //     .and_then(|value| value.to_str().map(|s| Hello(s.to_string())).ok());
    let name = Some("world");
    let mut request = gql_request.into_inner();
    if let Some(name) = name {
        request = request.data(name);
    }
    let response: GraphQLResponse = schema.execute(request).await.into();
    Ok(response.respond_to(&req))
}
