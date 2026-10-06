use std::collections::BTreeSet;
use std::path::Path;

use super::{ClientScope, Manager};
use crate::components::{self, ToggleInput};
use crate::dependencies::{self, CarryInput, DownloadPlanInput, InstallDependenciesInput, UpdatesInput};
use crate::detect::{self, GameClient, GameVersion};
use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::{file_sha256, replace_restorable, Replaced};
use crate::install::restore_after_failure;
use crate::patch::{self, ApplyInput, MigrateInput, PatchAction, PatchReport, PatchStatus, PlanInput};
use crate::paths::same_path;
use crate::previews::{self, DownloadInput, PendingInput};
use crate::process::{ensure_closed, is_client_running};
use crate::releases::{verify_sha256, FetchLimits, LatestRelease, Release, ReleaseStatus, MAX_CATALOG_BYTES};
use crate::settings::ManagerSettings;
use crate::state::Manifest;

pub const SETTLED_KINDS: [&str; 7] = ["waiting", "offline", "failed", "deferred", "migration_ready", "update_ready", "unsupported"];

#[derive(Debug, Clone, PartialEq)]
pub struct CheckOutcome {
    pub report: PatchReport,
    pub changed: bool,
    pub others: Vec<PatchReport>,
}

fn checked_at() -> Option<String> {
    Some(chrono::Local::now().to_rfc3339())
}

fn report_for(client: &GameClient, status: PatchStatus) -> PatchReport {
    PatchReport { status, client_path: Some(client.path.clone()), checked_at: checked_at() }
}

impl Manager {
    pub async fn check(&self) -> CheckOutcome {
        let _guard = self.check_lock.lock().await;
        let previous = self.report();
        let settings = self.settings();
        let clients = self.detect();
        let selected = detect::default_client(&clients, settings.selected_client.as_deref()).cloned();
        let report = match &selected {
            None => Some(PatchReport { status: PatchStatus::NoClient, client_path: None, checked_at: checked_at() }),
            Some(client) => self.check_client(client, &settings).await,
        };
        let mut others = Vec::new();

        for client in clients.iter().filter(|client| selected.as_ref().is_none_or(|selected| !same_path(&selected.path, &client.path))) {
            let installed = Manifest::read(&self.layout.client_dir(&client.path)).ok().flatten().is_some();

            if !installed || client.problem.is_some() {
                continue;
            }

            if let Some(report) = self.check_client(client, &settings).await {
                if self.remember_other(&report) {
                    others.push(report);
                }
            }
        }

        let Some(report) = report else {
            return CheckOutcome { report: previous, changed: false, others };
        };

        self.set_report(report.clone());

        CheckOutcome { changed: previous.status != report.status, report, others }
    }

    async fn check_client(&self, client: &GameClient, settings: &ManagerSettings) -> Option<PatchReport> {
        if client.problem.is_some() {
            return Some(report_for(client, PatchStatus::Unsupported { game_version: client.version.to_string() }));
        }

        match self.evaluate(client, settings).await {
            Ok(status) => Some(report_for(client, status)),
            Err(error) if error.code() == ErrorCode::Busy => None,
            Err(error) => {
                log::warn!("check {}: {error}", client.path.display());

                Some(report_for(client, PatchStatus::Failed { code: error.code() }))
            }
        }
    }

    fn last_status(&self, client: &GameClient) -> Option<PatchStatus> {
        let report = self.report();

        match report.client_path.as_deref() {
            Some(path) if same_path(path, &client.path) => Some(report.status),
            _ => self.other_status(&client.path),
        }
    }

    pub fn needs_check(&self) -> bool {
        self.detect().iter().any(|client| {
            let recorded =
                Manifest::read(&self.layout.client_dir(&client.path)).ok().flatten().and_then(|manifest| GameVersion::parse(&manifest.version));
            let patched = recorded.is_some_and(|recorded| recorded != client.version);
            let status = self.last_status(client);
            let settled = status.as_ref().is_some_and(|status| SETTLED_KINDS.contains(&status.kind()));
            let resumable = matches!(status, Some(PatchStatus::Deferred { .. })) && !is_client_running(&client.path);

            (patched && !settled) || resumable
        })
    }

