mod codec;

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

pub use codec::{decode, encode, Decoded, CODE_PREFIX};

use crate::durable::{now_seconds, MirroredFile};
use crate::error::{AppError, AppResult, ErrorCode};
use crate::random::random_hex;
use crate::sets::{self, normalize_components, ComponentSet};

pub const FILE_NAME: &str = "profiles.json";
pub const CONFIG_JSON: &str = "config.json";
pub const COMPONENTS_JSON: &str = "components.json";
pub const FILE_VERSION: u32 = 1;
pub const MAX_PROFILES: usize = 12;
pub const NAME_MAX_LENGTH: usize = 40;
pub const ID_BYTES: usize = 6;
pub const CODE_FILE_EXTENSION: &str = "txt";
pub const EXCLUDED_CONFIG_KEYS: [&str; 13] = [
    "enabled",
    "user_set",
    "defaults_revision",
    "server_url",
    "bind_code",
    "settings_action",
    "settings_target",
    "settings_anonymous_stats",
    "share_settings",
    "upload_replays",
    "publish_replays",
    "share_session_report",
    "show_pack_badge",
];
pub const EXCLUDED_CONFIG_PREFIXES: [&str; 2] = ["send_", "settings_include_"];
pub const EXCLUDED_SECTIONS: [&str; 1] = ["settings_window"];
pub const CODE_EXCLUDED_CONFIG_KEYS: [&str; 6] =
    ["hangar_auto_reserves", "hangar_auto_resupply", "hangar_depot_seller", "hangar_cleaner", "hangar_notification_filter", "battle_chat_filter"];
pub const CODE_EXCLUDED_SECTIONS: [&str; 6] =
    ["auto_reserves", "auto_resupply", "depot_seller", "hangar_cleaner", "notification_filter", "chat_filter"];
pub const CODE_EXCLUDED_SECTION_KEYS: [(&str, &[&str]); 1] = [("hangar_tweaks", &["quick_actions"])];
pub const CODE_RAW_SECTIONS: [&str; 1] = ["hud_layout_places"];

pub fn is_excluded(key: &str) -> bool {
    EXCLUDED_CONFIG_KEYS.contains(&key) || EXCLUDED_CONFIG_PREFIXES.iter().any(|prefix| key.starts_with(prefix))
}

fn code_excluded_section_keys(section: &str) -> &'static [&'static str] {
    CODE_EXCLUDED_SECTION_KEYS.iter().find(|(name, _)| *name == section).map_or(&[], |(_, keys)| keys)
}

pub struct ImportedInput<'a> {
    pub data: ProfileData,
    pub config: &'a Map<String, Value>,
    pub components: &'a Map<String, Value>,
}

pub fn imported_data(input: ImportedInput) -> ProfileData {
    let config = input
        .data
        .config
        .into_iter()
        .filter(|(key, _)| !is_excluded(key) && !CODE_EXCLUDED_CONFIG_KEYS.contains(&key.as_str()))
        .filter(|(key, value)| input.config.get(key).is_some_and(|current| same_kind(current, value)))
        .collect();
    let components = input
        .data
        .components
        .into_iter()
        .filter(|(key, _)| !EXCLUDED_SECTIONS.contains(&key.as_str()) && !CODE_EXCLUDED_SECTIONS.contains(&key.as_str()))
        .filter_map(|(key, section)| {
            let Value::Object(section) = section else {
                return None;
            };

            if CODE_RAW_SECTIONS.contains(&key.as_str()) {
                return Some((key, Value::Object(section)));
            }

            let Some(Value::Object(known)) = input.components.get(&key) else {
                return None;
            };
            let dropped = code_excluded_section_keys(&key);
            let kept: Map<String, Value> = section
                .into_iter()
                .filter(|(name, value)| !dropped.contains(&name.as_str()) && known.get(name).is_some_and(|current| same_kind(current, value)))
                .collect();

            Some((key, Value::Object(kept)))
        })
        .collect();

    ProfileData { config, components }
}

