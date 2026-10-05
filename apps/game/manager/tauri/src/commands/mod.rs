mod dialogs;

use std::path::PathBuf;

use serde::Serialize;
use tauri::async_runtime::block_on;
use tauri::{AppHandle, Manager as _, State};

use crate::background::{self, apply_autostart};
use crate::cache::{CachePlan, CacheResult};
use crate::catalog::LoadedCatalog;
use crate::components::{read_installation, Installation};
use crate::conflicts::ConflictReport;
use crate::deep_link::DeepLink;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::gameface::GamefaceStatus;
use crate::health::HealthReport;
use crate::install::read_component_profile;
use crate::logs::{self, CollectInput};
use crate::patch::PatchReport;
use crate::profiles::ProfilesView;
use crate::releases::api_url;
use crate::report::{ReportPart, ReportPreview, ReportReceipt};
use crate::service::{
    AccountLink, ClientsView, InstallOutcome, InstallPlan, InstallRequest, Manager, SyncReport, SyncStatus, UninstallRequest, WhatsNew,
};
use crate::sets::SetsView;
use crate::settings::ManagerSettings;
use crate::sync::Resolution;

pub use dialogs::DialogText;
use dialogs::{ask_path, DialogKind, FileDialog};

pub const SET_FILE_EXTENSIONS: [&str; 1] = [crate::sets::SET_EXTENSION];
pub const LIBRARY_FILE_EXTENSIONS: [&str; 1] = [crate::sets::LIBRARY_EXTENSION];
pub const IMPORT_FILE_EXTENSIONS: [&str; 2] = [crate::sets::SET_EXTENSION, crate::sets::LIBRARY_EXTENSION];
pub const REPORT_FILE_EXTENSIONS: [&str; 1] = [crate::report::ZIP_EXTENSION];
pub const PROFILE_FILE_EXTENSIONS: [&str; 1] = [crate::install::PROFILE_EXTENSION];
pub const FALLBACK_FILE_NAME: &str = "triotmetki";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub state_root: PathBuf,
    pub roaming_root: PathBuf,
    pub logs_dir: PathBuf,
    pub api_url: String,
}

pub async fn run_blocking<T: Send + 'static>(work: impl FnOnce() -> AppResult<T> + Send + 'static) -> AppResult<T> {
    tauri::async_runtime::spawn_blocking(work).await.map_err(|error| AppError::coded(ErrorCode::Io, error.to_string()))?
}

async fn with_manager<T: Send + 'static>(app: &AppHandle, work: impl FnOnce(&Manager) -> AppResult<T> + Send + 'static) -> AppResult<T> {
    let app = app.clone();

    run_blocking(move || work(&app.state::<Manager>())).await
}

async fn recheck(app: &AppHandle, manager: &Manager) -> PatchReport {
    let outcome = manager.check().await;

    background::publish(app, &outcome);

    outcome.report
}

#[tauri::command]
pub async fn app_info(manager: State<'_, Manager>) -> AppResult<AppInfo> {
    Ok(AppInfo {
        version: env!("MANAGER_VERSION").to_owned(),
        state_root: manager.layout.state_root.clone(),
        roaming_root: manager.layout.roaming_root.clone(),
        logs_dir: manager.layout.logs_dir(),
        api_url: api_url(),
    })
}

#[tauri::command]
pub async fn list_clients(manager: State<'_, Manager>) -> AppResult<ClientsView> {
    Ok(manager.clients_view())
}

#[tauri::command]
pub async fn add_client(app: AppHandle, manager: State<'_, Manager>, text: DialogText) -> AppResult<Option<ClientsView>> {
    let dialog = FileDialog { kind: DialogKind::Folder, text, extensions: &[], fallback_name: FALLBACK_FILE_NAME };
    let Some(path) = ask_path(&app, dialog).await? else {
        return Ok(None);
    };

    manager.add_client(&path)?;

    Ok(Some(manager.clients_view()))
}

#[tauri::command]
pub async fn select_client(manager: State<'_, Manager>, path: PathBuf) -> AppResult<ClientsView> {
    manager.select_client(&path)?;

    Ok(manager.clients_view())
}

#[tauri::command]
pub async fn get_catalog(manager: State<'_, Manager>) -> AppResult<Option<LoadedCatalog>> {
    Ok(manager.catalog())
}

