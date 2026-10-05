use std::fs;
use std::path::Path;

use super::setup::PackageSource;
use super::*;
use crate::catalog::fixtures::catalog_json;
use crate::components::{read_installation, sync_manifest, ComponentState};
use crate::detect::fixtures::{lesta_client_dir, write_version_xml};
use crate::error::ErrorCode;
use crate::fsx::write_atomic;
use crate::state::{disabled_dir, DependencyOwner, Manifest};

const ENABLED: [&str; 4] = [
    "net.triotmetki.core_0.1.0.mtmod",
    "otmetki.companion_0.1.0.mtmod",
    "net.triotmetki.marks_panel_0.1.0.mtmod",
    "net.triotmetki.damage_log_0.1.0.mtmod",
];
const PARKED: &str = "net.triotmetki.hit_log_0.1.0.mtmod";
const THEIR_GAMEFACE: &str = "net.openwg.gameface_1.2.0.mtmod";
const THEIR_GUIFLASH: &str = "gambiter.guiflash_0.6.5.mtmod";

fn manager(root: &Path) -> Manager {
    let layout = Layout::new(root.join("Local"), root.join("Roaming"));

    Manager::new(layout, ReleasesClient::new("http://127.0.0.1:9").unwrap()).unwrap()
}

#[test]
fn a_first_install_without_a_connection_is_offline() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path());
    let client = lesta_client_dir(root.path(), "Мир танков", "1.45.0.0");

    tauri::async_runtime::block_on(async {
        let plan = manager.prepare_install(Some(&client)).await.unwrap();

        assert_eq!(plan.source, PackageSource::Offline);
        assert!(plan.catalog.is_none());
        assert!(plan.release.is_none());

        let request = InstallRequest { client_path: Some(client.clone()), components: Vec::new(), remove_others: Vec::new() };

        assert_eq!(manager.install_modpack(request).await.unwrap_err().code(), ErrorCode::Offline);
    });
}

#[test]
fn a_second_writer_is_told_the_manager_is_busy() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path());

    tauri::async_runtime::block_on(async {
        let held = manager.write_guard().await.unwrap();

        assert_eq!(manager.try_write_guard().unwrap_err().code(), ErrorCode::Busy);
        drop(held);
        assert!(manager.try_write_guard().is_ok());
    });
}

#[test]
fn refuses_to_write_into_an_unsupported_client() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path());
    let old = root.path().join("old");
    let supported = lesta_client_dir(root.path(), "Мир танков", "1.45.0.0");

    write_version_xml(&old, "1.30.0.0", "RU");

    assert_eq!(manager.usable_client(Some(&old)).unwrap_err().code(), ErrorCode::ClientUnsupported);
    assert!(manager.client(Some(&old)).is_ok());
    assert!(manager.usable_client(Some(&supported)).is_ok());

    tauri::async_runtime::block_on(async {
        let request = InstallRequest { client_path: Some(old.clone()), components: Vec::new(), remove_others: Vec::new() };

        assert_eq!(manager.install_modpack(request).await.unwrap_err().code(), ErrorCode::ClientUnsupported);
        assert_eq!(manager.migrate_now(Some(&old)).await.unwrap_err().code(), ErrorCode::ClientUnsupported);
    });
}

#[test]
fn keeps_settings_changes_from_concurrent_writers() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path());
    let client = lesta_client_dir(root.path(), "Мир танков", "1.45.0.0");

    manager.add_client(&client).unwrap();
    manager.change_settings(|settings| settings.autostart_asked = true).unwrap();

    let reloaded = crate::settings::ManagerSettings::load(&manager.layout.settings_file());

    assert!(reloaded.autostart_asked);
    assert_eq!(reloaded.manual_clients, vec![client]);
}

fn installed_client(manager: &Manager, root: &Path, catalog: serde_json::Value) -> ClientScope {
    let path = lesta_client_dir(root, "Мир танков", "1.45.0.0");

    write_atomic(&manager.layout.catalog_cache(), catalog.to_string().as_bytes()).unwrap();

    let scope = manager.usable_scope(Some(&path)).unwrap();

    for file in ENABLED {
        write_atomic(&scope.client.mods_dir.join(file), file.as_bytes()).unwrap();
    }

    write_atomic(&disabled_dir(&scope.client_dir).join(PARKED), PARKED.as_bytes()).unwrap();
    sync_manifest(scope.context()).unwrap();

    scope
}

