use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::catalog::Localized;
use crate::error::AppResult;
use crate::fsx::write_atomic;

pub const CHANGELOG_PATH: &str = "/modpack/releases/changelog";
pub const CHANGELOG_LIMIT: &str = "10";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentChange {
    pub id: String,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub notes: Option<Localized>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangelogRelease {
    pub version: String,
    pub published_at: String,
    #[serde(default)]
    pub games: Vec<String>,
    #[serde(default)]
    pub notes: Option<Localized>,
    #[serde(default)]
    pub changes: Vec<ComponentChange>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Changelog {
    #[serde(default)]
    pub releases: Vec<ChangelogRelease>,
}

impl Changelog {
    pub fn load(path: &Path) -> Option<Self> {
        fs::read_to_string(path).ok().and_then(|text| serde_json::from_str(&text).ok())
    }

    pub fn save(&self, path: &Path) -> AppResult<()> {
        write_atomic(path, serde_json::to_string_pretty(self)?.as_bytes())
    }

    pub fn release(&self, version: Option<&str>) -> Option<&ChangelogRelease> {
        match version {
            Some(version) => self.releases.iter().find(|release| release.version == version),
            None => self.releases.first(),
        }
    }

    pub fn fresh_components(&self, installed: Option<&str>) -> Vec<String> {
        self.release(installed).map(|release| release.changes.iter().map(|change| change.id.clone()).collect()).unwrap_or_default()
    }
}

#[cfg(test)]
mod tests;
