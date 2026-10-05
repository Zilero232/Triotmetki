mod codec;
mod merge;

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub use codec::{decode, encode, from_file_text, library_from_text, to_file_text, MAX_FILE_BYTES};
pub use merge::merge;

use crate::durable::now_seconds;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::{rename_file, sibling, write_atomic};
use crate::profiles::{new_id, NAME_MAX_LENGTH};

pub const FILE_NAME: &str = "sets.json";
pub const FILE_VERSION: u32 = 1;
pub const MAX_SETS: usize = 12;
pub const MAX_COMPONENTS: usize = 200;
pub const MAX_TOMBSTONES: usize = 100;
pub const MAX_ID_LENGTH: usize = 64;
pub const SET_EXTENSION: &str = "tmset";
pub const LIBRARY_EXTENSION: &str = "json";
pub const DAMAGED_SUFFIX: &str = ".damaged";

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

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetsView {
    pub max: usize,
    pub sets: Vec<ComponentSet>,
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

fn read_limited(source: &Path) -> AppResult<String> {
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

            true
        });
        self.sets.truncate(MAX_SETS);
        self.deleted.retain(|tombstone| is_set_id(&tombstone.id));

        let excess = self.deleted.len().saturating_sub(MAX_TOMBSTONES);

        self.deleted.drain(..excess);
        self
    }

    pub fn view(&self) -> SetsView {
        SetsView { max: MAX_SETS, sets: self.sets.clone() }
    }

    pub fn get(&self, id: &str) -> AppResult<&ComponentSet> {
        self.sets.iter().find(|set| set.id == id).ok_or_else(|| AppError::coded(ErrorCode::SetMissing, format!("no set {id}")))
    }

    fn get_mut(&mut self, id: &str) -> AppResult<&mut ComponentSet> {
        self.sets.iter_mut().find(|set| set.id == id).ok_or_else(|| AppError::coded(ErrorCode::SetMissing, format!("no set {id}")))
    }

    pub fn add(&mut self, name: &str, components: &[String]) -> AppResult<ComponentSet> {
        if self.sets.len() >= MAX_SETS {
            return Err(AppError::coded(ErrorCode::SetLimit, format!("at most {MAX_SETS} sets")));
        }

        let now = now_seconds();
        let id = std::iter::repeat_with(new_id).find(|candidate| self.get(candidate).is_err()).unwrap_or_else(new_id);
        let set = ComponentSet { id, name: normalize_name(name)?, components: normalize_components(components), created: now, updated: now };

        self.sets.push(set.clone());

        Ok(set)
    }

    pub fn rename(&mut self, id: &str, name: &str) -> AppResult<()> {
        let name = normalize_name(name)?;
        let set = self.get_mut(id)?;

        set.name = name;
        set.updated = now_seconds();

        Ok(())
    }

    pub fn duplicate(&mut self, id: &str, name: &str) -> AppResult<ComponentSet> {
        let components = self.get(id)?.components.clone();

        self.add(name, &components)
    }

    pub fn remove(&mut self, id: &str) -> AppResult<()> {
        self.get(id)?;
        self.sets.retain(|set| set.id != id);
        self.deleted.retain(|tombstone| tombstone.id != id);
        self.deleted.push(Tombstone { id: id.to_owned(), deleted: now_seconds() });

        let excess = self.deleted.len().saturating_sub(MAX_TOMBSTONES);

        self.deleted.drain(..excess);

        Ok(())
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

    pub fn update<T>(&self, change: impl FnOnce(&mut SetsFile) -> AppResult<T>) -> AppResult<T> {
        let mut file = match self.read()? {
            Stored::Read(file) => file,
            Stored::Damaged(reason) => {
                log::warn!("sets: {} does not parse ({reason}), kept aside", self.path.display());
                rename_file(&self.path, &sibling(&self.path, DAMAGED_SUFFIX))?;
                SetsFile::default()
            }
            Stored::Missing => SetsFile::default(),
        };
        let result = change(&mut file)?;

        write_atomic(&self.path, serde_json::to_string_pretty(&file)?.as_bytes())?;

        Ok(result)
    }

    pub fn export_code(&self, id: &str) -> AppResult<String> {
        let file = self.load();
        let set = file.get(id)?;

        encode(&set.name, &set.components)
    }

    pub fn import_code(&self, code: &str, name: Option<&str>) -> AppResult<ComponentSet> {
        let (decoded_name, components) = decode(code)?;

        self.update(|file| file.add(name.filter(|name| !name.trim().is_empty()).unwrap_or(&decoded_name), &components))
    }

    pub fn export_file(&self, id: &str, target: &Path) -> AppResult<PathBuf> {
        let file = self.load();
        let set = file.get(id)?;
        let target = with_extension(target, SET_EXTENSION);

        write_atomic(&target, to_file_text(&set.name, &set.components)?.as_bytes())?;

        Ok(target)
    }

    pub fn export_library(&self, target: &Path) -> AppResult<PathBuf> {
        let target = with_extension(target, LIBRARY_EXTENSION);

        write_atomic(&target, format!("{}\n", serde_json::to_string_pretty(&self.load())?).as_bytes())?;

        Ok(target)
    }

    pub fn import_file(&self, source: &Path) -> AppResult<()> {
        let text = read_limited(source)?;

        if let Some(library) = library_from_text(&text) {
            let library = library.sanitized();

            return self.update(|file| {
                *file = merge(file, &library);

                Ok(())
            });
        }

        let (name, components) = from_file_text(&text)?;

        self.update(|file| file.add(&name, &components).map(drop))
    }
}

#[cfg(test)]
mod tests;
