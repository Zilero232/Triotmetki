use std::collections::BTreeSet;
use std::fs;

use super::*;
use crate::catalog::fixtures::catalog;
use crate::components::{read_installation, sync_manifest, ClientContext, ComponentState};
use crate::detect::fixtures::{lesta_client, patch_client};
use crate::releases::fixtures::{latest, release};
use crate::releases::{sha256_hex, ReleasePackage};
use crate::state::{disabled_dir, Manifest};

fn version(text: &str) -> GameVersion {
    GameVersion::parse(text).unwrap()
}

fn plan_for(recorded: &str, current: &str, installed: &str, response: Option<&LatestRelease>) -> PatchAction {
    plan(PlanInput { recorded_game: Some(version(recorded)), current_game: version(current), installed_modpack: Some(installed), latest: response })
}

#[test]
fn migrates_when_the_installed_release_supports_the_new_client() {
    let response = latest("1.46.0.0", Some(release("0.1.0")));

    assert_eq!(plan_for("1.45.0.0", "1.46.0.0", "0.1.0", Some(&response)), PatchAction::Migrate);
}

#[test]
fn installs_a_newer_release_after_a_patch() {
    let response = latest("1.46.0.0", Some(release("0.2.0")));

    assert_eq!(plan_for("1.45.0.0", "1.46.0.0", "0.1.0", Some(&response)), PatchAction::Install(release("0.2.0")));
}

#[test]
fn waits_when_no_release_supports_the_new_client() {
    let response = latest("1.46.0.0", None);

    assert_eq!(plan_for("1.45.0.0", "1.46.0.0", "0.1.0", Some(&response)), PatchAction::Wait);
}

#[test]
fn only_offers_a_newer_release_without_a_patch() {
    let response = latest("1.45.0.0", Some(release("0.2.0")));

    assert_eq!(plan_for("1.45.0.0", "1.45.0.0", "0.1.0", Some(&response)), PatchAction::Offer(release("0.2.0")));
}

#[test]
fn does_nothing_when_everything_is_current() {
    let response = latest("1.45.0.0", Some(release("0.1.0")));

    assert_eq!(plan_for("1.45.0.0", "1.45.0.0", "0.1.0", Some(&response)), PatchAction::Nothing);
    assert_eq!(plan_for("1.45.0.0", "1.45.0.0", "0.1.0", None), PatchAction::Nothing);
}

#[test]
fn reports_offline_only_after_a_patch() {
    assert_eq!(plan_for("1.45.0.0", "1.46.0.0", "0.1.0", None), PatchAction::Offline);
}

#[test]
fn compares_modpack_versions_semantically() {
    assert!(is_newer("0.10.0", Some("0.9.0")));
    assert!(!is_newer("0.1.0", Some("0.1.0")));
    assert!(is_newer("0.1.0", None));
    assert!(is_downgrade("0.9.0", Some("0.10.0")));
    assert!(!is_downgrade("0.10.0", Some("0.10.0")));
    assert!(!is_downgrade("0.1.0", None));
}

