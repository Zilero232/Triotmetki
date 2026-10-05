use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde_json::{json, Map, Value};

use crate::error::AppResult;
use crate::fsx::remove_path;
pub use crate::fsx::write_atomic;

pub const STAMPS_NAME: &str = "saved_at.json";
pub const STAMPS_VERSION: u32 = 1;
pub const STAMP_TOLERANCE_S: f64 = 0.01;
pub const MIRRORED_FILES: [&str; 5] = ["credentials.json", "config.json", "components.json", "profiles.json", "state.json"];

pub fn now_seconds() -> f64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|time| time.as_secs_f64()).unwrap_or_default()
}

fn read_json(path: &Path) -> Option<Value> {
    let text = fs::read_to_string(path).ok()?;

    serde_json::from_str(text.trim_start_matches('\u{feff}')).ok()
}

fn set_mtime(path: &Path, stamp: f64) {
    let Some(time) = UNIX_EPOCH.checked_add(Duration::from_secs_f64(stamp.max(0.0))) else {
        return;
    };
    let touched = fs::OpenOptions::new().write(true).open(path).and_then(|file| file.set_modified(time));

    if let Err(error) = touched {
        log::warn!("mtime of {}: {error}", path.display());
    }
}

fn stamp_entry(dir: &Path, name: &str) -> Option<f64> {
    read_json(&dir.join(STAMPS_NAME))?.get("files")?.get(name)?.as_f64()
}

fn mtime(path: &Path) -> Option<f64> {
    fs::metadata(path).ok()?.modified().ok()?.duration_since(UNIX_EPOCH).ok().map(|time| time.as_secs_f64())
}

pub fn stamp_of(dir: &Path, name: &str) -> f64 {
    [stamp_entry(dir, name), mtime(&dir.join(name))].into_iter().flatten().fold(0.0, f64::max)
}

fn change_stamps(dir: &Path, change: impl FnOnce(&mut Map<String, Value>)) -> AppResult<()> {
    let mut stamps = read_json(&dir.join(STAMPS_NAME)).filter(Value::is_object).unwrap_or_else(|| json!({}));
    let files =
        stamps.as_object_mut().map(|object| object.entry("files").or_insert_with(|| Value::Object(Map::new()))).filter(|files| files.is_object());

    if let Some(Value::Object(files)) = files {
        change(files);
    }

    stamps["version"] = json!(STAMPS_VERSION);
    write_atomic(&dir.join(STAMPS_NAME), serde_json::to_string_pretty(&stamps)?.as_bytes())
}

fn set_stamp(dir: &Path, name: &str, stamp: f64) -> AppResult<()> {
    change_stamps(dir, |files| {
        files.insert(name.to_owned(), json!(stamp));
    })
}

pub fn remove_durable_copies(durable_dir: &Path) -> AppResult<Vec<PathBuf>> {
    let mut removed = Vec::new();

    for name in MIRRORED_FILES {
        let path = durable_dir.join(name);

        if path.is_file() {
            remove_path(&path)?;
            removed.push(path);
        }
    }

    if durable_dir.join(STAMPS_NAME).is_file() {
        change_stamps(durable_dir, |files| {
            for name in MIRRORED_FILES {
                files.remove(name);
            }
        })?;
    }

    Ok(removed)
}

pub struct MirroredFile {
    pub name: &'static str,
    pub game_dir: PathBuf,
    pub durable_dir: PathBuf,
}

impl MirroredFile {
    pub fn new(name: &'static str, game_dir: &Path, durable_dir: &Path) -> Self {
        Self { name, game_dir: game_dir.to_path_buf(), durable_dir: durable_dir.to_path_buf() }
    }

    fn write_copy(&self, dir: &Path, bytes: &[u8], stamp: f64) -> AppResult<()> {
        write_atomic(&dir.join(self.name), bytes)?;
        set_mtime(&dir.join(self.name), stamp);
        set_stamp(dir, self.name, stamp)
    }

    pub fn read(&self) -> Option<Value> {
        let game = read_json(&self.game_dir.join(self.name));
        let durable = read_json(&self.durable_dir.join(self.name));
        let game_stamp = stamp_of(&self.game_dir, self.name);
        let durable_stamp = stamp_of(&self.durable_dir, self.name);

        match (game, durable) {
            (Some(_), Some(durable)) if durable_stamp > game_stamp + STAMP_TOLERANCE_S => {
                self.restore_game_copy(&durable, durable_stamp);

                Some(durable)
            }
            (Some(game), durable) => {
                if durable.is_none() || game_stamp > durable_stamp + STAMP_TOLERANCE_S {
                    self.refresh_durable_copy(&game, game_stamp);
                }

                Some(game)
            }
            (None, Some(durable)) => {
                self.restore_game_copy(&durable, durable_stamp);

                Some(durable)
            }
            (None, None) => None,
        }
    }

    fn copy_into(&self, dir: &Path, value: &Value, stamp: f64) {
        let written = serde_json::to_string_pretty(value).map_err(Into::into).and_then(|text| self.write_copy(dir, text.as_bytes(), stamp));

        if let Err(error) = written {
            log::warn!("restore {} in {}: {error}", self.name, dir.display());
        }
    }

    fn restore_game_copy(&self, value: &Value, stamp: f64) {
        if self.game_dir.is_dir() {
            self.copy_into(&self.game_dir, value, stamp);
        }
    }

    fn refresh_durable_copy(&self, value: &Value, stamp: f64) {
        if stamp > 0.0 {
            self.copy_into(&self.durable_dir, value, stamp);
        }
    }

    pub fn write(&self, value: &impl serde::Serialize) -> AppResult<()> {
        self.write_bytes(serde_json::to_string_pretty(value)?.as_bytes())
    }

    pub fn write_bytes(&self, bytes: &[u8]) -> AppResult<()> {
        let stamp = now_seconds();

        self.write_copy(&self.game_dir, bytes, stamp)?;

        if let Err(error) = self.write_copy(&self.durable_dir, bytes, stamp) {
            log::warn!("durable copy of {}: {error}", self.name);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests;
