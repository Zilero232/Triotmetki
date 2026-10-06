use std::fs;
use std::path::Path;

use super::*;
use crate::catalog::fixtures::catalog;
use crate::detect::fixtures::lesta_client;
use crate::error::ErrorCode;

const INSTALLED: [&str; 5] = [
    "net.triotmetki.core_0.1.0.mtmod",
    "otmetki.companion_0.1.0.mtmod",
    "net.triotmetki.marks_panel_0.1.0.mtmod",
    "net.triotmetki.damage_log_0.1.0.mtmod",
    "net.triotmetki.hit_log_0.1.0.mtmod",
];

fn install(mods_dir: &Path, files: &[&str]) {
    fs::create_dir_all(mods_dir).unwrap();

    for file in files {
        fs::write(mods_dir.join(file), file.as_bytes()).unwrap();
    }
}

fn state(installation: &Installation, id: &str) -> ComponentState {
    installation.components.iter().find(|component| component.id == id).unwrap().state
}

#[test]
fn reads_what_is_installed_and_parked() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();

    install(&client.mods_dir, &INSTALLED[..4]);
    install(&client.mods_dir, &["izeberg.modssettingsapi_1.6.0.mtmod"]);
    install(&disabled_dir(&client_dir), &INSTALLED[4..]);

    let installation = read_installation(ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog }).unwrap();

    assert!(installation.installed);
    assert_eq!(installation.components.len(), 5);
    assert_eq!(state(&installation, "core"), ComponentState::Enabled);
    assert_eq!(state(&installation, "hit_log"), ComponentState::Disabled);
    assert_eq!(installation.components[0].version.as_deref(), Some("0.1.0"));
}

#[test]
fn a_clean_client_is_not_installed() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let catalog = catalog();
    let installation = read_installation(ClientContext { client_dir: &root.path().join("state"), client: &client, catalog: &catalog }).unwrap();

    assert!(!installation.installed);
    assert!(installation.components.is_empty());
}

#[test]
fn only_files_directly_in_the_mod_folders_count_as_ours_to_remove() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let catalog = catalog();
    let client_dir = root.path().join("state");
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let mods_root = client.path.join("mods");

    assert!(in_mod_folders(context, &client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod")));
    assert!(in_mod_folders(context, &mods_root.join("1.44.0.0").join("net.triotmetki.core_0.1.0.mtmod")));
    assert!(in_mod_folders(context, &disabled_dir(&client_dir).join("otmetki.companion_0.1.0.mtmod")));
    assert!(!in_mod_folders(context, &mods_root.join("..").join("net.triotmetki.core_0.1.0.mtmod")));
    assert!(!in_mod_folders(context, &client.mods_dir.join("..").join("..").join("..").join("net.triotmetki.core_0.1.0.mtmod")));
}

#[test]
fn disabling_parks_the_component_and_what_needs_it() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    install(&client.mods_dir, &INSTALLED);

    let changed = set_enabled(ToggleInput { context, component_id: "damage_log", enabled: false }).unwrap();
    let installation = read_installation(context).unwrap();
    let manifest = Manifest::read(&client_dir).unwrap().unwrap();

    assert_eq!(changed, vec!["damage_log", "hit_log"]);
    assert!(!client.mods_dir.join(INSTALLED[3]).exists());
    assert!(disabled_dir(&client_dir).join(INSTALLED[3]).exists());
    assert_eq!(state(&installation, "hit_log"), ComponentState::Disabled);
    assert_eq!(manifest.disabled, vec!["damage_log", "hit_log"]);
    assert_eq!(manifest.files.len(), 3);
}

#[test]
fn enabling_brings_back_its_dependencies() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    install(&client.mods_dir, &INSTALLED[..3]);
    install(&disabled_dir(&client_dir), &INSTALLED[3..]);

    let changed = set_enabled(ToggleInput { context, component_id: "hit_log", enabled: true }).unwrap();

    assert_eq!(changed, vec!["damage_log", "hit_log"]);
    assert!(client.mods_dir.join(INSTALLED[4]).exists());
}

#[test]
fn refuses_to_disable_a_required_component() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();

    install(&client.mods_dir, &INSTALLED);

    let error = set_enabled(ToggleInput {
        context: ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog },
        component_id: "core",
        enabled: false,
    })
    .unwrap_err();

    assert_eq!(error.code(), ErrorCode::RequiredComponent);
    assert!(client.mods_dir.join(INSTALLED[0]).exists());
}

#[test]
fn reports_what_has_to_be_downloaded_before_enabling() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let input = ToggleInput {
        context: ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog },
        component_id: "hit_log",
        enabled: true,
    };

    install(&client.mods_dir, &INSTALLED[..2]);

    assert_eq!(missing_for_enable(&input).unwrap(), vec!["damage_log", "hit_log"]);
    assert_eq!(set_enabled(input).unwrap_err().code(), ErrorCode::NotInstalled);
}

#[test]
fn flags_a_client_patched_since_the_install() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    install(&client.mods_dir, &INSTALLED[..2]);
    sync_manifest(context).unwrap();

    let patched = crate::detect::fixtures::patch_client(&client.path, "1.46.0.0");
    let installation = read_installation(ClientContext { client: &patched, ..context }).unwrap();

    assert!(installation.needs_migration);
    assert_eq!(installation.manifest_game_version.as_deref(), Some("1.45.0.0"));
}

#[test]
fn a_toggle_that_fails_halfway_moves_nothing() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let parked = disabled_dir(&client_dir);
    let mut failures = 0;

    install(&client.mods_dir, &INSTALLED[..3]);

    for operations in 0..10 {
        for file in &INSTALLED[3..] {
            let _ = fs::remove_file(client.mods_dir.join(file));
        }

        install(&parked, &INSTALLED[3..]);
        crate::fsx::faults::fail_times(operations, 2, std::io::ErrorKind::PermissionDenied);

        let result = set_enabled(ToggleInput { context, component_id: "hit_log", enabled: true });

        crate::fsx::faults::clear();

        if result.is_ok() {
            break;
        }

        failures += 1;

        let all_parked = INSTALLED[3..].iter().all(|file| parked.join(file).exists() && !client.mods_dir.join(file).exists());
        let all_enabled = INSTALLED[3..].iter().all(|file| client.mods_dir.join(file).exists() && !parked.join(file).exists());

        assert!(all_parked || all_enabled, "fault after {operations}");

        if all_parked {
            assert_eq!(Manifest::read(&client_dir).unwrap().unwrap().disabled, vec!["damage_log", "hit_log"], "fault after {operations}");
        }
    }

    assert!(failures > 0);
    assert!(client.mods_dir.join(INSTALLED[4]).exists());
}