fn same_kind(left: &Value, right: &Value) -> bool {
    std::mem::discriminant(left) == std::mem::discriminant(right)
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ProfileData {
    #[serde(default)]
    pub config: Map<String, Value>,
    #[serde(default)]
    pub components: Map<String, Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated: Option<f64>,
    pub data: ProfileData,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub installed: Option<Vec<String>>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProfilesFile {
    pub version: u32,
    pub active: Option<String>,
    pub profiles: Vec<Profile>,
    #[serde(skip)]
    pub unreadable: Vec<Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSummary {
    pub id: String,
    pub name: String,
    pub created: Option<f64>,
    pub updated: Option<f64>,
    pub installed: Option<Vec<String>>,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfilesView {
    pub max: usize,
    pub active: Option<String>,
    pub profiles: Vec<ProfileSummary>,
    pub pending_sets: usize,
}

pub struct Draft {
    pub id: Option<String>,
    pub name: String,
    pub data: ProfileData,
    pub installed: Option<Vec<String>>,
    pub activate: bool,
}

impl Default for ProfilesFile {
    fn default() -> Self {
        Self { version: FILE_VERSION, active: None, profiles: Vec::new(), unreadable: Vec::new() }
    }
}

impl ProfilesFile {
    pub fn from_value(value: &Value) -> Self {
        let mut profiles: Vec<Profile> = Vec::new();
        let mut unreadable: Vec<Value> = Vec::new();

        for item in value.get("profiles").and_then(Value::as_array).into_iter().flatten() {
            match serde_json::from_value::<Profile>(item.clone()) {
                Ok(profile) if profiles.len() < MAX_PROFILES => profiles.push(profile),
                Ok(_) => {}
                Err(_) => unreadable.push(item.clone()),
            }
        }

        let active = value.get("active").and_then(Value::as_str).filter(|id| profiles.iter().any(|profile| profile.id == *id)).map(str::to_owned);

        Self { version: FILE_VERSION, active, profiles, unreadable }
    }

    pub fn to_value(&self) -> AppResult<Value> {
        let mut value = serde_json::to_value(self)?;

        if let Some(profiles) = value.get_mut("profiles").and_then(Value::as_array_mut) {
            profiles.extend(self.unreadable.iter().cloned());
        }

        Ok(value)
    }

    pub fn get(&self, id: &str) -> AppResult<&Profile> {
        self.profiles.iter().find(|profile| profile.id == id).ok_or_else(|| AppError::coded(ErrorCode::ProfileMissing, format!("no profile {id}")))
    }

    fn get_mut(&mut self, id: &str) -> AppResult<&mut Profile> {
        self.profiles
            .iter_mut()
            .find(|profile| profile.id == id)
            .ok_or_else(|| AppError::coded(ErrorCode::ProfileMissing, format!("no profile {id}")))
    }

    pub fn view(&self) -> ProfilesView {
        ProfilesView {
            max: MAX_PROFILES,
            active: self.active.clone(),
            profiles: self
                .profiles
                .iter()
                .map(|profile| ProfileSummary {
                    id: profile.id.clone(),
                    name: profile.name.clone(),
                    created: profile.created,
                    updated: profile.updated,
                    installed: profile.installed.clone(),
                    active: self.active.as_deref() == Some(profile.id.as_str()),
                })
                .collect(),
            pending_sets: 0,
        }
    }

    pub fn pending_sets<'a>(&self, sets: &'a [ComponentSet], migrated: &[String]) -> Vec<&'a ComponentSet> {
        sets.iter().filter(|set| !migrated.contains(&set.id) && self.get(&set.id).is_err()).collect()
    }
}

pub fn normalize_name(name: &str) -> AppResult<String> {
    let collapsed = name.split_whitespace().collect::<Vec<_>>().join(" ");
    let clipped: String = collapsed.chars().take(NAME_MAX_LENGTH).collect();
    let trimmed = clipped.trim();

    if trimmed.is_empty() {
        return Err(AppError::coded(ErrorCode::ProfileName, "empty profile name"));
    }

    Ok(trimmed.to_owned())
}

pub fn new_id() -> AppResult<String> {
    random_hex::<ID_BYTES>()
}

pub struct ProfileStore {
    pub configs_dir: PathBuf,
    pub durable_dir: PathBuf,
}

fn as_object(value: Option<Value>) -> Map<String, Value> {
    value.and_then(|value| value.as_object().cloned()).unwrap_or_default()
}

impl ProfileStore {
    pub fn new(configs_dir: impl Into<PathBuf>, durable_dir: impl Into<PathBuf>) -> Self {
        Self { configs_dir: configs_dir.into(), durable_dir: durable_dir.into() }
    }

    fn file(&self, name: &'static str) -> MirroredFile {
        MirroredFile::new(name, &self.configs_dir, &self.durable_dir)
    }

    pub fn load(&self) -> AppResult<ProfilesFile> {
        Ok(self.file(FILE_NAME).read().filter(Value::is_object).map(|value| ProfilesFile::from_value(&value)).unwrap_or_default())
    }

    fn persist(&self, file: &ProfilesFile) -> AppResult<()> {
        self.file(FILE_NAME).write(&file.to_value()?)
    }

    pub fn replace(&self, file: &ProfilesFile) -> AppResult<()> {
        self.persist(file)
    }

    fn update<T>(&self, change: impl FnOnce(&mut ProfilesFile) -> AppResult<T>) -> AppResult<T> {
        let mut file = self.load()?;
        let result = change(&mut file)?;

        self.persist(&file)?;

        Ok(result)
    }

    pub fn take_snapshot(&self) -> ProfileData {
        let mut config = as_object(self.file(CONFIG_JSON).read());
        let mut components = as_object(self.file(COMPONENTS_JSON).read());

        config.retain(|key, _| !is_excluded(key));
        components.retain(|key, _| !EXCLUDED_SECTIONS.contains(&key.as_str()));

        ProfileData { config, components }
    }

    fn unused_id(file: &ProfilesFile) -> AppResult<String> {
        loop {
            let id = new_id()?;

            if file.get(&id).is_err() {
                return Ok(id);
            }
        }
    }

    fn add(file: &mut ProfilesFile, draft: Draft) -> AppResult<Profile> {
        if file.profiles.len() >= MAX_PROFILES {
            return Err(AppError::coded(ErrorCode::ProfileLimit, format!("at most {MAX_PROFILES} profiles")));
        }

        let now = now_seconds();
        let id = match draft.id.filter(|id| sets::is_set_id(id) && file.get(id).is_err()) {
            Some(id) => id,
            None => Self::unused_id(file)?,
        };
        let profile = Profile {
            id,
            name: normalize_name(&draft.name)?,
            created: Some(now),
            updated: Some(now),
            data: draft.data,
            installed: draft.installed.map(|installed| normalize_components(&installed)),
            extra: Map::new(),
        };

        if draft.activate {
            file.active = Some(profile.id.clone());
        }

        file.profiles.push(profile.clone());

        Ok(profile)
    }

    pub fn save_current(&self, name: &str, installed: Option<Vec<String>>) -> AppResult<Profile> {
        let data = self.take_snapshot();

        self.update(|file| Self::add(file, Draft { id: None, name: name.to_owned(), data, installed, activate: true }))
    }

    pub fn rename(&self, id: &str, name: &str) -> AppResult<()> {
        let name = normalize_name(name)?;

        self.update(|file| {
            let profile = file.get_mut(id)?;

            profile.name = name;
            profile.updated = Some(now_seconds());

            Ok(())
        })
    }

    pub fn delete(&self, id: &str) -> AppResult<()> {
        self.update(|file| {
            file.get(id)?;
            file.profiles.retain(|profile| profile.id != id);

            if file.active.as_deref() == Some(id) {
                file.active = None;
            }

            Ok(())
        })
    }

    pub fn activate(&self, id: &str) -> AppResult<()> {
        let file = self.load()?;
        let data = file.get(id)?.data.clone();

        self.apply(&data)?;
        self.update(|file| {
            file.get(id)?;
            file.active = Some(id.to_owned());

            Ok(())
        })
    }

    fn apply(&self, data: &ProfileData) -> AppResult<()> {
        let mut config = as_object(self.file(CONFIG_JSON).read());
        let mut components = as_object(self.file(COMPONENTS_JSON).read());

        for (key, value) in &data.config {
            let fits = config.get(key).is_some_and(|current| same_kind(current, value));

            if !is_excluded(key) && fits {
                config.insert(key.clone(), value.clone());
            }
        }

        for (key, section) in data.components.iter().filter(|(key, _)| !EXCLUDED_SECTIONS.contains(&key.as_str())) {
            let Value::Object(section) = section else {
                continue;
            };

            match components.get_mut(key) {
                Some(Value::Object(existing)) => existing.extend(section.clone()),
                _ => {
                    components.insert(key.clone(), Value::Object(section.clone()));
                }
            }
        }

        self.file(CONFIG_JSON).write(&config)?;
        self.file(COMPONENTS_JSON).write(&components)
    }

    pub fn export(&self, id: &str) -> AppResult<String> {
        let file = self.load()?;
        let profile = file.get(id)?;

        encode(&profile.name, &profile.data, profile.installed.as_deref())
    }

    fn decoded_set(&self, name: String, components: Vec<String>) -> Decoded {
        Decoded { name, data: self.take_snapshot(), installed: Some(components) }
    }

    fn import_decoded(&self, decoded: Decoded, name: Option<&str>) -> AppResult<Profile> {
        let name = name.filter(|name| !name.trim().is_empty()).map_or(decoded.name, str::to_owned);
        let config = as_object(self.file(CONFIG_JSON).read());
        let components = as_object(self.file(COMPONENTS_JSON).read());
        let data = imported_data(ImportedInput { data: decoded.data, config: &config, components: &components });
        let draft = Draft { id: None, name, data, installed: decoded.installed, activate: false };

        self.update(|file| Self::add(file, draft))
    }

    pub fn import(&self, code: &str, name: Option<&str>) -> AppResult<Profile> {
        let decoded = if code.trim().starts_with(sets::CODE_PREFIX) {
            let (set_name, components) = sets::decode(code)?;

            self.decoded_set(set_name, components)
        } else {
            decode(code)?
        };

        self.import_decoded(decoded, name)
    }

    pub fn import_text(&self, text: &str) -> AppResult<usize> {
        let trimmed = text.trim_start_matches('\u{feff}').trim();

        if trimmed.starts_with(CODE_PREFIX) {
            return self.import(trimmed, None).map(|_| 1);
        }

        let Some(library) = sets::library_from_text(trimmed) else {
            let (name, components) = sets::from_file_text(trimmed)?;

            return self.import_decoded(self.decoded_set(name, components), None).map(|_| 1);
        };
        let library = library.sanitized();
        let data = self.take_snapshot();

        self.update(|file| {
            let room = MAX_PROFILES.saturating_sub(file.profiles.len());

            if room == 0 && !library.sets.is_empty() {
                return Err(AppError::coded(ErrorCode::ProfileLimit, format!("at most {MAX_PROFILES} profiles")));
            }

            let mut added = 0;

            for set in library.sets.iter().take(room) {
                let draft = Draft { id: None, name: set.name.clone(), data: data.clone(), installed: Some(set.components.clone()), activate: false };

                Self::add(file, draft)?;
                added += 1;
            }

            Ok(added)
        })
    }

    pub fn migrate_sets(&self, sets: &[ComponentSet], migrated: &mut Vec<String>) -> AppResult<usize> {
        let data = self.take_snapshot();

        self.update(|file| {
            let fresh: Vec<&ComponentSet> = sets.iter().filter(|set| !migrated.contains(&set.id)).collect();

            for set in fresh {
                if file.get(&set.id).is_ok() {
                    migrated.push(set.id.clone());
                    continue;
                }

                if file.profiles.len() >= MAX_PROFILES {
                    continue;
                }

                let draft = Draft {
                    id: Some(set.id.clone()),
                    name: set.name.clone(),
                    data: data.clone(),
                    installed: Some(set.components.clone()),
                    activate: false,
                };

                Self::add(file, draft)?;
                migrated.push(set.id.clone());
            }

            Ok(file.pending_sets(sets, migrated).len())
        })
    }
}

#[cfg(test)]
mod tests;
