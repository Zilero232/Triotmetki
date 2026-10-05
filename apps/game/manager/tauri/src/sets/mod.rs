mod codec;
mod merge;

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub use codec::{decode, from_file_text, library_from_text, CODE_PREFIX, MAX_FILE_BYTES};
pub use merge::merge;

use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::{rename_file, sibling, write_atomic};
use crate::profiles::NAME_MAX_LENGTH;

pub const FILE_NAME: &str = "sets.json";
pub const FILE_VERSION: u32 = 1;
pub const MAX_SETS: usize = 12;
pub const MAX_COMPONENTS: usize = 200;
pub const MAX_TOMBSTONES: usize = 100;
pub const MAX_ID_LENGTH: usize = 64;
pub const SET_EXTENSION: &str = "tmset";
pub const LIBRARY_EXTENSION: &str = "json";
pub const DAMAGED_SUFFIX: &str = ".damaged";
pub const MIGRATION_FILE: &str = "sets-migration.json";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentSet {
    pub id: String,
    pub name: String,
    pub components: Vec<String>,
    pub created: f64,
    pub updated: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tombstone {
    pub id: String,
    pub deleted: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetsFile {
    pub version: u32,
    #[serde(default)]
    pub sets: Vec<ComponentSet>,
    #[serde(default)]
    pub deleted: Vec<Tombstone>,
    #[serde(default)]
    pub synced_at: Option<f64>,
    #[serde(default)]
    pub revision: Option<u64>,
}

impl Default for SetsFile {
    fn default() -> Self {
        Self { version: FILE_VERSION, sets: Vec::new(), deleted: Vec::new(), synced_at: None, revision: None }
    }
}

pub fn normalize_name(name: &str) -> AppResult<String> {
    let collapsed = name.split_whitespace().collect::<Vec<_>>().join(" ");
    let clipped: String = collapsed.chars().take(NAME_MAX_LENGTH).collect();
    let trimmed = clipped.trim();

    if trimmed.is_empty() {
        return Err(AppError::coded(ErrorCode::SetName, "empty set name"));
    }

    Ok(trimmed.to_owned())
}

pub fn is_component_id(id: &str) -> bool {
    id.len() <= MAX_ID_LENGTH
        && id.chars().next().is_some_and(|first| first.is_ascii_lowercase())
        && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

pub fn is_set_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= MAX_ID_LENGTH && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn with_extension(path: &Path, extension: &str) -> PathBuf {
    if path.extension().is_some_and(|current| current.eq_ignore_ascii_case(extension)) {
        return path.to_path_buf();
    }

    let mut name = path.as_os_str().to_owned();

    name.push(format!(".{extension}"));
    PathBuf::from(name)
}

pub fn read_limited(source: &Path) -> AppResult<String> {
    let mut text = String::new();

    fs::File::open(source)?.take(MAX_FILE_BYTES + 1).read_to_string(&mut text)?;

    if text.len() as u64 > MAX_FILE_BYTES {
        return Err(AppError::coded(ErrorCode::SetCode, "the set file is too large"));
    }

    Ok(text)
}

pub fn normalize_components(ids: &[String]) -> Vec<String> {
    let mut result: Vec<String> = Vec::new();

    for id in ids.iter().map(|id| id.trim()).filter(|id| is_component_id(id)) {
        if !result.iter().any(|known| known == id) {
            result.push(id.to_owned());
        }
    }

    result.truncate(MAX_COMPONENTS);
    result
}

impl SetsFile {
    pub fn sanitized(mut self) -> Self {
        let mut seen: Vec<String> = Vec::new();

        self.version = FILE_VERSION;
        self.sets.retain_mut(|set| {
            let Ok(name) = normalize_name(&set.name) else {
                return false;
            };

            if !is_set_id(&set.id) || seen.contains(&set.id) {
                return false;
            }

            seen.push(set.id.clone());
            set.name = name;
            set.components = normalize_components(&set.components);

            !set.components.is_empty()
        });
        self.sets.truncate(MAX_SETS);
        self.deleted.retain(|tombstone| is_set_id(&tombstone.id));

        let excess = self.deleted.len().saturating_sub(MAX_TOMBSTONES);

        self.deleted.drain(..excess);
        self
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Migration {
    pub migrated: Vec<String>,
}

impl Migration {
    pub fn path(client_dir: &Path) -> PathBuf {
        client_dir.join(MIGRATION_FILE)
    }

    pub fn load(client_dir: &Path) -> Self {
        fs::read_to_string(Self::path(client_dir)).ok().and_then(|text| serde_json::from_str(&text).ok()).unwrap_or_default()
    }

    pub fn save(&self, client_dir: &Path) -> AppResult<()> {
        write_atomic(&Self::path(client_dir), serde_json::to_string_pretty(self)?.as_bytes())
    }
}

enum Stored {
    Missing,
    Damaged(String),
    Read(SetsFile),
}

pub struct SetStore {
    pub path: PathBuf,
}

impl SetStore {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    fn read(&self) -> AppResult<Stored> {
        let bytes = match fs::read(&self.path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Stored::Missing),
            Err(error) => return Err(error.into()),
        };
        let parsed = std::str::from_utf8(&bytes)
            .map_err(|error| error.to_string())
            .and_then(|text| serde_json::from_str::<SetsFile>(text.trim_start_matches('\u{feff}')).map_err(|error| error.to_string()));

        Ok(parsed.map_or_else(Stored::Damaged, |file| Stored::Read(file.sanitized())))
    }

    pub fn load(&self) -> SetsFile {
        match self.read() {
            Ok(Stored::Read(file)) => file,
            _ => SetsFile::default(),
        }
    }

    pub fn absorb(&self, remote: &SetsFile) -> AppResult<()> {
        let local = match self.read()? {
            Stored::Read(file) => file,
            Stored::Damaged(reason) => {
                log::warn!("sets: {} does not parse ({reason}), kept aside", self.path.display());
                rename_file(&self.path, &sibling(&self.path, DAMAGED_SUFFIX))?;
                SetsFile::default()
            }
            Stored::Missing => SetsFile::default(),
        };
        let merged = merge(&local, &remote.clone().sanitized());

        if merged == local {
            return Ok(());
        }

        write_atomic(&self.path, serde_json::to_string_pretty(&merged)?.as_bytes())
    }
}

#[cfg(test)]
pub mod codec_for_tests {
    pub use super::codec::{encode, to_file_text};
}

#[cfg(test)]
mod tests;
