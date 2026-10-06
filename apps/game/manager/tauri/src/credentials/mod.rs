mod dpapi;
mod format;

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::{json, Map, Value};

pub use dpapi::{open as open_secret, seal as seal_secret};
pub use format::SecretFormat;

use crate::durable::MirroredFile;
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
pub const BOUND_FIELD: &str = "bound_at";
pub const PUBLIC_FIELDS: [&str; 3] = [DEVICE_FIELD, ACCOUNT_FIELD, BOUND_FIELD];
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

        if let Some(bound_at) = self.bound_at {
            entry.insert(BOUND_FIELD.to_owned(), json!(bound_at));
        }

        entry
    }

    fn plaintext_entry(&self) -> Map<String, Value> {
        let mut entry = self.public_entry();

        entry.insert(LEGACY_SECRET_FIELD.to_owned(), json!(self.secret));
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

fn has_extra_fields(entry: &Value) -> bool {
    entry.as_object().is_some_and(|entry| entry.keys().any(|key| !PUBLIC_FIELDS.contains(&key.as_str())))
}

#[derive(Debug, Clone)]
struct SealedAway {
    key: String,
    private: Option<Map<String, Value>>,
    public: Option<Map<String, Value>>,
}

struct Halves<'a> {
    key: &'a str,
    own: Option<&'a Map<String, Value>>,
    shown: Option<&'a Map<String, Value>>,
}

enum Entry {
    Usable { credentials: Credentials, plaintext: bool },
    SealedAway(SealedAway),
    Unusable,
}

fn read_entry(halves: &Halves) -> Entry {
    let sealed_text = halves.own.and_then(|entry| text_field(entry, SEALED_FIELD));
    let sealed = sealed_text.and_then(open_secret);
    let legacy = [halves.own, halves.shown].into_iter().flatten().find_map(|entry| text_field(entry, LEGACY_SECRET_FIELD)).map(str::to_owned);

    if sealed_text.is_some() && sealed.is_none() && legacy.is_none() {
        log::warn!("the protected secret of account {} did not open; it is kept to retry at the next start", halves.key);

        return Entry::SealedAway(SealedAway { key: halves.key.to_owned(), private: halves.own.cloned(), public: halves.shown.cloned() });
    }

    let source = halves.own.or(halves.shown).cloned().unwrap_or_default();
    let plaintext = sealed.is_none() && legacy.is_some();
    let credentials = Credentials {
        device_id: text_field(&source, DEVICE_FIELD).unwrap_or_default().to_owned(),
        secret: sealed.or(legacy).unwrap_or_default(),
        account_id: source.get(ACCOUNT_FIELD).and_then(Value::as_u64).unwrap_or_default(),
        bound_at: source.get(BOUND_FIELD).and_then(Value::as_f64),
    };

    if !credentials.is_valid() {
        return Entry::Unusable;
    }

    Entry::Usable { credentials, plaintext }
}

#[derive(Default)]
struct Loaded {
    stored: Vec<Credentials>,
    sealed_away: Vec<SealedAway>,
    plaintext: bool,
}

impl Loaded {
    fn keys(&self) -> BTreeSet<String> {
        let stored = self.stored.iter().map(|credentials| credentials.account_id.to_string());

        stored.chain(self.sealed_away.iter().map(|entry| entry.key.clone())).collect()
    }

    fn without(mut self, account_id: u64) -> Self {
        let key = account_id.to_string();

        self.stored.retain(|known| known.account_id != account_id);
        self.sealed_away.retain(|entry| entry.key != key);
        self
    }
}

pub struct CredentialStore {
    pub configs_dir: PathBuf,
    pub durable_dir: PathBuf,
    pub format: SecretFormat,
}

impl CredentialStore {
    pub fn new(configs_dir: impl Into<PathBuf>, durable_dir: impl Into<PathBuf>) -> Self {
        Self { configs_dir: configs_dir.into(), durable_dir: durable_dir.into(), format: SecretFormat::Plaintext }
    }

