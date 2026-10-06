mod dpapi;

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::{json, Map, Value};

pub use dpapi::{open as open_secret, seal as seal_secret};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::write_atomic;
use crate::paths::same_path;

pub const FILE_NAME: &str = "credentials.json";
pub const ACCOUNTS_KEY: &str = "accounts";
pub const MIN_SECRET_LENGTH: usize = 32;
pub const DEVICE_FIELD: &str = "device_id";
pub const ACCOUNT_FIELD: &str = "account_id";
pub const SEALED_FIELD: &str = "secret_dpapi";
pub const LEGACY_SECRET_FIELD: &str = "secret";
pub const LEGACY_BOUND_FIELD: &str = "bound_at";
pub const PUBLIC_FIELDS: [&str; 2] = [DEVICE_FIELD, ACCOUNT_FIELD];
pub const UTF8_BOM: char = '\u{feff}';

#[derive(Debug, Clone, PartialEq)]
pub struct Credentials {
    pub device_id: String,
    pub secret: String,
    pub account_id: u64,
    pub bound_at: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountBinding {
    pub account_id: u64,
    pub device_id: String,
    pub bound_at: Option<f64>,
}

impl Credentials {
    pub fn is_valid(&self) -> bool {
        !self.device_id.is_empty() && self.secret.len() >= MIN_SECRET_LENGTH && self.account_id > 0
    }

    pub fn binding(&self) -> AccountBinding {
        AccountBinding { account_id: self.account_id, device_id: self.device_id.clone(), bound_at: self.bound_at }
    }

    fn public_entry(&self) -> Map<String, Value> {
        let mut entry = Map::new();

        entry.insert(DEVICE_FIELD.to_owned(), json!(self.device_id));
        entry.insert(ACCOUNT_FIELD.to_owned(), json!(self.account_id));
        entry
    }
}

fn read_accounts(path: &Path) -> Map<String, Value> {
    let value = std::fs::read_to_string(path).ok().and_then(|text| serde_json::from_str::<Value>(text.trim_start_matches(UTF8_BOM)).ok());

    match value.as_ref().and_then(|value| value.get(ACCOUNTS_KEY)) {
        Some(Value::Object(accounts)) => accounts.clone(),
        _ => Map::new(),
    }
}

fn text_field<'a>(entry: &'a Map<String, Value>, field: &str) -> Option<&'a str> {
    entry.get(field).and_then(Value::as_str).filter(|text| !text.is_empty())
}

fn has_legacy_fields(entry: &Value) -> bool {
    entry.as_object().is_some_and(|entry| entry.keys().any(|key| !PUBLIC_FIELDS.contains(&key.as_str())))
}

struct Loaded {
    stored: Vec<Credentials>,
    stale: bool,
}

pub struct CredentialStore {
    pub configs_dir: PathBuf,
    pub durable_dir: PathBuf,
}

impl CredentialStore {
    pub fn new(configs_dir: impl Into<PathBuf>, durable_dir: impl Into<PathBuf>) -> Self {
        Self { configs_dir: configs_dir.into(), durable_dir: durable_dir.into() }
    }

    fn public_path(&self) -> PathBuf {
        self.configs_dir.join(FILE_NAME)
    }

    fn private_path(&self) -> PathBuf {
        self.durable_dir.join(FILE_NAME)
    }

    fn is_single_file(&self) -> bool {
        same_path(&self.configs_dir, &self.durable_dir)
    }

    fn read(&self) -> Loaded {
        let private = read_accounts(&self.private_path());
        let public = if self.is_single_file() { Map::new() } else { read_accounts(&self.public_path()) };
        let empty = Map::new();
        let mut plaintext = false;
        let mut stored = Vec::new();

        for key in private.keys().chain(public.keys()).collect::<BTreeSet<_>>() {
            let own = private.get(key).and_then(Value::as_object);
            let shown = public.get(key).and_then(Value::as_object);
            let source = own.or(shown).unwrap_or(&empty);
            let sealed = own.and_then(|entry| text_field(entry, SEALED_FIELD)).and_then(open_secret);
            let legacy = [own, shown].into_iter().flatten().find_map(|entry| text_field(entry, LEGACY_SECRET_FIELD)).map(str::to_owned);

            plaintext |= sealed.is_none() && legacy.is_some();

            let credentials = Credentials {
                device_id: text_field(source, DEVICE_FIELD).unwrap_or_default().to_owned(),
                secret: sealed.or(legacy).unwrap_or_default(),
                account_id: source.get(ACCOUNT_FIELD).and_then(Value::as_u64).unwrap_or_default(),
                bound_at: source.get(LEGACY_BOUND_FIELD).and_then(Value::as_f64),
            };

            if credentials.is_valid() {
                stored.push(credentials);
            }
        }

        let stored_keys: BTreeSet<String> = stored.iter().map(|credentials| credentials.account_id.to_string()).collect();
        let public_keys: BTreeSet<String> = public.keys().cloned().collect();
        let public_stale = !self.is_single_file() && (public_keys != stored_keys || public.values().any(has_legacy_fields));

        Loaded { stale: plaintext || public_stale, stored }
    }

    fn persist(&self, stored: &[Credentials]) -> AppResult<()> {
        let mut public = Map::new();
        let mut private = Map::new();

        for credentials in stored {
            let sealed = seal_secret(&credentials.secret)
                .ok_or_else(|| AppError::coded(ErrorCode::Io, "Windows could not protect the device secret (DPAPI)"))?;
            let mut entry = credentials.public_entry();

            public.insert(credentials.account_id.to_string(), Value::Object(entry.clone()));
            entry.insert(SEALED_FIELD.to_owned(), json!(sealed));
            private.insert(credentials.account_id.to_string(), Value::Object(entry));
        }

        write_atomic(&self.private_path(), &serde_json::to_vec_pretty(&json!({ ACCOUNTS_KEY: private }))?)?;

        if !self.is_single_file() {
            write_atomic(&self.public_path(), &serde_json::to_vec_pretty(&json!({ ACCOUNTS_KEY: public }))?)?;
        }

        Ok(())
    }

    pub fn load(&self) -> Vec<Credentials> {
        let Loaded { mut stored, stale } = self.read();

        if stale {
            if let Err(error) = self.persist(&stored) {
                log::warn!("rewrite the credentials in the protected format: {error}");
            }
        }

        stored.sort_by(|left, right| {
            right.bound_at.unwrap_or_default().total_cmp(&left.bound_at.unwrap_or_default()).then(left.account_id.cmp(&right.account_id))
        });
        stored
    }

    pub fn find(&self, account_id: Option<u64>) -> Option<Credentials> {
        let accounts = self.load();

        account_id.and_then(|id| accounts.iter().find(|credentials| credentials.account_id == id).cloned()).or_else(|| accounts.into_iter().next())
    }

    pub fn save(&self, credentials: &Credentials) -> AppResult<()> {
        let mut stored = self.read().stored;

        stored.retain(|known| known.account_id != credentials.account_id);
        stored.push(credentials.clone());

        self.persist(&stored)
    }
}

#[cfg(test)]
mod tests;
