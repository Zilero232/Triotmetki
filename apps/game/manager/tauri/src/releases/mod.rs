mod sequence;
mod signature;
mod sources;

use std::time::Duration;

use sanitize_filename::is_sanitized_with_options;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub use sequence::{Freshness, RememberInput, SequenceStore, SEQUENCES_FILE};
pub use signature::verify_release;
pub use sources::{is_dependency_redirect, is_dependency_source};

use crate::catalog::Localized;
use crate::changelog::{Changelog, CHANGELOG_LIMIT, CHANGELOG_PATH};
use crate::error::{AppError, AppResult, ErrorCode};
use crate::paths::WINDOWS_CHECK;

pub const DEFAULT_API_URL: &str = "https://api.triotmetki.ru";
pub const API_URL_ENV: &str = "OTMETKI_API_URL";
pub const LATEST_PATH: &str = "/modpack/releases/latest";
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);
pub const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(300);
pub const TRUSTED_DOMAIN: &str = "triotmetki.ru";
pub const HTTPS: &str = "https";
pub const LOOPBACK_HOSTS: [&str; 3] = ["localhost", "127.0.0.1", "[::1]"];
pub const MAX_REDIRECTS: usize = 5;
pub const MAX_PACKAGE_BYTES: u64 = 256 * 1024 * 1024;
pub const MAX_CATALOG_BYTES: u64 = 16 * 1024 * 1024;
pub const MAX_NOTICE_BYTES: u64 = 256 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReleaseStatus {
    Compatible,
    Waiting,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleasePackage {
    pub id: String,
    pub file: String,
    pub url: String,
    pub sha256: String,
    pub size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseCatalog {
    pub url: String,
    pub sha256: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    pub version: String,
    pub published_at: String,
    pub games: Vec<String>,
    #[serde(default)]
    pub notes: Option<Localized>,
    #[serde(default)]
    pub catalog: Option<ReleaseCatalog>,
    pub packages: Vec<ReleasePackage>,
    #[serde(default)]
    pub signature: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LatestRelease {
    pub game: String,
    pub status: ReleaseStatus,
    pub release: Option<Release>,
}

pub const GAME_WILDCARD: &str = "*";

pub fn matches_game(pattern: &str, game: &str) -> bool {
    let number = |part: &str| part.trim().parse::<u64>().ok();
    let wanted: Vec<&str> = pattern.trim().split('.').collect();
    let actual: Vec<&str> = game.trim().split('.').collect();

    for (index, part) in wanted.iter().enumerate() {
        if *part == GAME_WILDCARD {
            return true;
        }

        if number(part).is_none() || number(part) != number(actual.get(index).copied().unwrap_or("0")) {
            return false;
        }
    }

    actual.iter().skip(wanted.len()).all(|part| number(part) == Some(0))
}

pub fn for_game(mut latest: LatestRelease, game: &str) -> LatestRelease {
    let supported = latest.release.as_ref().is_some_and(|release| release.games.iter().any(|pattern| matches_game(pattern, game)));

    if latest.status == ReleaseStatus::Compatible && !supported {
        log::warn!("the release offered for {game} does not list it among its games");
        latest.status = ReleaseStatus::Waiting;
    }

    latest
}

pub fn without_release(latest: LatestRelease) -> LatestRelease {
    LatestRelease { status: ReleaseStatus::Waiting, release: None, ..latest }
}

impl Release {
    pub fn package(&self, id: &str) -> Option<&ReleasePackage> {
        self.packages.iter().find(|package| package.id == id)
    }
}

pub fn debug_env(name: &str) -> Option<String> {
    if cfg!(debug_assertions) {
        std::env::var(name).ok()
    } else {
        None
    }
}

pub fn api_url() -> String {
    debug_env(API_URL_ENV).filter(|url| !url.trim().is_empty()).unwrap_or_else(|| DEFAULT_API_URL.to_owned()).trim_end_matches('/').to_owned()
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

pub fn verify_sha256(bytes: &[u8], expected: &str) -> AppResult<()> {
    let actual = sha256_hex(bytes);

    if !actual.eq_ignore_ascii_case(expected.trim()) {
        return Err(AppError::coded(ErrorCode::ChecksumMismatch, format!("expected {expected}, got {actual}")));
    }

    Ok(())
}

pub fn safe_file_name(name: &str) -> AppResult<&str> {
    let stem = name.split('.').next().unwrap_or_default().trim_end();
    let valid = !name.is_empty()
        && !name.chars().any(char::is_control)
        && is_sanitized_with_options(name, WINDOWS_CHECK)
        && is_sanitized_with_options(stem, WINDOWS_CHECK);

    if !valid {
        return Err(AppError::coded(ErrorCode::InvalidPath, format!("bad package file name {name}")));
    }

    Ok(name)
}

#[derive(Clone)]
pub struct ReleasesClient {
    base_url: String,
    http: reqwest::Client,
    dependency_http: reqwest::Client,
    sequences: Option<SequenceStore>,
}

pub fn is_trusted_host(host: &str) -> bool {
    let host = host.trim_end_matches('.').to_ascii_lowercase();

    host == TRUSTED_DOMAIN || host.ends_with(&format!(".{TRUSTED_DOMAIN}"))
}

fn is_dev_loopback(parsed: &reqwest::Url) -> bool {
    cfg!(debug_assertions) && parsed.host_str().is_some_and(|host| LOOPBACK_HOSTS.contains(&host))
}

pub fn is_trusted_url(url: &str, base_url: &str) -> bool {
    let Ok(parsed) = reqwest::Url::parse(url) else {
        return false;
    };
    let secure = parsed.scheme() == HTTPS || is_dev_loopback(&parsed);
    let from_api = url.strip_prefix(base_url).is_some_and(|rest| rest.starts_with('/'));
    let trusted = parsed.scheme() == HTTPS && parsed.host_str().is_some_and(is_trusted_host);

    trusted || (secure && from_api)
}

fn untrusted(url: &str) -> AppError {
    AppError::coded(ErrorCode::UntrustedHost, format!("refusing a download from {url}"))
}

fn too_large(url: &str) -> AppError {
    AppError::coded(ErrorCode::ChecksumMismatch, format!("unexpected size of {url}"))
}

pub struct FetchLimits {
    pub expected_size: Option<u64>,
    pub max_bytes: u64,
}

impl ReleasesClient {
    pub fn new(base_url: impl Into<String>) -> AppResult<Self> {
        let base_url: String = base_url.into();
        let redirect_base = base_url.clone();
        let redirects = reqwest::redirect::Policy::custom(move |attempt| {
            if attempt.previous().len() >= MAX_REDIRECTS {
                return attempt.error("too many redirects");
            }

            if is_trusted_url(attempt.url().as_str(), &redirect_base) {
                attempt.follow()
            } else {
                attempt.error("redirect to an untrusted host")
            }
        });
        let dependency_redirects = reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= MAX_REDIRECTS {
                return attempt.error("too many redirects");
            }

            if is_dependency_redirect(attempt.url()) {
                attempt.follow()
            } else {
                attempt.error("redirect to an untrusted host")
            }
        });
        let builder = || reqwest::Client::builder().user_agent(concat!("Three Marks manager/", env!("MANAGER_VERSION"))).timeout(DOWNLOAD_TIMEOUT);
        let http = builder().redirect(redirects).build()?;
        let dependency_http = builder().redirect(dependency_redirects).build()?;

        Ok(Self { base_url, http, dependency_http, sequences: None })
    }

    pub fn with_sequences(mut self, store: SequenceStore) -> Self {
        self.sequences = Some(store);
        self
    }

    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    pub async fn latest(&self, game: &str) -> AppResult<LatestRelease> {
        let response = self
            .http
            .get(format!("{}{LATEST_PATH}", self.base_url))
            .query(&[("game", game)])
            .timeout(REQUEST_TIMEOUT)
            .send()
            .await?
            .error_for_status()?;
        let latest: LatestRelease = response.json().await?;

        if self.is_older_than_seen(&latest, game)? {
            return Ok(without_release(latest));
        }

        Ok(for_game(latest, game))
    }

    fn is_older_than_seen(&self, latest: &LatestRelease, game: &str) -> AppResult<bool> {
        let Some(release) = &latest.release else {
            return Ok(false);
        };
        let sequence = verify_release(release)?;
        let (Some(store), Some(sequence)) = (&self.sequences, sequence) else {
            return Ok(false);
        };
        let freshness = store.remember(RememberInput { game, version: &release.version, sequence })?;

        Ok(freshness == Freshness::Older)
    }

    pub async fn changelog(&self) -> AppResult<Changelog> {
        let response = self
            .http
            .get(format!("{}{CHANGELOG_PATH}", self.base_url))
            .query(&[("limit", CHANGELOG_LIMIT)])
            .timeout(REQUEST_TIMEOUT)
            .send()
            .await?
            .error_for_status()?;

        Ok(response.json().await?)
    }

    pub async fn fetch(&self, url: &str, limits: FetchLimits) -> AppResult<Vec<u8>> {
        if !is_trusted_url(url, &self.base_url) {
            return Err(untrusted(url));
        }

        download(&self.http, url, limits).await
    }

    pub async fn fetch_dependency(&self, url: &str, limits: FetchLimits) -> AppResult<Vec<u8>> {
        if !is_dependency_source(url) {
            return Err(untrusted(url));
        }

        download(&self.dependency_http, url, limits).await
    }
}

async fn download(http: &reqwest::Client, url: &str, limits: FetchLimits) -> AppResult<Vec<u8>> {
    let mut response = http.get(url).send().await?.error_for_status()?;
    let max_bytes = limits.expected_size.map_or(limits.max_bytes, |size| size.min(limits.max_bytes));

    if response.content_length().is_some_and(|length| length > max_bytes) {
        return Err(too_large(url));
    }

    let mut bytes = Vec::new();

    while let Some(chunk) = response.chunk().await? {
        if bytes.len() as u64 + chunk.len() as u64 > max_bytes {
            return Err(too_large(url));
        }

        bytes.extend_from_slice(&chunk);
    }

    if limits.expected_size.is_some_and(|size| size != bytes.len() as u64) {
        return Err(too_large(url));
    }

    Ok(bytes)
}

#[cfg(test)]
pub mod fixtures;

#[cfg(test)]
mod tests;