#[test]
fn copies_our_packages_into_the_new_mods_folder_only() {
    let root = tempfile::tempdir().unwrap();
    let old = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();

    fs::write(old.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "core").unwrap();
    fs::write(old.mods_dir.join("otmetki.companion_0.1.0.mtmod"), "companion").unwrap();
    fs::write(old.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod"), "foreign").unwrap();
    sync_manifest(ClientContext { client_dir: &client_dir, client: &old, catalog: &catalog }).unwrap();

    let patched = patch_client(&old.path, "1.46.0.0");
    let context = ClientContext { client_dir: &client_dir, client: &patched, catalog: &catalog };
    let copied = migrate(MigrateInput { context, from_mods_dir: &old.mods_dir }).unwrap();
    let manifest = Manifest::read(&client_dir).unwrap().unwrap();

    assert_eq!(copied.len(), 2);
    assert!(!patched.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod").exists());
    assert!(old.mods_dir.join("net.triotmetki.core_0.1.0.mtmod").exists());
    assert_eq!(manifest.version, "1.46.0.0");
    assert_eq!(manifest.mods_dir, patched.mods_dir);
    assert!(!read_installation(context).unwrap().needs_migration);
}

fn fetched(id: &str, file: &str) -> FetchedPackage {
    FetchedPackage {
        package: ReleasePackage {
            id: id.to_owned(),
            file: file.to_owned(),
            url: format!("https://triotmetki.ru/downloads/modpack/0.2.0/{file}"),
            sha256: sha256_hex(file.as_bytes()),
            size: file.len() as u64,
        },
        bytes: file.as_bytes().to_vec(),
    }
}

#[test]
fn installs_a_release_keeping_parked_components_parked() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.46.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    fs::write(client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "old").unwrap();
    fs::write(client.mods_dir.join("otmetki.companion_0.1.0.mtmod"), "old").unwrap();
    fs::create_dir_all(disabled_dir(&client_dir)).unwrap();
    fs::write(disabled_dir(&client_dir).join("net.triotmetki.damage_log_0.1.0.mtmod"), "old").unwrap();

    let (enabled, disabled) = install_targets(context, &[]).unwrap();
    let packages = [
        fetched("core", "net.triotmetki.core_0.2.0.mtmod"),
        fetched("companion", "otmetki.companion_0.2.0.mtmod"),
        fetched("damage_log", "net.triotmetki.damage_log_0.2.0.mtmod"),
    ];

    apply_packages(ApplyInput {
        context,
        modpack_version: "0.2.0",
        packages: &packages,
        disabled: &disabled,
        replace_all: false,
        drop_retired: false,
    })
    .unwrap();

    let installation = read_installation(context).unwrap();

    assert_eq!(enabled, BTreeSet::from(["companion".to_owned(), "core".to_owned()]));
    assert!(client.mods_dir.join("net.triotmetki.core_0.2.0.mtmod").exists());
    assert!(!client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod").exists());
    assert!(disabled_dir(&client_dir).join("net.triotmetki.damage_log_0.2.0.mtmod").exists());
    assert!(!disabled_dir(&client_dir).join("net.triotmetki.damage_log_0.1.0.mtmod").exists());
    assert_eq!(installation.modpack_version.as_deref(), Some("0.2.0"));
    assert!(installation.components.iter().all(|component| component.state != ComponentState::Missing));
}

#[test]
fn an_update_drops_our_packages_the_catalogue_retired() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.46.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let retired = client.mods_dir.join("net.triotmetki.consumables_0.1.0.mtmod");
    let parked = disabled_dir(&client_dir).join("otmetki.consumables_0.1.0.mtmod");
    let foreign = client.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod");

    fs::write(client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "old").unwrap();
    fs::write(&retired, "retired").unwrap();
    fs::write(&foreign, "foreign").unwrap();
    fs::create_dir_all(disabled_dir(&client_dir)).unwrap();
    fs::write(&parked, "retired").unwrap();
    sync_manifest(context).unwrap();

    let mut manifest = Manifest::read(&client_dir).unwrap().unwrap();

    manifest.components.push(crate::state::inno_name("battle", "consumables"));
    manifest.write(&client_dir).unwrap();

    let mut found = install::retired_files(context);

    found.sort();

    assert_eq!(found, vec![parked.clone(), retired.clone()]);

    apply_packages(ApplyInput {
        context,
        modpack_version: "0.2.0",
        packages: &[fetched("core", "net.triotmetki.core_0.2.0.mtmod")],
        disabled: &BTreeSet::new(),
        replace_all: false,
        drop_retired: true,
    })
    .unwrap();

    let manifest = Manifest::read(&client_dir).unwrap().unwrap();

    assert!(!retired.exists());
    assert!(!parked.exists());
    assert!(foreign.exists());
    assert!(client.mods_dir.join("net.triotmetki.core_0.2.0.mtmod").exists());
    assert!(!manifest.component_ids().contains(&"consumables".to_owned()));
    assert!(manifest.component_ids().contains(&"core".to_owned()));
}

#[test]
fn a_catalogue_without_components_retires_nothing() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.46.0.0");
    let client_dir = root.path().join("state");
    let catalog = crate::install::owned_patterns_catalog(None);
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    fs::write(client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "core").unwrap();

    assert!(install::retired_files(context).is_empty());
}

#[test]
fn a_component_update_keeps_retired_packages_without_the_flag() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.46.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let retired = client.mods_dir.join("net.triotmetki.consumables_0.1.0.mtmod");

    fs::write(&retired, "retired").unwrap();

    let packages = [fetched("core", "net.triotmetki.core_0.2.0.mtmod")];

    apply_packages(ApplyInput {
        context,
        modpack_version: "0.2.0",
        packages: &packages,
        disabled: &BTreeSet::new(),
        replace_all: false,
        drop_retired: false,
    })
    .unwrap();

    assert!(retired.exists());
}

