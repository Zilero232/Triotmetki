mod check;
mod maintenance;
mod profiles;
mod report;
mod sets;
pub mod setup;
pub mod sync;
mod whats_new;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;

pub use check::CheckOutcome;
pub use setup::{InstallOutcome, InstallPlan, InstallRequest, UninstallRequest};
pub use sync::{AccountLink, SyncReport, SyncStatus};
pub use whats_new::WhatsNew;

use crate::catalog::{self, Catalog, LoadedCatalog};
use crate::components::ClientContext;
use crate::deep_link::DeepLink;
use crate::detect::{self, DetectInput, GameClient};
use crate::error::{AppError, AppResult, ErrorCode};
use crate::gameface::{self, GamefaceStatus, ResMapOutcome};
use crate::install::owned_patterns_catalog;
use crate::patch::{PatchReport, PatchStatus};
use crate::paths::{normalized, same_path, Layout};
use crate::releases::ReleasesClient;
use crate::report::ReportPreview;
use crate::settings::{ManagerSettings, ManagerState};
use crate::site::SiteClient;

pub const BUSY_WAIT: Duration = Duration::from_secs(3);

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientsView {
    pub clients: Vec<GameClient>,
    pub selected: Option<PathBuf>,
}

pub struct Manager {
    pub layout: Layout,
    pub releases: ReleasesClient,
    pub site: SiteClient,
    settings: Mutex<ManagerSettings>,
    report_preview: Mutex<Option<ReportPreview>>,
    report: Mutex<PatchReport>,
    others: Mutex<HashMap<String, PatchStatus>>,
    res_maps: Mutex<HashMap<String, ResMapOutcome>>,
    pending_link: Mutex<Option<DeepLink>>,
    check_lock: tokio::sync::Mutex<()>,
    write_lock: tokio::sync::Mutex<()>,
}

pub struct ClientScope {
    pub client: GameClient,
    pub client_dir: PathBuf,
    pub catalog: LoadedCatalog,
}

impl ClientScope {
    pub fn context(&self) -> ClientContext<'_> {
        ClientContext { client_dir: &self.client_dir, client: &self.client, catalog: &self.catalog.catalog }
    }
}

pub struct OwnedScope {
    pub client: GameClient,
    pub client_dir: PathBuf,
    pub catalog: Catalog,
}

impl OwnedScope {
    pub fn context(&self) -> ClientContext<'_> {
        ClientContext { client_dir: &self.client_dir, client: &self.client, catalog: &self.catalog }
    }
}

pub fn busy() -> AppError {
    AppError::coded(ErrorCode::Busy, "another operation is running")
}

impl Manager {
    pub fn new(layout: Layout, releases: ReleasesClient) -> AppResult<Self> {
        let settings = ManagerSettings::load(&layout.settings_file());
        let site = SiteClient::new(releases.base_url())?;

        Ok(Self {
            layout,
            releases,
            site,
            settings: Mutex::new(settings),
            report_preview: Mutex::new(None),
            report: Mutex::new(PatchReport::default()),
            others: Mutex::new(HashMap::new()),
            res_maps: Mutex::new(HashMap::new()),
            pending_link: Mutex::new(None),
            check_lock: tokio::sync::Mutex::new(()),
            write_lock: tokio::sync::Mutex::new(()),
        })
    }

    pub fn state(&self) -> ManagerState {
        ManagerState::load(&self.layout.manager_state_file())
    }

    pub fn change_state(&self, change: impl FnOnce(&mut ManagerState)) -> AppResult<ManagerState> {
        let mut state = self.state();

        change(&mut state);
        state.save(&self.layout.manager_state_file())?;

        Ok(state)
    }

    pub fn keep_report_preview(&self, preview: &ReportPreview) {
        if let Ok(mut current) = self.report_preview.lock() {
            *current = Some(preview.clone());
        }
    }

    pub fn report_preview(&self, id: &str) -> Option<ReportPreview> {
        self.report_preview.lock().ok().and_then(|current| current.clone().filter(|preview| preview.id == id))
    }