    async fn evaluate(&self, client: &GameClient, settings: &ManagerSettings) -> AppResult<PatchStatus> {
        let client_dir = self.layout.client_dir(&client.path);
        let game_version = client.version.to_string();
        let Some(manifest) = Manifest::read(&client_dir)? else {
            return Ok(PatchStatus::NotInstalled { game_version });
        };
        let recorded = GameVersion::parse(&manifest.version);
        let latest = self.releases.latest(&game_version).await.ok();
        let installed_modpack = Some(manifest.modpack.as_str()).filter(|version| !version.is_empty());
        let current = installed_modpack.map(str::to_owned);
        let action = patch::plan(PlanInput { recorded_game: recorded, current_game: client.version, installed_modpack, latest: latest.as_ref() });
        let from = recorded.map(|version| version.to_string()).unwrap_or_default();
        let deferred = |from: String, game_version: String| Ok(PatchStatus::Deferred { game_version, from });

        match action {
            PatchAction::Nothing => {
                if !is_client_running(&client.path) {
                    self.refresh_up_to_date(client, latest.as_ref(), installed_modpack).await;
                }

                Ok(PatchStatus::UpToDate { game_version, modpack_version: current })
            }
            PatchAction::Offline => Ok(PatchStatus::Offline { game_version }),
            PatchAction::Wait => Ok(PatchStatus::Waiting { game_version, from }),
            PatchAction::Offer(release) => Ok(PatchStatus::UpdateAvailable { game_version, current, latest: release.version, notes: release.notes }),
            PatchAction::Migrate if !settings.auto_migrate => Ok(PatchStatus::MigrationReady { game_version, from, modpack_version: current }),
            PatchAction::Install(release) if !settings.auto_migrate => {
                Ok(PatchStatus::UpdateReady { game_version, from, current, latest: release.version, notes: release.notes })
            }
            _ if is_client_running(&client.path) => deferred(from, game_version),
            PatchAction::Migrate => {
                let _guard = self.try_write_guard()?;
                let migrated = self.usable_scope(Some(&client.path)).and_then(|scope| self.migrate_scope(&scope, &manifest.mods_dir));

                match migrated {
                    Err(error) if error.code() == ErrorCode::ClientRunning => deferred(from, game_version),
                    Err(error) => Err(error),
                    Ok(_) => Ok(PatchStatus::Migrated { from, to: game_version, modpack_version: current }),
                }
            }
            PatchAction::Install(release) => {
                let _guard = self.try_write_guard()?;

                match self.install_release(&client.path, &release).await {
                    Err(error) if error.code() == ErrorCode::ClientRunning => deferred(from, game_version),
                    Err(error) => Err(error),
                    Ok(_) => Ok(PatchStatus::Updated { game_version, from: current, to: release.version }),
                }
            }
        }
    }

    async fn refresh_up_to_date(&self, client: &GameClient, latest: Option<&LatestRelease>, installed: Option<&str>) {
        let Ok(_guard) = self.try_write_guard() else {
            return;
        };
        let cached = file_sha256(&self.layout.catalog_cache()).ok();
        let stale = latest
            .and_then(|latest| latest.release.as_ref().filter(|_| latest.status == ReleaseStatus::Compatible))
            .filter(|release| Some(release.version.as_str()) == installed)
            .filter(|release| {
                release.catalog.as_ref().is_some_and(|catalog| cached.as_deref().is_none_or(|cached| !cached.eq_ignore_ascii_case(&catalog.sha256)))
            });

        if let Some(release) = stale {
            if let Err(error) = self.refresh_catalog(release).await.map(drop) {
                log::warn!("refresh the catalogue of {}: {error}", release.version);
            }
        }

        if let Ok(scope) = self.usable_scope(Some(&client.path)) {
            self.sync_hangar_looks(scope.context());
        }
    }

