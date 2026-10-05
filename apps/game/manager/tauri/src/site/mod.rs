mod signing;

use std::sync::Mutex;
use std::time::Duration;

use reqwest::header::HeaderMap;
use reqwest::{Method, StatusCode};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

pub use signing::{new_nonce, sign, signed_message, SignedMessage};

use crate::credentials::Credentials;
use crate::durable::now_seconds;
use crate::error::{AppError, AppResult, ErrorCode};

pub const DEVICE_HEADER: &str = "x-otmetki-device";
pub const SIGNATURE_HEADER: &str = "x-otmetki-signature";
pub const TIMESTAMP_HEADER: &str = "x-otmetki-timestamp";
pub const NONCE_HEADER: &str = "x-otmetki-nonce";
pub const SERVER_TIME_HEADER: &str = "x-otmetki-server-time";
pub const SIGNATURE_VERSION: &str = "v2";
pub const SIGNATURE_PREFIX: &str = "sha256=";
pub const NONCE_BYTES: usize = 16;
pub const STALE_REQUEST: StatusCode = StatusCode::PRECONDITION_REQUIRED;
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(20);
pub const UPLOAD_TIMEOUT: Duration = Duration::from_secs(60);
pub const BIND_PATH: &str = "/mod/bind";
pub const REALM: &str = "RU";
pub const MOD_VERSION_PREFIX: &str = "manager ";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct BindRequest {
    pub code: String,
    pub mod_version: String,
    pub client_version: String,
    pub realm: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct BindResponse {
    pub device_id: String,
    pub secret: String,
    pub account_id: u64,
    #[serde(default)]
    pub nickname: Option<String>,
}

pub fn normalize_code(code: &str) -> Option<String> {
    let normalized: String = code.chars().filter(|c| !c.is_whitespace() && *c != '-').collect::<String>().to_uppercase();
    let valid = (8..=16).contains(&normalized.len()) && normalized.chars().all(|c| c.is_ascii_alphanumeric());

    valid.then_some(normalized)
}

pub fn network_error(error: reqwest::Error) -> AppError {
    if error.is_connect() || error.is_timeout() || error.is_request() {
        return AppError::coded(ErrorCode::SiteOffline, error.to_string());
    }

    AppError::Http(error)
}

pub fn status_error(status: StatusCode) -> AppError {
    let code = match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => ErrorCode::LinkRevoked,
        StatusCode::NOT_FOUND | StatusCode::METHOD_NOT_ALLOWED => ErrorCode::SyncUnavailable,
        StatusCode::TOO_MANY_REQUESTS => ErrorCode::RateLimited,
        _ => ErrorCode::Http,
    };

    AppError::coded(code, format!("the site answered {status}"))
}

pub fn server_time(headers: &HeaderMap) -> Option<f64> {
    headers.get(SERVER_TIME_HEADER)?.to_str().ok()?.trim().parse::<f64>().ok().filter(|time| time.is_finite() && *time > 0.0)
}

pub struct SiteClient {
    base_url: String,
    http: reqwest::Client,
    clock_offset: Mutex<f64>,
}

async fn read_json<T: DeserializeOwned>(response: reqwest::Response) -> AppResult<T> {
    let status = response.status();

    if !status.is_success() {
        return Err(status_error(status));
    }

    response.json().await.map_err(network_error)
}

impl SiteClient {
    pub fn new(base_url: impl Into<String>) -> AppResult<Self> {
        let http = reqwest::Client::builder()
            .user_agent(concat!("Three Marks manager/", env!("MANAGER_VERSION")))
            .redirect(reqwest::redirect::Policy::none())
            .timeout(REQUEST_TIMEOUT)
            .build()?;

        Ok(Self { base_url: base_url.into(), http, clock_offset: Mutex::new(0.0) })
    }

    fn url(&self, path: &str) -> String {
        format!("{}{path}", self.base_url)
    }

    fn timestamp(&self) -> String {
        let offset = self.clock_offset.lock().map(|offset| *offset).unwrap_or_default();

        format!("{}", (now_seconds() + offset).floor() as i64)
    }

    fn sync_clock(&self, headers: &HeaderMap) -> bool {
        let (Some(server), Ok(mut offset)) = (server_time(headers), self.clock_offset.lock()) else {
            return false;
        };

        *offset = server - now_seconds();

        true
    }

    pub async fn bind(&self, request: &BindRequest) -> AppResult<BindResponse> {
        let response = self.http.post(self.url(BIND_PATH)).json(request).send().await.map_err(network_error)?;

        match response.status() {
            StatusCode::BAD_REQUEST | StatusCode::UNPROCESSABLE_ENTITY => Err(AppError::coded(ErrorCode::LinkCode, "the site refused the code")),
            StatusCode::FORBIDDEN => Err(AppError::coded(ErrorCode::LinkCode, "the code belongs to no linked account")),
            _ => read_json(response).await,
        }
    }

    async fn send_signed(&self, method: &Method, path: &str, credentials: &Credentials, body: &[u8]) -> AppResult<reqwest::Response> {
        let timestamp = self.timestamp();
        let nonce = new_nonce();
        let message = signed_message(&SignedMessage { method: method.as_str(), path, timestamp: &timestamp, nonce: &nonce, body });
        let signature = sign(&credentials.secret, &message)?;

        self.http
            .request(method.clone(), self.url(path))
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .header(DEVICE_HEADER, &credentials.device_id)
            .header(TIMESTAMP_HEADER, &timestamp)
            .header(NONCE_HEADER, &nonce)
            .header(SIGNATURE_HEADER, signature)
            .body(body.to_vec())
            .send()
            .await
            .map_err(network_error)
    }

    pub async fn signed<T: DeserializeOwned>(&self, method: Method, path: &str, credentials: &Credentials, body: &impl Serialize) -> AppResult<T> {
        let bytes = serde_json::to_vec(body)?;
        let response = self.send_signed(&method, path, credentials, &bytes).await?;

        if response.status() == STALE_REQUEST && self.sync_clock(response.headers()) {
            return read_json(self.send_signed(&method, path, credentials, &bytes).await?).await;
        }

        read_json(response).await
    }

    pub async fn post<T: DeserializeOwned>(&self, path: &str, body: &impl Serialize) -> AppResult<T> {
        let response = self.http.post(self.url(path)).timeout(UPLOAD_TIMEOUT).json(body).send().await.map_err(network_error)?;

        read_json(response).await
    }
}

#[cfg(test)]
mod tests;
