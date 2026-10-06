use std::path::{Path, PathBuf};

use sanitize_filename::{is_sanitized_with_options, sanitize_with_options, Options, OptionsForCheck};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::releases::debug_env;
use crate::state::client_key;

pub const APP_FOLDER: &str = "TriOtmetki";
pub const STATE_ROOT_ENV: &str = "OTMETKI_STATE_ROOT";
pub const ROAMING_ROOT_ENV: &str = "OTMETKI_ROAMING_ROOT";

#[derive(Debug, Clone)]
pub struct Layout {
    pub state_root: PathBuf,
    pub roaming_root: PathBuf,
}

impl Layout {
    pub fn new(state_root: impl Into<PathBuf>, roaming_root: impl Into<PathBuf>) -> Self {
        Self { state_root: state_root.into(), roaming_root: roaming_root.into() }
    }

    pub fn from_env() -> AppResult<Self> {
        let state_root = debug_env(STATE_ROOT_ENV)
            .map(PathBuf::from)
            .or_else(|| dirs::data_local_dir().map(|dir| dir.join(APP_FOLDER)))
            .ok_or_else(|| AppError::coded(ErrorCode::InvalidPath, "no local app data folder"))?;
        let roaming_root = debug_env(ROAMING_ROOT_ENV)
            .map(PathBuf::from)
            .or_else(|| dirs::data_dir().map(|dir| dir.join(APP_FOLDER)))
            .ok_or_else(|| AppError::coded(ErrorCode::InvalidPath, "no roaming app data folder"))?;

        Ok(Self::new(state_root, roaming_root))
    }

    pub fn clients_dir(&self) -> PathBuf {
        self.state_root.join("clients")
    }

    pub fn client_dir(&self, client_path: &Path) -> PathBuf {
        self.clients_dir().join(client_key(client_path))
    }

    pub fn manager_dir(&self) -> PathBuf {
        self.state_root.join("manager")
    }

    pub fn catalog_cache(&self) -> PathBuf {
        self.manager_dir().join("components.json")
    }

    pub fn logs_dir(&self) -> PathBuf {
        self.manager_dir().join("logs")
    }

    pub fn settings_file(&self) -> PathBuf {
        self.roaming_root.join("manager").join("settings.json")
    }

    pub fn manager_state_file(&self) -> PathBuf {
        self.roaming_root.join("manager").join("state.json")
    }

    pub fn changelog_cache(&self) -> PathBuf {
        self.manager_dir().join("changelog.json")
    }

    pub fn durable_dir(&self) -> PathBuf {
        self.roaming_root.clone()
    }

    pub fn sets_file(&self) -> PathBuf {
        self.roaming_root.join("manager").join(crate::sets::FILE_NAME)
    }

    pub fn app_data_dir(&self) -> PathBuf {
        self.roaming_root.parent().map_or_else(|| self.roaming_root.clone(), Path::to_path_buf)
    }
}

pub fn configs_dir(client_path: &Path) -> PathBuf {
    client_path.join("mods").join("configs").join("otmetki")
}

pub fn join_relative(root: &Path, relative: &str) -> Option<PathBuf> {
    let parts: Vec<&str> = relative.split(['/', '\\']).filter(|part| !part.is_empty() && *part != ".").collect();

    if parts.iter().any(|part| *part == ".." || part.contains(':')) {
        return None;
    }

    Some(parts.into_iter().fold(root.to_path_buf(), |path, part| path.join(part)))
}

pub fn same_path(left: &Path, right: &Path) -> bool {
    normalized(left) == normalized(right)
}

pub fn normalized(path: &Path) -> String {
    let text = path.to_string_lossy().replace('/', "\\");
    let trimmed = if text.len() > 3 { text.trim_end_matches('\\') } else { text.as_str() };

    trimmed.to_lowercase()
}

pub const FILE_NAME_MAX_CHARS: usize = 120;
pub const FILE_NAME_REPLACEMENT: &str = "_";
pub const WINDOWS_CHECK: OptionsForCheck = OptionsForCheck { windows: true, truncate: true };

pub fn safe_file_name(name: &str, fallback: &str) -> String {
    let visible: String = name.chars().filter(|c| !c.is_control()).take(FILE_NAME_MAX_CHARS).collect();
    let trimmed = visible.trim().trim_start_matches('.');
    let replaced = sanitize_with_options(trimmed, Options { windows: false, truncate: true, replacement: FILE_NAME_REPLACEMENT });
    let safe = sanitize_with_options(replaced, Options { windows: true, truncate: true, replacement: "" });

    if safe.is_empty() || !is_sanitized_with_options(&safe, WINDOWS_CHECK) {
        fallback.to_owned()
    } else {
        safe
    }
}

#[cfg(test)]
mod tests;