    pub async fn write_guard(&self) -> AppResult<tokio::sync::MutexGuard<'_, ()>> {
        tokio::time::timeout(BUSY_WAIT, self.write_lock.lock()).await.map_err(|_| busy())
    }

    pub fn try_write_guard(&self) -> AppResult<tokio::sync::MutexGuard<'_, ()>> {
        self.write_lock.try_lock().map_err(|_| busy())
    }

    pub fn set_pending_link(&self, link: DeepLink) {
        if let Ok(mut pending) = self.pending_link.lock() {
            *pending = Some(link);
        }
    }

    pub fn take_pending_link(&self) -> Option<DeepLink> {
        self.pending_link.lock().ok().and_then(|mut pending| pending.take())
    }

    pub fn settings(&self) -> ManagerSettings {
        self.settings.lock().map(|settings| settings.clone()).unwrap_or_default()
    }

    pub fn change_settings(&self, change: impl FnOnce(&mut ManagerSettings)) -> AppResult<ManagerSettings> {
        let mut current = self.settings.lock().map_err(|_| AppError::coded(ErrorCode::Io, "the settings lock is poisoned"))?;
        let mut next = current.clone();

        change(&mut next);

        let next = next.normalized();

        next.save(&self.layout.settings_file())?;
        *current = next.clone();

        Ok(next)
    }

    pub fn save_settings(&self, settings: ManagerSettings) -> AppResult<ManagerSettings> {
        self.change_settings(|current| *current = settings)
    }

    pub fn report(&self) -> PatchReport {
        self.report.lock().map(|report| report.clone()).unwrap_or_default()
    }

    pub fn set_report(&self, report: PatchReport) {
        if let Ok(mut current) = self.report.lock() {
            *current = report;
        }
    }

    pub fn other_status(&self, client_path: &Path) -> Option<PatchStatus> {
        self.others.lock().ok().and_then(|others| others.get(&normalized(client_path)).cloned())
    }

    pub fn remember_other(&self, report: &PatchReport) -> bool {
        let (Some(path), Ok(mut others)) = (report.client_path.as_deref(), self.others.lock()) else {
            return false;
        };

        others.insert(normalized(path), report.status.clone()).is_none_or(|previous| previous != report.status)
    }

    pub fn sync_res_map(&self, client: &GameClient) -> ResMapOutcome {
        let outcome = gameface::sync(client);

        if let Ok(mut known) = self.res_maps.lock() {
            known.insert(normalized(&client.path), outcome);
        }

        outcome
    }

    pub fn gameface_status(&self, path: Option<&Path>) -> AppResult<GamefaceStatus> {
        let client = self.client(path)?;
        let outcome = self.res_maps.lock().ok().and_then(|known| known.get(&normalized(&client.path)).copied());

        Ok(GamefaceStatus { restart_expected: outcome.is_some_and(ResMapOutcome::restart_expected) })
    }

    pub fn detect(&self) -> Vec<GameClient> {
        let settings = self.settings();

        detect::detect_clients(DetectInput { program_data: &detect::program_data(), manual: &settings.manual_clients })
    }

    pub fn clients_view(&self) -> ClientsView {
        let clients = self.detect();
        let settings = self.settings();
        let selected = detect::default_client(&clients, settings.selected_client.as_deref()).map(|client| client.path.clone());

        ClientsView { clients, selected }
    }

    pub fn add_client(&self, path: &Path) -> AppResult<GameClient> {
        let client = detect::inspect(path, detect::ClientSource::Manual)
            .ok_or_else(|| AppError::coded(ErrorCode::ClientNotFound, format!("no game client in {}", path.display())))?;

        self.change_settings(|settings| {
            if !settings.manual_clients.iter().any(|known| same_path(known, path)) {
                settings.manual_clients.push(path.to_path_buf());
            }

            settings.selected_client = Some(path.to_path_buf());
        })?;

        Ok(client)
    }

    pub fn select_client(&self, path: &Path) -> AppResult<ManagerSettings> {
        self.change_settings(|settings| settings.selected_client = Some(path.to_path_buf()))
    }

    pub fn catalog(&self) -> Option<LoadedCatalog> {
        catalog::load(&self.layout.catalog_cache())
    }

    pub fn client(&self, path: Option<&Path>) -> AppResult<GameClient> {
        let clients = self.detect();
        let not_found = || AppError::coded(ErrorCode::ClientNotFound, "no game client found");

        if let Some(path) = path {
            return detect::find_client(&clients, path)
                .cloned()
                .or_else(|| detect::inspect(path, detect::ClientSource::Manual))
                .ok_or_else(not_found);
        }

        detect::default_client(&clients, self.settings().selected_client.as_deref()).cloned().ok_or_else(not_found)
    }

    pub fn usable_client(&self, path: Option<&Path>) -> AppResult<GameClient> {
        let client = self.client(path)?;

        if let Some(problem) = client.problem {
            return Err(AppError::coded(ErrorCode::ClientUnsupported, format!("{} is not supported: {problem:?}", client.path.display())));
        }

        Ok(client)
    }

    fn scope_of(&self, client: GameClient) -> AppResult<ClientScope> {
        let catalog = self.catalog().ok_or_else(|| AppError::coded(ErrorCode::ReleaseUnavailable, "no component catalog yet"))?;

        Ok(ClientScope { client_dir: self.layout.client_dir(&client.path), client, catalog })
    }

    pub fn scope(&self, path: Option<&Path>) -> AppResult<ClientScope> {
        self.scope_of(self.client(path)?)
    }

    pub fn usable_scope(&self, path: Option<&Path>) -> AppResult<ClientScope> {
        self.scope_of(self.usable_client(path)?)
    }

    pub fn owned_scope(&self, path: Option<&Path>) -> AppResult<OwnedScope> {
        let client = self.client(path)?;

        Ok(OwnedScope {
            client_dir: self.layout.client_dir(&client.path),
            catalog: owned_patterns_catalog(self.catalog().map(|loaded| loaded.catalog)),
            client,
        })
    }
}

#[cfg(test)]
mod tests;