#[test]
fn a_tampered_package_leaves_the_install_untouched() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.46.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let mut tampered = fetched("core", "net.triotmetki.core_0.2.0.mtmod");

    tampered.bytes = b"evil".to_vec();

    let result = apply_packages(ApplyInput {
        context,
        modpack_version: "0.2.0",
        packages: &[tampered],
        disabled: &BTreeSet::new(),
        replace_all: false,
        drop_retired: false,
    });

    assert!(result.is_err());
    assert!(!client.mods_dir.join("net.triotmetki.core_0.2.0.mtmod").exists());
}

#[test]
fn a_requested_component_is_enabled_with_its_dependencies() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.46.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    fs::create_dir_all(disabled_dir(&client_dir)).unwrap();
    fs::write(disabled_dir(&client_dir).join("net.triotmetki.damage_log_0.1.0.mtmod"), "old").unwrap();

    let (enabled, disabled) = install_targets(context, &["hit_log".to_owned()]).unwrap();

    assert!(enabled.contains("hit_log"));
    assert!(enabled.contains("damage_log"));
    assert!(disabled.is_empty());
}

#[test]
fn replaces_a_truncated_copy_left_by_an_earlier_migration() {
    let root = tempfile::tempdir().unwrap();
    let old = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();

    fs::write(old.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "the whole core package").unwrap();

    let patched = patch_client(&old.path, "1.46.0.0");

    fs::write(patched.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "the whole").unwrap();

    let context = ClientContext { client_dir: &client_dir, client: &patched, catalog: &catalog };
    let copied = migrate(MigrateInput { context, from_mods_dir: &old.mods_dir }).unwrap();

    assert_eq!(copied, vec!["net.triotmetki.core_0.1.0.mtmod"]);
    assert_eq!(fs::read_to_string(patched.mods_dir.join("net.triotmetki.core_0.1.0.mtmod")).unwrap(), "the whole core package");
    assert!(migrate(MigrateInput { context, from_mods_dir: &old.mods_dir }).unwrap().is_empty());
}

#[test]
fn a_full_disk_during_migration_leaves_no_partial_package() {
    let root = tempfile::tempdir().unwrap();
    let old = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();

    fs::write(old.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "core").unwrap();
    fs::write(old.mods_dir.join("otmetki.companion_0.1.0.mtmod"), "companion").unwrap();

    let patched = patch_client(&old.path, "1.46.0.0");
    let context = ClientContext { client_dir: &client_dir, client: &patched, catalog: &catalog };

    crate::fsx::faults::fail_after(2, std::io::ErrorKind::StorageFull);

    let result = migrate(MigrateInput { context, from_mods_dir: &old.mods_dir });

    crate::fsx::faults::clear();

    assert_eq!(result.unwrap_err().code(), crate::error::ErrorCode::DiskFull);
    assert!(crate::fsx::list_files(&patched.mods_dir).is_empty());
    assert!(Manifest::read(&client_dir).unwrap().is_none());
}

#[cfg(windows)]
#[test]
fn a_locked_package_rolls_the_update_back() {
    use std::os::windows::fs::OpenOptionsExt;

    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.46.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let old_core = client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod");
    let old_companion = client.mods_dir.join("otmetki.companion_0.1.0.mtmod");

    fs::write(&old_core, "old core").unwrap();
    fs::write(&old_companion, "old companion").unwrap();

    let lock = fs::OpenOptions::new().read(true).share_mode(0).open(&old_companion).unwrap();
    let packages = [fetched("core", "net.triotmetki.core_0.2.0.mtmod"), fetched("companion", "otmetki.companion_0.2.0.mtmod")];
    let result = apply_packages(ApplyInput {
        context,
        modpack_version: "0.2.0",
        packages: &packages,
        disabled: &BTreeSet::new(),
        replace_all: false,
        drop_retired: false,
    });

    drop(lock);

    let mut names: Vec<String> =
        crate::fsx::list_files(&client.mods_dir).iter().map(|path| path.file_name().unwrap().to_string_lossy().into_owned()).collect();

    names.sort();

    assert_eq!(result.unwrap_err().code(), crate::error::ErrorCode::FileLocked);
    assert_eq!(names, vec!["net.triotmetki.core_0.1.0.mtmod", "otmetki.companion_0.1.0.mtmod"]);
    assert_eq!(fs::read_to_string(&old_core).unwrap(), "old core");
}