fn hit_log_state(scope: &ClientScope) -> ComponentState {
    read_installation(scope.context()).unwrap().components.into_iter().find(|component| component.id == "hit_log").unwrap().state
}

#[test]
fn enabling_a_component_records_the_players_copies_of_its_dependencies() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path());
    let scope = installed_client(&manager, root.path(), catalog_json());

    fs::write(scope.client.mods_dir.join(THEIR_GAMEFACE), "their gameface").unwrap();
    fs::write(scope.client.mods_dir.join(THEIR_GUIFLASH), "their guiflash").unwrap();

    let changed = tauri::async_runtime::block_on(manager.set_component_enabled(Some(&scope.client.path), "hit_log", true)).unwrap();
    let manifest = Manifest::read(&scope.client_dir).unwrap().unwrap();

    assert_eq!(changed, vec!["hit_log"]);
    assert_eq!(hit_log_state(&scope), ComponentState::Enabled);
    assert_eq!(
        manifest.dependency("openwg_gameface").map(|record| (record.owner, record.file.as_str())),
        Some((DependencyOwner::User, THEIR_GAMEFACE))
    );
    assert_eq!(manifest.dependency("guiflash").map(|record| (record.owner, record.file.as_str())), Some((DependencyOwner::User, THEIR_GUIFLASH)));
}

#[test]
fn enabling_changes_nothing_when_a_missing_dependency_cannot_be_downloaded() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path());
    let mut catalog = catalog_json();

    catalog["components"][6]["sourceUrl"] = "https://example.com/gambiter.guiflash_0.6.6.mtmod".into();

    let scope = installed_client(&manager, root.path(), catalog);

    fs::write(scope.client.mods_dir.join(THEIR_GAMEFACE), "their gameface").unwrap();

    let error = tauri::async_runtime::block_on(manager.set_component_enabled(Some(&scope.client.path), "hit_log", true)).unwrap_err();

    assert_eq!(error.code(), ErrorCode::UntrustedHost);
    assert_eq!(hit_log_state(&scope), ComponentState::Disabled);
    assert!(Manifest::read(&scope.client_dir).unwrap().unwrap().dependencies.is_empty());
}

#[test]
fn disabling_a_component_downloads_nothing() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path());
    let mut catalog = catalog_json();

    catalog["components"][6]["sourceUrl"] = "https://example.com/gambiter.guiflash_0.6.6.mtmod".into();

    let scope = installed_client(&manager, root.path(), catalog);
    let changed = tauri::async_runtime::block_on(manager.set_component_enabled(Some(&scope.client.path), "damage_log", false)).unwrap();

    assert_eq!(changed, vec!["damage_log"]);
    assert!(Manifest::read(&scope.client_dir).unwrap().unwrap().dependencies.is_empty());
}

#[test]
fn remembers_whether_gameface_restarts_the_client_after_the_last_change() {
    let root = tempfile::tempdir().unwrap();
    let manager = manager(root.path());
    let client_dir = lesta_client_dir(root.path(), "Мир танков", "1.45.0.0");
    let client = manager.client(Some(&client_dir)).unwrap();
    let gameface = client.mods_dir.join(THEIR_GAMEFACE);

    assert!(!manager.gameface_status(Some(&client_dir)).unwrap().restart_expected);

    fs::write(&gameface, b"not a package").unwrap();

    assert_eq!(manager.sync_res_map(&client), ResMapOutcome::Skipped);
    assert!(manager.gameface_status(Some(&client_dir)).unwrap().restart_expected);

    fs::remove_file(&gameface).unwrap();

    assert_eq!(manager.sync_res_map(&client), ResMapOutcome::NoGameface);
    assert!(!manager.gameface_status(Some(&client_dir)).unwrap().restart_expected);
}

#[test]
fn a_partial_install_lists_only_the_steps_that_failed() {
    let warnings = setup::install_warnings([(setup::InstallStep::OtherMods, None), (setup::InstallStep::Dependencies, Some(ErrorCode::Http))]);

    assert_eq!(warnings, vec![setup::InstallWarning { step: setup::InstallStep::Dependencies, code: ErrorCode::Http }]);
}