    fn migrate_scope(&self, scope: &ClientScope, from_mods_dir: &Path) -> AppResult<Vec<String>> {
        ensure_closed(&scope.client.path)?;

        let migrated = patch::migrate(MigrateInput { context: scope.context(), from_mods_dir })?;

        self.sync_res_map(&scope.client);
        self.sync_hangar_looks(scope.context());

        Ok(migrated)
    }

    pub async fn migrate_now(&self, client_path: Option<&Path>) -> AppResult<Vec<String>> {
        let _guard = self.write_guard().await?;
        let scope = self.usable_scope(client_path)?;
        let manifest = Manifest::read(&scope.client_dir)?
            .ok_or_else(|| AppError::coded(ErrorCode::NotInstalled, "the modpack is not installed in this client"))?;

        self.migrate_scope(&scope, &manifest.mods_dir)
    }

    pub(super) async fn refresh_catalog(&self, release: &Release) -> AppResult<Option<Replaced>> {
        let Some(catalog) = &release.catalog else {
            return Ok(None);
        };
        let bytes = self.releases.fetch(&catalog.url, FetchLimits { expected_size: None, max_bytes: MAX_CATALOG_BYTES }).await?;

        verify_sha256(&bytes, &catalog.sha256)?;

        let parsed = crate::catalog::parse(&String::from_utf8_lossy(&bytes))?;
        let cache = self.layout.catalog_cache();
        let changed = std::fs::read(&cache).ok().is_none_or(|previous| previous != bytes);

        let replaced = replace_restorable(&cache, &bytes)?;

        let root = self.layout.manager_dir();
        let files = previews::pending(PendingInput { root: &root, files: previews::files(&parsed), refresh: changed });

        if !files.is_empty() {
            let client = self.releases.clone();
            let catalog_url = catalog.url.clone();

            tauri::async_runtime::spawn(async move {
                let written = previews::download(DownloadInput { client: &client, root: &root, catalog_url: &catalog_url, files: &files }).await;

                log::info!("previews: {written} of {} downloaded", files.len());
            });
        }

        Ok(Some(replaced))
    }

    pub async fn install_release(&self, client_path: &Path, release: &Release) -> AppResult<Vec<String>> {
        ensure_closed(client_path)?;

        let replaced = self.refresh_catalog(release).await?;
        let installed = self.apply_release(client_path, release).await;

        if let (Err(error), Some(replaced)) = (&installed, replaced) {
            if let Err(restore_error) = replaced.restore() {
                log::warn!("put the catalogue back after a failed update ({error}): {restore_error}");
            }
        }

        installed
    }

    async fn apply_release(&self, client_path: &Path, release: &Release) -> AppResult<Vec<String>> {
        let scope = self.usable_scope(Some(client_path))?;
        let previous_mods_dir = Manifest::read(&scope.client_dir)?.map(|manifest| manifest.mods_dir).filter(|dir| dir.is_absolute());
        let (enabled, disabled) = patch::install_targets(scope.context(), &[])?;
        let ids: BTreeSet<String> = enabled.union(&disabled).cloned().collect();
        let packages = patch::fetch_packages(&self.releases, release, &ids).await?;
        let updated = dependencies::updates(UpdatesInput { context: scope.context(), from_mods_dir: previous_mods_dir.as_deref() })?;
        let fetched = self.fetch_dependencies(DownloadPlanInput { context: scope.context(), wanted: &updated, removing: &[] }).await?;

        ensure_closed(client_path)?;

        let written = patch::apply_packages(ApplyInput {
            context: scope.context(),
            modpack_version: &release.version,
            packages: &packages,
            disabled: &disabled,
            replace_all: false,
            drop_retired: true,
        })
        .map_err(|error| restore_after_failure(scope.context(), error))?;

        if let Some(from_mods_dir) = previous_mods_dir {
            if let Err(error) = dependencies::carry(CarryInput { context: scope.context(), from_mods_dir: &from_mods_dir }) {
                log::warn!("carry the dependencies to {}: {error}", scope.client.mods_dir.display());
            }
        }

        if !updated.is_empty() {
            if let Err(error) = dependencies::install(InstallDependenciesInput { context: scope.context(), wanted: &updated, fetched: &fetched }) {
                log::warn!("update the dependencies in {}: {error}", scope.client.mods_dir.display());
            }
        }

        self.sync_res_map(&scope.client);
        self.sync_hangar_looks(scope.context());

        Ok(written)
    }

