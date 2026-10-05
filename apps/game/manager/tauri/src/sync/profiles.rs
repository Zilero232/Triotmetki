use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Map;

use super::{Stamped, SyncBase};
use crate::durable::now_seconds;
use crate::error::AppResult;
use crate::fsx::write_atomic;
use crate::profiles::{is_excluded, Profile, ProfileData, ProfilesFile, MAX_PROFILES};
use crate::sets::Tombstone;

pub const PROFILE_STATE_FILE: &str = "profile-sync.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncProfile {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub created: Option<f64>,
    #[serde(default)]
    pub updated: Option<f64>,
    pub data: ProfileData,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub installed: Option<Vec<String>>,
}

impl PartialEq for SyncProfile {
    fn eq(&self, other: &Self) -> bool {
        let same_installed = match (&self.installed, &other.installed) {
            (Some(left), Some(right)) => left == right,
            _ => true,
        };

        self.id == other.id
            && self.name == other.name
            && self.created == other.created
            && self.updated == other.updated
            && self.data == other.data
            && same_installed
    }
}

impl Stamped for SyncProfile {
    fn id(&self) -> &str {
        &self.id
    }

    fn created(&self) -> f64 {
        self.created.unwrap_or_default()
    }

    fn updated(&self) -> f64 {
        self.updated.unwrap_or_default()
    }
}

impl SyncProfile {
    pub fn from_profile(profile: &Profile) -> Self {
        let mut data = profile.data.clone();

        data.config.retain(|key, _| !is_excluded(key));

        Self {
            id: profile.id.clone(),
            name: profile.name.clone(),
            created: profile.created,
            updated: profile.updated,
            data,
            installed: profile.installed.clone(),
        }
    }
}

pub fn local_profiles(file: &ProfilesFile) -> Vec<SyncProfile> {
    file.profiles.iter().map(SyncProfile::from_profile).collect()
}

pub fn apply_profiles(file: &ProfilesFile, merged: &[SyncProfile]) -> ProfilesFile {
    let profiles: Vec<Profile> = merged
        .iter()
        .take(MAX_PROFILES)
        .map(|item| {
            let known = file.profiles.iter().find(|profile| profile.id == item.id);

            Profile {
                id: item.id.clone(),
                name: item.name.clone(),
                created: item.created,
                updated: item.updated,
                data: item.data.clone(),
                installed: item.installed.clone().or_else(|| known.and_then(|profile| profile.installed.clone())),
                extra: known.map(|profile| profile.extra.clone()).unwrap_or_else(Map::new),
            }
        })
        .collect();
    let active = file.active.clone().filter(|id| profiles.iter().any(|profile| profile.id == *id));

    ProfilesFile { version: file.version, active, profiles, unreadable: file.unreadable.clone() }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ProfileSyncState {
    pub synced_at: Option<f64>,
    pub revision: Option<u64>,
    pub known: Vec<String>,
    pub deleted: Vec<Tombstone>,
}

impl ProfileSyncState {
    pub fn path(client_dir: &Path) -> PathBuf {
        client_dir.join(PROFILE_STATE_FILE)
    }

    pub fn load(client_dir: &Path) -> Self {
        fs::read_to_string(Self::path(client_dir)).ok().and_then(|text| serde_json::from_str(&text).ok()).unwrap_or_default()
    }

    pub fn save(&self, client_dir: &Path) -> AppResult<()> {
        write_atomic(&Self::path(client_dir), serde_json::to_string_pretty(self)?.as_bytes())
    }

    pub fn base(&self) -> SyncBase {
        SyncBase { synced_at: self.synced_at, revision: self.revision }
    }

    pub fn tombstones(&self, local: &[SyncProfile]) -> Vec<Tombstone> {
        let now = now_seconds();
        let mut deleted = self.deleted.clone();

        for id in self.known.iter().filter(|id| !local.iter().any(|profile| profile.id == **id)) {
            if !deleted.iter().any(|tombstone| tombstone.id == *id) {
                deleted.push(Tombstone { id: id.clone(), deleted: now });
            }
        }

        deleted
    }

    pub fn synced(profiles: &[SyncProfile], deleted: Vec<Tombstone>, revision: u64) -> Self {
        Self { synced_at: Some(now_seconds()), revision: Some(revision), known: profiles.iter().map(|profile| profile.id.clone()).collect(), deleted }
    }
}