#[test]
fn a_failed_swap_restores_the_previous_files() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.46.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    fs::write(client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "old core").unwrap();
    fs::write(client.mods_dir.join("otmetki.companion_0.1.0.mtmod"), "old companion").unwrap();

    let packages = [fetched("core", "net.triotmetki.core_0.2.0.mtmod"), fetched("companion", "otmetki.companion_0.2.0.mtmod")];

    crate::fsx::faults::fail_after(4, std::io::ErrorKind::PermissionDenied);

    let result = apply_packages(ApplyInput {
        context,
        modpack_version: "0.2.0",
        packages: &packages,
        disabled: &BTreeSet::new(),
        replace_all: false,
        drop_retired: false,
    });

    crate::fsx::faults::clear();

    let mut names: Vec<String> =
        crate::fsx::list_files(&client.mods_dir).iter().map(|path| path.file_name().unwrap().to_string_lossy().into_owned()).collect();

    names.sort();

    assert!(result.is_err());
    assert_eq!(names, vec!["net.triotmetki.core_0.1.0.mtmod", "otmetki.companion_0.1.0.mtmod"]);
    assert!(Manifest::read(&client_dir).unwrap().is_none());
}

#[test]
fn serialises_the_status_for_the_ui() {
    let status = PatchStatus::Waiting { game_version: "1.46.0.0".into(), from: "1.45.0.0".into() };

    assert_eq!(serde_json::to_value(&status).unwrap(), serde_json::json!({ "kind": "waiting", "gameVersion": "1.46.0.0", "from": "1.45.0.0" }));
    assert_eq!(status.kind(), "waiting");
    assert_eq!(
        serde_json::to_value(PatchStatus::Failed { code: crate::error::ErrorCode::DiskFull }).unwrap(),
        serde_json::json!({ "kind": "failed", "code": "disk_full" })
    );
}

#[test]
fn a_failed_migration_keeps_a_different_copy_already_in_the_new_folder() {
    let root = tempfile::tempdir().unwrap();
    let old = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let core = "net.triotmetki.core_0.1.0.mtmod";
    let mut failures = 0;

    fs::write(old.mods_dir.join(core), "core from the old folder").unwrap();
    fs::write(old.mods_dir.join("otmetki.companion_0.1.0.mtmod"), "companion").unwrap();

    let patched = patch_client(&old.path, "1.46.0.0");
    let context = ClientContext { client_dir: &client_dir, client: &patched, catalog: &catalog };

    for operations in 0..12 {
        for path in crate::fsx::list_files(&patched.mods_dir) {
            fs::remove_file(path).unwrap();
        }

        fs::write(patched.mods_dir.join(core), "the copy already there").unwrap();
        crate::fsx::faults::fail_after(operations, std::io::ErrorKind::StorageFull);

        let result = migrate(MigrateInput { context, from_mods_dir: &old.mods_dir });

        crate::fsx::faults::clear();

        if result.is_ok() {
            break;
        }

        failures += 1;

        let state = (fs::read_to_string(patched.mods_dir.join(core)).unwrap(), crate::fsx::list_files(&patched.mods_dir).len());

        assert!(
            state == ("the copy already there".to_owned(), 1) || state == ("core from the old folder".to_owned(), 2),
            "fault after {operations}: {state:?}"
        );
    }

    assert!(failures > 0);
    assert_eq!(fs::read_to_string(patched.mods_dir.join(core)).unwrap(), "core from the old folder");
}

fn write_journal(client_dir: &std::path::Path, journal: &serde_json::Value) -> std::path::PathBuf {
    let path = commit_journal(client_dir);

    fs::create_dir_all(client_dir).unwrap();
    fs::write(&path, journal.to_string()).unwrap();

    path
}

#[test]
fn replays_a_commit_the_process_did_not_finish() {
    let root = tempfile::tempdir().unwrap();
    let mods_dir = root.path().join("Мир танков").join("mods").join("1.45.0.0");
    let client_dir = root.path().join("clients").join("ключ");
    let core = mods_dir.join("net.triotmetki.core_0.1.0.mtmod");
    let companion = mods_dir.join("otmetki.companion_0.2.0.mtmod");
    let core_old = crate::fsx::sibling(&core, crate::fsx::RETIRED_SUFFIX);
    let core_part = crate::fsx::sibling(&core, crate::fsx::PART_SUFFIX);
    let companion_part = crate::fsx::sibling(&companion, crate::fsx::PART_SUFFIX);

    fs::create_dir_all(&mods_dir).unwrap();
    fs::write(&core_old, "old core").unwrap();
    fs::write(&core_part, "new core").unwrap();
    fs::write(&companion, "new companion").unwrap();

    let journal =
        write_journal(&client_dir, &serde_json::json!({ "retired": [[core, core_old]], "placed": [[companion_part, companion], [core_part, core]] }));

    assert!(recover_commit(RecoverInput { journal: &journal, roots: &[root.path().to_path_buf()] }).unwrap());

    assert_eq!(fs::read_to_string(&core).unwrap(), "old core");
    assert_eq!(crate::fsx::list_files(&mods_dir), vec![core.clone()]);
    assert!(!journal.exists());
}

