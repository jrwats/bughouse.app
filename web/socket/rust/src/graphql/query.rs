use actix_web::*;
use actix_session::Session;
use actix_web::{HttpRequest, HttpResponse, Responder};
use async_graphql::{
    Context, EmptyMutation, EmptySubscription, Object, ObjectType, Schema,
    SimpleObject, ComplexObject
};
use async_graphql::connection::{query, Connection, Edge, EmptyFields};
use std::sync::{Arc, RwLock};
use crate::b66::B66;
use crate::async_graphql_actix_web::lib::{Response, Request};
use crate::bug_web_sock::BugContext;
use crate::users::User;
use crate::game_row::UserGameRow;


pub struct GraphQLUserGame<'a>(&'a UserGameRow);

pub struct GraphQLUser(Arc<RwLock<User>>);

#[Object]
impl GraphQLUser {
    async fn name(&self) -> Option<String> {
        if let Some(s) = &self.0.read().unwrap().name {
            return Some(s.clone());
        }
        None
    }

    async fn handle(&self) -> String {
        self.0.read().unwrap().handle.to_string()
    }

    async fn id(&self) -> String {
        B66::encode_uuid(&self.0.read().unwrap().id)
    }

    async fn rating(&self) -> i16 {
        self.0.read().unwrap().rating
    }

    async fn deviation(&self) -> i16 {
        self.0.read().unwrap().deviation
    }

    // async fn games<'a>(
    //     &self,
    //     ctx: &Context<'a>,
    //     after: Option<String>,
    //     before: Option<String>,
    //     first: Option<i32>,
    //     last: Option<i32>,
    //     ) -> Result<Connection<usize, GraphQLUserGame<'a>, EmptyFields, EmptyFields>> {
    //     query(
    //         after,
    //         before,
    //         first,
    //         last,
    //         |after, before, first, last| async move {
    //     }).await
    // }
}


#[derive(SimpleObject)]
#[graphql(complex)] // NOTE: For `ComplexObject` macro to take effect, this `complex` attribute is required.
struct MyObj {
    a: i32,
    b: i32,
}

#[ComplexObject]
impl MyObj {
    async fn c(&self) -> i32 {
        self.a + self.b
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

    async fn user<'a>(
        &self,
        ctx: &Context<'a>,
        #[graphql(desc = "encoded id of the user")] id: String,
        ) -> Option<GraphQLUser> {
        let uid = B66::decode_uuid(&id)?;
        let result = ctx.data::<BugContext>();
        if let Err(e) = result {
            eprintln!("Couldn't get context from graphQL ctxt: {:?}", e);
            return None;
        }
        let bug_ctx = result.unwrap();
        let user = bug_ctx.users.maybe_user_from_uid(&uid).await?;
        Some(GraphQLUser(user))
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
    gql_request: Request,
    session: Session,
    context: web::Data<BugContext>,
) -> Result<HttpResponse, actix_web::Error> {
    eprintln!("gql_handle_schema_with_header");
    eprintln!("headers: {:?}", req.headers());
    // let name = req
    //     .headers()
    //     .get("Name")
    //     .and_then(|value| value.to_str().map(|s| Hello(s.to_string())).ok());
    let name = Some("world");
    let mut request = gql_request.into_inner();
    if let Some(name) = name {
        request = request.data(name);
    }
    let response: Response = schema.execute(request).await.into();
    Ok(response.respond_to(&req))
}