#[tauri::command]
pub async fn get_installation(manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<Installation> {
    let scope = manager.scope(client_path.as_deref())?;

    read_installation(scope.context())
}

#[tauri::command]
pub async fn set_component_enabled(app: AppHandle, client_path: Option<PathBuf>, component_id: String, enabled: bool) -> AppResult<Installation> {
    with_manager(&app, move |manager| {
        block_on(manager.set_component_enabled(client_path.as_deref(), &component_id, enabled))?;

        read_installation(manager.scope(client_path.as_deref())?.context())
    })
    .await
}

#[tauri::command]
pub async fn list_profiles(manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<ProfilesView> {
    Ok(manager.profile_store(client_path.as_deref())?.load()?.view())
}

#[tauri::command]
pub async fn save_profile(manager: State<'_, Manager>, client_path: Option<PathBuf>, name: String) -> AppResult<ProfilesView> {
    manager.change_profiles(client_path.as_deref(), |store| store.save_current(&name).map(drop)).await
}

#[tauri::command]
pub async fn activate_profile(manager: State<'_, Manager>, client_path: Option<PathBuf>, id: String) -> AppResult<ProfilesView> {
    manager.change_profiles(client_path.as_deref(), |store| store.activate(&id)).await
}

#[tauri::command]
pub async fn rename_profile(manager: State<'_, Manager>, client_path: Option<PathBuf>, id: String, name: String) -> AppResult<ProfilesView> {
    manager.change_profiles(client_path.as_deref(), |store| store.rename(&id, &name)).await
}

#[tauri::command]
pub async fn delete_profile(manager: State<'_, Manager>, client_path: Option<PathBuf>, id: String) -> AppResult<ProfilesView> {
    manager.change_profiles(client_path.as_deref(), |store| store.delete(&id)).await
}

#[tauri::command]
pub async fn import_profile(
    manager: State<'_, Manager>,
    client_path: Option<PathBuf>,
    code: String,
    name: Option<String>,
) -> AppResult<ProfilesView> {
    manager.change_profiles(client_path.as_deref(), |store| store.import(&code, name.as_deref()).map(drop)).await
}

#[tauri::command]
pub async fn export_profile(manager: State<'_, Manager>, client_path: Option<PathBuf>, id: String) -> AppResult<String> {
    manager.profile_store(client_path.as_deref())?.export(&id)
}

#[tauri::command]
pub async fn get_settings(manager: State<'_, Manager>) -> AppResult<ManagerSettings> {
    Ok(manager.settings())
}

#[tauri::command]
pub async fn update_settings(app: AppHandle, manager: State<'_, Manager>, settings: ManagerSettings) -> AppResult<ManagerSettings> {
    let saved = manager.save_settings(settings)?;

    if saved.autostart_asked {
        apply_autostart(&app, saved.autostart)?;
    }

    Ok(saved)
}

#[tauri::command]
pub async fn get_patch_report(manager: State<'_, Manager>) -> AppResult<PatchReport> {
    Ok(manager.report())
}

#[tauri::command]
pub async fn check_now(app: AppHandle, manager: State<'_, Manager>) -> AppResult<PatchReport> {
    Ok(recheck(&app, &manager).await)
}

#[tauri::command]
pub async fn update_modpack(app: AppHandle, manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<PatchReport> {
    with_manager(&app, move |manager| block_on(manager.update_now(client_path.as_deref()))).await?;

    Ok(recheck(&app, &manager).await)
}

#[tauri::command]
pub async fn migrate_modpack(app: AppHandle, manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<PatchReport> {
    with_manager(&app, move |manager| block_on(manager.migrate_now(client_path.as_deref()))).await?;

    Ok(recheck(&app, &manager).await)
}

#[tauri::command]
pub async fn collect_logs(manager: State<'_, Manager>) -> AppResult<PathBuf> {
    let output_dir = dirs::desktop_dir().or_else(dirs::home_dir).ok_or_else(|| AppError::coded(ErrorCode::InvalidPath, "no desktop folder"))?;
    let path =
        logs::collect(CollectInput { layout: &manager.layout, clients: &manager.detect(), output_dir: &output_dir, now: chrono::Local::now() })?;

    manager.allow_reveal(&path);

    Ok(path)
}

#[tauri::command]
pub async fn reveal_path(manager: State<'_, Manager>, path: PathBuf) -> AppResult<()> {
    manager.ensure_revealable(&path)?;

    tauri_plugin_opener::reveal_item_in_dir(&path).map_err(|error| AppError::coded(ErrorCode::InvalidPath, error.to_string()))
}

#[tauri::command]
pub async fn prepare_install(manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<InstallPlan> {
    manager.prepare_install(client_path.as_deref()).await
}

#[tauri::command]
pub async fn install_modpack(app: AppHandle, manager: State<'_, Manager>, request: InstallRequest) -> AppResult<InstallOutcome> {
    let outcome = with_manager(&app, move |manager| block_on(manager.install_modpack(request))).await?;

    recheck(&app, &manager).await;

    Ok(outcome)
}

#[tauri::command]
pub async fn uninstall_modpack(app: AppHandle, manager: State<'_, Manager>, request: UninstallRequest) -> AppResult<PatchReport> {
    with_manager(&app, move |manager| block_on(manager.uninstall_modpack(&request))).await?;

    Ok(recheck(&app, &manager).await)
}

#[tauri::command]
pub async fn get_gameface_status(manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<GamefaceStatus> {
    manager.gameface_status(client_path.as_deref())
}

#[tauri::command]
pub async fn read_installer_profile(app: AppHandle, text: DialogText) -> AppResult<Option<Vec<String>>> {
    let dialog = FileDialog { kind: DialogKind::Open, text, extensions: &PROFILE_FILE_EXTENSIONS, fallback_name: FALLBACK_FILE_NAME };

    ask_path(&app, dialog).await?.map(|path| read_component_profile(&path)).transpose()
}

#[tauri::command]
pub async fn take_deep_link(manager: State<'_, Manager>) -> AppResult<Option<DeepLink>> {
    Ok(manager.take_pending_link())
}

#[tauri::command]
pub async fn get_conflicts(app: AppHandle, client_path: Option<PathBuf>) -> AppResult<ConflictReport> {
    with_manager(&app, move |manager| manager.conflicts(client_path.as_deref())).await
}

#[tauri::command]
pub async fn restore_missing(app: AppHandle, client_path: Option<PathBuf>) -> AppResult<ConflictReport> {
    with_manager(&app, move |manager| block_on(manager.restore_missing(client_path.as_deref()))).await
}

#[tauri::command]
pub async fn list_sets(manager: State<'_, Manager>) -> AppResult<SetsView> {
    Ok(manager.sets_view())
}

#[tauri::command]
pub async fn save_set(manager: State<'_, Manager>, name: String, components: Vec<String>) -> AppResult<SetsView> {
    manager.change_sets(|file| file.add(&name, &components).map(drop)).await
}

#[tauri::command]
pub async fn rename_set(manager: State<'_, Manager>, id: String, name: String) -> AppResult<SetsView> {
    manager.change_sets(|file| file.rename(&id, &name)).await
}

#[tauri::command]
pub async fn duplicate_set(manager: State<'_, Manager>, id: String, name: String) -> AppResult<SetsView> {
    manager.change_sets(|file| file.duplicate(&id, &name).map(drop)).await
}

#[tauri::command]
pub async fn delete_set(manager: State<'_, Manager>, id: String) -> AppResult<SetsView> {
    manager.change_sets(|file| file.remove(&id)).await
}

#[tauri::command]
pub async fn export_set(manager: State<'_, Manager>, id: String) -> AppResult<String> {
    manager.set_store().export_code(&id)
}

#[tauri::command]
pub async fn import_set(manager: State<'_, Manager>, code: String, name: Option<String>) -> AppResult<SetsView> {
    let _guard = manager.write_guard().await?;

    manager.set_store().import_code(&code, name.as_deref())?;

    Ok(manager.sets_view())
}

#[tauri::command]
pub async fn export_set_file(app: AppHandle, manager: State<'_, Manager>, id: String, text: DialogText) -> AppResult<Option<PathBuf>> {
    manager.set_store().load().get(&id)?;

    let dialog = FileDialog { kind: DialogKind::Save, text, extensions: &SET_FILE_EXTENSIONS, fallback_name: FALLBACK_FILE_NAME };

    ask_path(&app, dialog).await?.map(|path| manager.set_store().export_file(&id, &path)).transpose()
}

#[tauri::command]
pub async fn export_sets_library(app: AppHandle, manager: State<'_, Manager>, text: DialogText) -> AppResult<Option<PathBuf>> {
    let dialog = FileDialog { kind: DialogKind::Save, text, extensions: &LIBRARY_FILE_EXTENSIONS, fallback_name: FALLBACK_FILE_NAME };

    ask_path(&app, dialog).await?.map(|path| manager.set_store().export_library(&path)).transpose()
}

#[tauri::command]
pub async fn import_set_file(app: AppHandle, manager: State<'_, Manager>, text: DialogText) -> AppResult<Option<SetsView>> {
    let dialog = FileDialog { kind: DialogKind::Open, text, extensions: &IMPORT_FILE_EXTENSIONS, fallback_name: FALLBACK_FILE_NAME };
    let Some(path) = ask_path(&app, dialog).await? else {
        return Ok(None);
    };
    let _guard = manager.write_guard().await?;

    manager.set_store().import_file(&path)?;

    Ok(Some(manager.sets_view()))
}

#[tauri::command]
pub async fn scan_cache(app: AppHandle, client_path: Option<PathBuf>) -> AppResult<CachePlan> {
    with_manager(&app, move |manager| manager.cache_plan(client_path.as_deref())).await
}

#[tauri::command]
pub async fn clear_cache(app: AppHandle, client_path: Option<PathBuf>, ids: Vec<String>) -> AppResult<CacheResult> {
    with_manager(&app, move |manager| block_on(manager.clear_cache(client_path.as_deref(), &ids))).await
}

#[tauri::command]
pub async fn get_account_link(manager: State<'_, Manager>) -> AppResult<AccountLink> {
    Ok(manager.account_link())
}

#[tauri::command]
pub async fn link_account(manager: State<'_, Manager>, code: String) -> AppResult<AccountLink> {
    manager.link_account(&code).await
}

#[tauri::command]
pub async fn select_sync_account(manager: State<'_, Manager>, account_id: u64) -> AppResult<AccountLink> {
    manager.select_sync_account(account_id)
}

#[tauri::command]
pub async fn get_sync_status(manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<SyncStatus> {
    Ok(manager.sync_status(client_path.as_deref()))
}

#[tauri::command]
pub async fn sync_now(manager: State<'_, Manager>, client_path: Option<PathBuf>, resolution: Option<Resolution>) -> AppResult<SyncReport> {
    manager.sync_now(client_path.as_deref(), resolution).await
}

#[tauri::command]
pub async fn get_whats_new(manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<WhatsNew> {
    manager.whats_new(client_path.as_deref()).await
}

#[tauri::command]
pub async fn mark_release_seen(manager: State<'_, Manager>, version: String) -> AppResult<()> {
    manager.mark_release_seen(&version)
}

#[tauri::command]
pub async fn prepare_report(manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<ReportPreview> {
    Ok(manager.prepare_report(client_path.as_deref()))
}

#[tauri::command]
pub async fn send_report(manager: State<'_, Manager>, preview_id: String, parts: Vec<ReportPart>, message: String) -> AppResult<ReportReceipt> {
    manager.send_report(&preview_id, &parts, &message).await
}

#[tauri::command]
pub async fn save_report(
    app: AppHandle,
    manager: State<'_, Manager>,
    preview_id: String,
    parts: Vec<ReportPart>,
    message: String,
    text: DialogText,
) -> AppResult<Option<PathBuf>> {
    let dialog = FileDialog { kind: DialogKind::Save, text, extensions: &REPORT_FILE_EXTENSIONS, fallback_name: FALLBACK_FILE_NAME };
    let Some(target) = ask_path(&app, dialog).await? else {
        return Ok(None);
    };
    let path = manager.save_report(&preview_id, &parts, &message, &target)?;

    manager.allow_reveal(&path);

    Ok(Some(path))
}

#[tauri::command]
pub async fn get_game_health(manager: State<'_, Manager>, client_path: Option<PathBuf>) -> AppResult<HealthReport> {
    manager.game_health(client_path.as_deref())
}

#[cfg(test)]
mod tests;
