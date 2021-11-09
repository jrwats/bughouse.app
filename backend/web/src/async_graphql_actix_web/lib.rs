//! Async-graphql integration with Actix-web
#![forbid(unsafe_code)]
#![allow(clippy::upper_case_acronyms)]
#![warn(missing_docs)]

// mod super::subscription;

use std::future::Future;
use std::io::{self, ErrorKind};
use std::pin::Pin;

use actix_web::error::PayloadError;
use actix_web::dev::{Payload, PayloadStream};
use actix_web::http::{Method, StatusCode};
use actix_web::{http, Error, FromRequest, HttpRequest, HttpResponse, Responder, Result};
use futures_util::future::{self, FutureExt};
// use futures_util::io::AsyncRead;
// use futures_util::stream::IntoAsyncRead;
use futures_util::StreamExt;

use async_graphql::http::MultipartOptions;
use async_graphql::ParseRequestError;

/// Extractor for GraphQL request.
///
/// `async_graphql::http::MultipartOptions` allows to configure extraction process.
pub struct Request(pub async_graphql::Request);

impl Request {
    /// Unwraps the value to `async_graphql::Request`.
    #[must_use]
    pub fn into_inner(self) -> async_graphql::Request {
        self.0
    }
}

type BatchToRequestMapper =
    fn(<<BatchRequest as FromRequest>::Future as Future>::Output) -> Result<Request>;

impl FromRequest for Request {
    type Error = Error;
    type Future = future::Map<<BatchRequest as FromRequest>::Future, BatchToRequestMapper>;
    // type Config = MultipartOptions;

    fn from_request(req: &HttpRequest, payload: &mut Payload<PayloadStream>) -> Self::Future {
        eprintln!("Request::from_request");
        BatchRequest::from_request(req, payload).map(|res| {
            Ok(Self(
                res?.0
                    .into_single()
                    .map_err(actix_web::error::ErrorBadRequest)?,
            ))
        })
    }
}

/// Extractor for GraphQL batch request.
///
/// `async_graphql::http::MultipartOptions` allows to configure extraction process.
pub struct BatchRequest(pub async_graphql::BatchRequest);

impl BatchRequest {
    /// Unwraps the value to `async_graphql::BatchRequest`.
    #[must_use]
    pub fn into_inner(self) -> async_graphql::BatchRequest {
        eprintln!("BatchRequest::into_inner");
        self.0
    }
}

impl FromRequest for BatchRequest {
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<BatchRequest>>>>;
    // type Config = MultipartOptions;

    fn from_request(req: &HttpRequest, payload: &mut Payload<PayloadStream>) -> Self::Future {
        eprintln!("BatchRequest::from_request");
        let config = MultipartOptions::default(); // max_file_size: None, max_num_files: None };
        // req.app_data::<Self::Config>().cloned().unwrap_or_default();

        if req.method() == Method::GET {
            let res = serde_urlencoded::from_str(req.query_string());
            Box::pin(async move { Ok(Self(async_graphql::BatchRequest::Single(res?))) })
        } else if req.method() == Method::POST {
            let content_type = req
                .headers()
                .get(http::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(|value| value.to_string());
            let mut wpayload = payload.take();
            Box::pin(async move {
                let mut bytes = actix_web::web::BytesMut::new();
                while let Some(item) = wpayload.next().await {
                    bytes.extend_from_slice(&item?);
                }
                let res = async_graphql::http::receive_batch_body(
                    content_type,
                    &bytes[..],
                    config
                ).await
                .map_err(|err| match err {
                    ParseRequestError::PayloadTooLarge => {
                        actix_web::error::ErrorPayloadTooLarge(err)
                    }
                    _ => actix_web::error::ErrorBadRequest(err),
                });
                if let Err(e) = &res {
                    eprintln!("ERR: {}", e);
                }
                Ok(BatchRequest(res?))
            })
        } else {
            Box::pin(async move {
                Err(actix_web::error::ErrorMethodNotAllowed(
                    "GraphQL only supports GET and POST requests",
                ))
            })
        }
    }
}

/// Responder for a GraphQL response.
///
/// This contains a batch response, but since regular responses are a type of batch response it
/// works for both.
pub struct Response(pub async_graphql::BatchResponse);

impl From<async_graphql::Response> for Response {
    fn from(resp: async_graphql::Response) -> Self {
        eprintln!("Response::from(async_gql::Response)");
        Self(resp.into())
    }
}

impl From<async_graphql::BatchResponse> for Response {
    fn from(resp: async_graphql::BatchResponse) -> Self {
        eprintln!("Response::from");
        Self(resp)
    }
}

impl Responder for Response {
    // Deprecated since https://github.com/actix/actix-web/pull/1891
    // type Error = Error;
    // type Future = Ready<Result<HttpResponse>>;

    fn respond_to(self, _req: &HttpRequest) -> HttpResponse {
        let mut res = HttpResponse::build(StatusCode::OK);
        res.content_type("application/json");
        if self.0.is_ok() {
            if let Some(cache_control) = self.0.cache_control().value() {
                // res.header("cache-control", cache_control);
                res.append_header(("cache-control", cache_control));
            }
        }
        for (name, value) in self.0.http_headers() {
            res.append_header((name, value));
            // res.header(name, value);
        }
        res.body(serde_json::to_string(&self.0).unwrap())
    }
}