#[test]
fn a_retired_file_the_journal_does_not_name_stays_retired() {
    let root = tempfile::tempdir().unwrap();
    let mods_dir = root.path().join("моды");
    let stale = mods_dir.join("net.triotmetki.core_0.0.9.mtmod");
    let stale_old = crate::fsx::sibling(&stale, crate::fsx::RETIRED_SUFFIX);

    fs::create_dir_all(&mods_dir).unwrap();
    fs::write(&stale_old, "stale").unwrap();

    let journal = write_journal(&root.path().join("clients"), &serde_json::json!({ "retired": [], "placed": [] }));

    assert!(recover_commit(RecoverInput { journal: &journal, roots: &[root.path().to_path_buf()] }).unwrap());

    assert!(!stale.exists());
    assert!(stale_old.exists());
}

#[test]
fn a_journal_entry_that_is_not_a_staged_pair_is_ignored() {
    let root = tempfile::tempdir().unwrap();
    let victim = root.path().join("Документы").join("важное.txt");

    fs::create_dir_all(victim.parent().unwrap()).unwrap();
    fs::write(&victim, "keep").unwrap();

    let journal = write_journal(
        &root.path().join("clients"),
        &serde_json::json!({ "retired": [[root.path().join("x"), victim]], "placed": [[root.path().join("other.part"), victim]] }),
    );

    assert!(recover_commit(RecoverInput { journal: &journal, roots: &[root.path().to_path_buf()] }).unwrap());

    assert_eq!(fs::read_to_string(&victim).unwrap(), "keep");
}

#[test]
fn a_journal_entry_outside_the_mod_folders_is_ignored() {
    let root = tempfile::tempdir().unwrap();
    let mods_dir = root.path().join("Мир танков").join("mods").join("1.45.0.0");
    let victim = root.path().join("Документы").join("важное.txt");
    let escape = mods_dir.join("..").join("..").join("..").join("Документы").join("важное.txt");

    fs::create_dir_all(&mods_dir).unwrap();
    fs::create_dir_all(victim.parent().unwrap()).unwrap();
    fs::write(&victim, "keep").unwrap();

    let journal = write_journal(
        &root.path().join("clients"),
        &serde_json::json!({ "placed": [[crate::fsx::sibling(&victim, crate::fsx::PART_SUFFIX), victim], [crate::fsx::sibling(&escape, crate::fsx::PART_SUFFIX), escape]], "retired": [] }),
    );

    assert!(recover_commit(RecoverInput { journal: &journal, roots: &[mods_dir] }).unwrap());

    assert_eq!(fs::read_to_string(&victim).unwrap(), "keep");
    assert!(!journal.exists());
}

#[test]
fn no_journal_means_nothing_to_replay() {
    let root = tempfile::tempdir().unwrap();

    assert!(!recover_commit(RecoverInput { journal: &commit_journal(root.path()), roots: &[] }).unwrap());
}

#[test]
fn a_migration_from_a_vanished_folder_fails_and_keeps_the_manifest() {
    let root = tempfile::tempdir().unwrap();
    let old = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("состояние");
    let catalog = catalog();

    fs::write(old.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "core").unwrap();
    sync_manifest(ClientContext { client_dir: &client_dir, client: &old, catalog: &catalog }).unwrap();
    fs::remove_dir_all(&old.mods_dir).unwrap();

    let patched = patch_client(&old.path, "1.46.0.0");
    let context = ClientContext { client_dir: &client_dir, client: &patched, catalog: &catalog };
    let result = migrate(MigrateInput { context, from_mods_dir: &old.mods_dir });

    assert_eq!(result.unwrap_err().code(), crate::error::ErrorCode::NotInstalled);
    assert_eq!(Manifest::read(&client_dir).unwrap().unwrap().version, "1.45.0.0");
}

#[test]
fn a_finished_migration_leaves_no_commit_journal() {
    let root = tempfile::tempdir().unwrap();
    let old = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("состояние");
    let catalog = catalog();

    fs::write(old.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "core").unwrap();

    let patched = patch_client(&old.path, "1.46.0.0");
    let context = ClientContext { client_dir: &client_dir, client: &patched, catalog: &catalog };

    migrate(MigrateInput { context, from_mods_dir: &old.mods_dir }).unwrap();

    assert!(!commit_journal(&client_dir).exists());
}
