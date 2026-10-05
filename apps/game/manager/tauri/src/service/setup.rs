use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::Manager;
use crate::catalog::{LoadedCatalog, Localized};
use crate::components::{read_installation, ClientContext, ComponentState, Installation};
use crate::dependencies::{self, DependencyState, DependencyStatus, DownloadPlanInput, FetchedDependency, InstallDependenciesInput, ResolveInput};
use crate::detect::GameClient;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::install::{self, installed_elsewhere, owned_patterns_catalog, ForeignEntry, InstallInput, UninstallInput};
use crate::patch::fetch_packages;
use crate::process::ensure_closed;
use crate::releases::{Release, ReleaseStatus};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackageSource {
    Release,
    Offline,
    Unavailable,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseSummary {
    pub version: String,
    pub notes: Option<Localized>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallPlan {
    pub client: GameClient,
    pub catalog: Option<LoadedCatalog>,
    pub release: Option<ReleaseSummary>,
    pub source: PackageSource,
    pub other_mods: Vec<ForeignEntry>,
    pub installed: bool,
    pub current_components: Vec<String>,
    pub parked_components: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    pub client_path: Option<PathBuf>,
    pub components: Vec<String>,
    #[serde(default)]
    pub remove_others: Vec<PathBuf>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallStep {
    OtherMods,
    Dependencies,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallWarning {
    pub step: InstallStep,
    pub code: ErrorCode,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallOutcome {
    pub installation: Installation,
    pub warnings: Vec<InstallWarning>,
}

pub fn install_warnings(steps: [(InstallStep, Option<ErrorCode>); 2]) -> Vec<InstallWarning> {
    steps.into_iter().filter_map(|(step, code)| code.map(|code| InstallWarning { step, code })).collect()
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallRequest {
    pub client_path: Option<PathBuf>,
    #[serde(default)]
    pub remove_config: bool,
}

pub fn offline() -> AppError {
    AppError::coded(ErrorCode::Offline, "the release server is unreachable")
}

fn package_source(lookup: &AppResult<Option<Release>>) -> PackageSource {
    match lookup {
        Ok(Some(_)) => PackageSource::Release,
        Ok(None) => PackageSource::Unavailable,
        Err(error) if error.code() == ErrorCode::Offline => PackageSource::Offline,
        Err(error) => {
            log::warn!("release lookup: {error}");

            PackageSource::Unavailable
        }
    }
}

fn without_owned_dependencies(others: Vec<ForeignEntry>, statuses: &[DependencyStatus]) -> Vec<ForeignEntry> {
    let owned: Vec<&str> = statuses
        .iter()
        .filter(|status| matches!(status.state, DependencyState::Ours | DependencyState::Outdated))
        .filter_map(|status| status.file.as_deref())
        .collect();

    others.into_iter().filter(|entry| !owned.iter().any(|file| entry.name.eq_ignore_ascii_case(file))).collect()
}

fn components_in(installation: &Installation, state: Option<ComponentState>) -> Vec<String> {
    installation
        .components
        .iter()
        .filter(|component| component.state != ComponentState::Missing && state.is_none_or(|state| component.state == state))
        .map(|component| component.id.clone())
        .collect()
}

impl Manager {
    async fn compatible_release(&self, client: &GameClient) -> AppResult<Option<Release>> {
        let latest = self.releases.latest(&client.version.to_string()).await.map_err(|error| match error.code() {
            ErrorCode::Http => offline(),
            _ => error,
        })?;

        Ok(latest.release.filter(|_| latest.status == ReleaseStatus::Compatible))
    }

    pub(super) async fn fetch_dependencies(&self, input: DownloadPlanInput<'_>) -> AppResult<Vec<FetchedDependency>> {
        let downloads = dependencies::to_download(input)?;

        dependencies::fetch(&self.releases, &downloads).await
    }

    pub async fn prepare_install(&self, client_path: Option<&Path>) -> AppResult<InstallPlan> {
        let client = self.client(client_path)?;
        let lookup = self.compatible_release(&client).await;
        let source = package_source(&lookup);
        let release = lookup.ok().flatten();

        if let Some(release) = &release {
            let refreshed = match self.try_write_guard() {
                Ok(_guard) => self.refresh_catalog(release).await.map(drop),
                Err(error) => Err(error),
            };

            if let Err(error) = refreshed {
                log::warn!("catalog refresh: {error}");
            }
        }

        let catalog = self.catalog();
        let owned = owned_patterns_catalog(catalog.as_ref().map(|loaded| loaded.catalog.clone()));
        let client_dir = self.layout.client_dir(&client.path);
        let installed = crate::state::Manifest::read(&client_dir)?.is_some();
        let installation = catalog
            .as_ref()
            .map(|loaded| read_installation(ClientContext { client_dir: &client_dir, client: &client, catalog: &loaded.catalog }))
            .transpose()?;
        let dependency_statuses = catalog
            .as_ref()
            .map(|loaded| dependencies::statuses(ClientContext { client_dir: &client_dir, client: &client, catalog: &loaded.catalog }))
            .transpose()?
            .unwrap_or_default();

        Ok(InstallPlan {
            other_mods: without_owned_dependencies(install::other_mods(&client, &owned), &dependency_statuses),
            release: release.map(|release| ReleaseSummary { version: release.version, notes: release.notes }),
            current_components: installation.as_ref().map(|installation| components_in(installation, None)).unwrap_or_default(),
            parked_components: installation
                .as_ref()
                .map(|installation| components_in(installation, Some(ComponentState::Disabled)))
                .unwrap_or_default(),
            client,
            catalog,
            source,
            installed,
        })
    }

    pub async fn install_modpack(&self, request: InstallRequest) -> AppResult<InstallOutcome> {
        let _guard = self.write_guard().await?;
        let client = self.usable_client(request.client_path.as_deref())?;

        ensure_closed(&client.path)?;

        let release = self
            .compatible_release(&client)
            .await?
            .ok_or_else(|| AppError::coded(ErrorCode::ReleaseUnavailable, "no release supports this client yet"))?;
        let scope = self.scope_of(client)?;
        let catalog = &scope.catalog.catalog;
        let ids = install::selection(catalog, &request.components)?;

        if let Some(absent) = ids.iter().find(|id| release.package(id).is_none()) {
            return Err(AppError::coded(ErrorCode::ReleaseUnavailable, format!("the release has no package {absent}")));
        }

        let packages = fetch_packages(&self.releases, &release, &ids).await?;
        let version = release.version;
        let wanted = dependencies::resolve(ResolveInput { catalog, components: &ids });
        let fetched =
            self.fetch_dependencies(DownloadPlanInput { context: scope.context(), wanted: &wanted, removing: &request.remove_others }).await?;
        let parked: BTreeSet<String> = components_in(&read_installation(scope.context())?, Some(ComponentState::Disabled)).into_iter().collect();

        ensure_closed(&scope.client.path)?;
        let installed = install::install(InstallInput {
            context: scope.context(),
            packages: &packages,
            modpack_version: &version,
            remove_others: &request.remove_others,
            parked: &parked,
        })?;

        let dependencies_error = dependencies::install(InstallDependenciesInput { context: scope.context(), wanted: &wanted, fetched: &fetched })
            .inspect_err(|error| log::warn!("the modpack is installed, its dependencies failed: {error}"))
            .err()
            .map(|error| error.code());

        self.sync_res_map(&scope.client);

        Ok(InstallOutcome {
            installation: read_installation(scope.context())?,
            warnings: install_warnings([(InstallStep::OtherMods, installed.others_error), (InstallStep::Dependencies, dependencies_error)]),
        })
    }

    pub async fn uninstall_modpack(&self, request: &UninstallRequest) -> AppResult<()> {
        let _guard = self.write_guard().await?;
        let scope = self.owned_scope(request.client_path.as_deref())?;

        ensure_closed(&scope.client.path)?;

        install::uninstall(UninstallInput {
            context: scope.context(),
            remove_config: request.remove_config,
            durable_dir: &self.layout.durable_dir(),
            shared_elsewhere: installed_elsewhere(&self.layout.clients_dir(), &scope.client_dir),
        })?;
        self.sync_res_map(&scope.client);

        Ok(())
    }
}
