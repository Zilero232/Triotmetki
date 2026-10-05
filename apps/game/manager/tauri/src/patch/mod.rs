mod install;
mod migrate;
mod stage;

use std::path::PathBuf;

use serde::Serialize;

pub use install::{apply_packages, fetch_packages, install_targets, ApplyInput, FetchedPackage};
pub use migrate::{migrate, MigrateInput};
pub use stage::{commit_journal, recover_commit, stage, StagedFile};

use crate::catalog::Localized;
use crate::detect::GameVersion;
use crate::error::ErrorCode;
use crate::releases::{LatestRelease, Release, ReleaseStatus};

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case", rename_all_fields = "camelCase")]
pub enum PatchStatus {
    Idle,
    NoClient,
    NotInstalled { game_version: String },
    UpToDate { game_version: String, modpack_version: Option<String> },
    UpdateAvailable { game_version: String, current: Option<String>, latest: String, notes: Option<Localized> },
    Migrated { from: String, to: String, modpack_version: Option<String> },
    Updated { game_version: String, from: Option<String>, to: String },
    MigrationReady { game_version: String, from: String, modpack_version: Option<String> },
    UpdateReady { game_version: String, from: String, current: Option<String>, latest: String, notes: Option<Localized> },
    Deferred { game_version: String, from: String },
    Unsupported { game_version: String },
    Waiting { game_version: String, from: String },
    Offline { game_version: String },
    Failed { code: ErrorCode },
}

impl PatchStatus {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Idle => "idle",
            Self::NoClient => "no_client",
            Self::NotInstalled { .. } => "not_installed",
            Self::UpToDate { .. } => "up_to_date",
            Self::UpdateAvailable { .. } => "update_available",
            Self::Migrated { .. } => "migrated",
            Self::Updated { .. } => "updated",
            Self::MigrationReady { .. } => "migration_ready",
            Self::UpdateReady { .. } => "update_ready",
            Self::Deferred { .. } => "deferred",
            Self::Unsupported { .. } => "unsupported",
            Self::Waiting { .. } => "waiting",
            Self::Offline { .. } => "offline",
            Self::Failed { .. } => "failed",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchReport {
    pub status: PatchStatus,
    pub client_path: Option<PathBuf>,
    pub checked_at: Option<String>,
}

impl Default for PatchReport {
    fn default() -> Self {
        Self { status: PatchStatus::Idle, client_path: None, checked_at: None }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum PatchAction {
    Nothing,
    Migrate,
    Install(Release),
    Offer(Release),
    Wait,
    Offline,
}

pub struct PlanInput<'a> {
    pub recorded_game: Option<GameVersion>,
    pub current_game: GameVersion,
    pub installed_modpack: Option<&'a str>,
    pub latest: Option<&'a LatestRelease>,
}

pub fn is_newer(candidate: &str, installed: Option<&str>) -> bool {
    let Some(installed) = installed else {
        return true;
    };

    match (semver::Version::parse(candidate), semver::Version::parse(installed)) {
        (Ok(candidate), Ok(installed)) => candidate > installed,
        _ => candidate != installed,
    }
}

pub fn plan(input: PlanInput) -> PatchAction {
    let patched = input.recorded_game.is_some_and(|recorded| recorded != input.current_game);
    let Some(latest) = input.latest else {
        return if patched { PatchAction::Offline } else { PatchAction::Nothing };
    };
    let compatible = latest.release.as_ref().filter(|_| latest.status == ReleaseStatus::Compatible);

    match (compatible, patched) {
        (Some(release), true) if is_newer(&release.version, input.installed_modpack) => PatchAction::Install(release.clone()),
        (Some(_), true) => PatchAction::Migrate,
        (Some(release), false) if is_newer(&release.version, input.installed_modpack) => PatchAction::Offer(release.clone()),
        (None, true) => PatchAction::Wait,
        _ => PatchAction::Nothing,
    }
}

#[cfg(test)]
mod tests;