    pub fn with_format(mut self, format: SecretFormat) -> Self {
        self.format = format;
        self
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

    fn public_accounts(&self) -> Map<String, Value> {
        if self.is_single_file() {
            return Map::new();
        }

        read_accounts(&self.public_path())
    }

    fn read(&self) -> Loaded {
        let private = read_accounts(&self.private_path());
        let public = self.public_accounts();
        let mut loaded = Loaded::default();

        for key in private.keys().chain(public.keys()).collect::<BTreeSet<_>>() {
            let halves = Halves { key, own: private.get(key).and_then(Value::as_object), shown: public.get(key).and_then(Value::as_object) };

            match read_entry(&halves) {
                Entry::Usable { credentials, plaintext } => {
                    loaded.plaintext |= plaintext;
                    loaded.stored.push(credentials);
                }
                Entry::SealedAway(entry) => loaded.sealed_away.push(entry),
                Entry::Unusable => {}
            }
        }

        loaded
    }

    fn is_stale(&self, loaded: &Loaded) -> bool {
        if loaded.plaintext {
            return true;
        }

        if self.is_single_file() {
            return false;
        }

        let public = self.public_accounts();
        let public_keys: BTreeSet<String> = public.keys().cloned().collect();

        public_keys != loaded.keys() || public.values().any(has_extra_fields)
    }

    fn persist(&self, loaded: &Loaded) -> AppResult<()> {
        match self.format {
            SecretFormat::Sealed => self.persist_sealed(loaded),
            SecretFormat::Plaintext => self.persist_plaintext(loaded),
        }
    }

    fn persist_sealed(&self, loaded: &Loaded) -> AppResult<()> {
        let mut public = Map::new();
        let mut private = Map::new();

        for credentials in &loaded.stored {
            let sealed = seal_secret(&credentials.secret)
                .ok_or_else(|| AppError::coded(ErrorCode::Io, "Windows could not protect the device secret (DPAPI)"))?;
            let mut entry = credentials.public_entry();

            public.insert(credentials.account_id.to_string(), Value::Object(entry.clone()));
            entry.insert(SEALED_FIELD.to_owned(), json!(sealed));
            private.insert(credentials.account_id.to_string(), Value::Object(entry));
        }

        for entry in &loaded.sealed_away {
            if let Some(half) = &entry.private {
                private.insert(entry.key.clone(), Value::Object(half.clone()));
            }

            if let Some(half) = &entry.public {
                public.insert(entry.key.clone(), Value::Object(half.clone()));
            }
        }

        write_atomic(&self.private_path(), &serde_json::to_vec_pretty(&json!({ ACCOUNTS_KEY: private }))?)?;

        if !self.is_single_file() {
            write_atomic(&self.public_path(), &serde_json::to_vec_pretty(&json!({ ACCOUNTS_KEY: public }))?)?;
        }

        Ok(())
    }

    fn persist_plaintext(&self, loaded: &Loaded) -> AppResult<()> {
        let mut accounts = Map::new();

        for credentials in &loaded.stored {
            accounts.insert(credentials.account_id.to_string(), Value::Object(credentials.plaintext_entry()));
        }

        for entry in &loaded.sealed_away {
            if let Some(half) = entry.private.as_ref().or(entry.public.as_ref()) {
                accounts.insert(entry.key.clone(), Value::Object(half.clone()));
            }
        }

        MirroredFile::new(FILE_NAME, &self.configs_dir, &self.durable_dir).write(&json!({ ACCOUNTS_KEY: accounts }))
    }

    pub fn load(&self) -> Vec<Credentials> {
        let mut stored = self.read().stored;

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
        let mut loaded = self.read().without(credentials.account_id);

        loaded.stored.push(credentials.clone());

        self.persist(&loaded)
    }

    pub fn migrate(&self) -> AppResult<bool> {
        if self.format != SecretFormat::Sealed {
            return Ok(false);
        }

        let loaded = self.read();

        if !self.is_stale(&loaded) {
            return Ok(false);
        }

        self.persist(&loaded)?;

        Ok(true)
    }
}

#[cfg(test)]
mod tests;