    pub async fn update_now(&self, client_path: Option<&Path>) -> AppResult<Vec<String>> {
        let _guard = self.write_guard().await?;
        let client = self.usable_client(client_path)?;

        ensure_closed(&client.path)?;

        let latest = self.releases.latest(&client.version.to_string()).await?;
        let release = latest
            .release
            .filter(|_| latest.status == ReleaseStatus::Compatible)
            .ok_or_else(|| AppError::coded(ErrorCode::ReleaseUnavailable, "no release supports this client yet"))?;

        self.install_release(&client.path, &release).await
    }

    pub async fn set_component_enabled(&self, client_path: Option<&Path>, component_id: &str, enabled: bool) -> AppResult<Vec<String>> {
        let _guard = self.write_guard().await?;
        let scope = self.usable_scope(client_path)?;

        ensure_closed(&scope.client.path)?;

        let input = ToggleInput { context: scope.context(), component_id, enabled };
        let missing = if enabled { components::missing_for_enable(&input)? } else { Vec::new() };
        let wanted = if enabled { dependencies::needed_to_enable(&scope.catalog.catalog, component_id) } else { BTreeSet::new() };
        let fetched = self.fetch_dependencies(DownloadPlanInput { context: scope.context(), wanted: &wanted, removing: &[] }).await?;

        if !missing.is_empty() {
            self.download_components(&scope, &missing).await?;
        }

        ensure_closed(&scope.client.path)?;

        if !wanted.is_empty() {
            dependencies::install(InstallDependenciesInput { context: scope.context(), wanted: &wanted, fetched: &fetched })?;
        }

        let changed = components::set_enabled(ToggleInput { context: scope.context(), component_id, enabled })?;

        self.sync_res_map(&scope.client);
        self.sync_hangar_looks(scope.context());

        Ok(changed)
    }

    pub(super) async fn download_components(&self, scope: &ClientScope, ids: &[String]) -> AppResult<()> {
        let installed = Manifest::read(&scope.client_dir)?.map(|manifest| manifest.modpack).unwrap_or_default();
        let latest = self.releases.latest(&scope.client.version.to_string()).await?;
        let release = latest
            .release
            .filter(|release| latest.status == ReleaseStatus::Compatible && (installed.is_empty() || release.version == installed))
            .ok_or_else(|| AppError::coded(ErrorCode::ReleaseUnavailable, "update the modpack before adding components"))?;
        let wanted: BTreeSet<String> = ids.iter().cloned().collect();

        if let Some(absent) = wanted.iter().find(|id| release.package(id).is_none()) {
            return Err(AppError::coded(ErrorCode::ReleaseUnavailable, format!("the release has no package {absent}")));
        }

        let packages = patch::fetch_packages(&self.releases, &release, &wanted).await?;

        ensure_closed(&scope.client.path)?;
        patch::apply_packages(ApplyInput {
            context: scope.context(),
            modpack_version: &release.version,
            packages: &packages,
            disabled: &BTreeSet::new(),
            replace_all: false,
            drop_retired: false,
        })?;

        Ok(())
    }
}
