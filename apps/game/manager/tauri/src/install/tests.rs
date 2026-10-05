use std::fs;

use super::*;
use crate::catalog::fixtures::catalog;
use crate::detect::fixtures::lesta_client;
use crate::releases::{sha256_hex, ReleasePackage};
use crate::state::disabled_dir;

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

fn base_packages() -> Vec<FetchedPackage> {
    vec![
        fetched("core", "net.triotmetki.core_0.1.0.mtmod"),
        fetched("companion", "otmetki.companion_0.1.0.mtmod"),
        fetched("marks_panel", "net.triotmetki.marks_panel_0.1.0.mtmod"),
    ]
}

#[test]
fn lists_other_mods_but_never_ours() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");

    fs::write(client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "").unwrap();
    fs::write(client.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod"), "").unwrap();
    fs::create_dir_all(client.res_mods_dir.join("scripts")).unwrap();

    let names: Vec<String> = other_mods(&client, &catalog()).into_iter().map(|entry| entry.name).collect();

    assert_eq!(names, vec!["izeberg.modssettingsapi_1.6.0.mtmod", "scripts"]);
}

fn write_res_mods_file(client: &crate::detect::GameClient, relative: &str) {
    let path = client.res_mods_dir.join(relative);

    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, "{}").unwrap();
}

#[test]
fn the_generated_res_map_is_not_another_mod() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");

    write_res_mods_file(&client, crate::gameface::RES_MAP_FILE);

    assert_eq!(other_mods(&client, &catalog()), Vec::new());
}

#[test]
fn the_folders_left_after_gameface_deleted_its_res_map_are_not_another_mod() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");

    fs::create_dir_all(client.res_mods_dir.join("gui").join("unbound").join("gen")).unwrap();

    assert_eq!(other_mods(&client, &catalog()), Vec::new());
}

#[test]
fn a_res_mods_folder_with_foreign_files_next_to_the_res_map_is_listed() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");

    write_res_mods_file(&client, crate::gameface::RES_MAP_FILE);
    write_res_mods_file(&client, "gui/flash/прицел.swf");

    let names: Vec<String> = other_mods(&client, &catalog()).into_iter().map(|entry| entry.name).collect();

    assert_eq!(names, vec!["gui"]);
}

#[test]
fn refuses_to_remove_the_folder_of_the_generated_res_map() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let gui = client.res_mods_dir.join("gui");

    write_res_mods_file(&client, crate::gameface::RES_MAP_FILE);

    assert!(remove_other_mods(&client, &catalog(), std::slice::from_ref(&gui)).is_err());
    assert!(client.res_mods_dir.join(crate::gameface::RES_MAP_FILE).is_file());
}

#[test]
fn installs_the_selection_with_a_manifest() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    fs::write(client.mods_dir.join("net.triotmetki.core_0.0.9.mtmod"), "old").unwrap();
    fs::write(client.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod"), "foreign").unwrap();

    let installed =
        install(InstallInput { context, packages: &base_packages(), modpack_version: "0.1.0", remove_others: &[], parked: &BTreeSet::new() })
            .unwrap();
    let manifest = Manifest::read(&client_dir).unwrap().unwrap();

    assert_eq!(installed.written, vec!["core", "companion", "marks_panel"]);
    assert_eq!(installed.others_error, None);
    assert!(!client.mods_dir.join("net.triotmetki.core_0.0.9.mtmod").exists());
    assert!(client.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod").exists());
    assert_eq!(manifest.modpack, "0.1.0");
    assert_eq!(manifest.files.len(), 3);
    assert_eq!(manifest.component_ids(), vec!["companion", "core", "marks_panel"]);
}

#[test]
fn removes_only_the_reviewed_other_mods() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let reviewed = client.mods_dir.join("a.mtmod");

    fs::write(&reviewed, "").unwrap();
    fs::write(client.mods_dir.join("b.mtmod"), "").unwrap();

    install(InstallInput {
        context,
        packages: &base_packages(),
        modpack_version: "0.1.0",
        remove_others: std::slice::from_ref(&reviewed),
        parked: &BTreeSet::new(),
    })
    .unwrap();

    assert!(!reviewed.exists());
    assert!(client.mods_dir.join("b.mtmod").exists());
}

#[test]
fn removing_the_config_also_removes_the_durable_binding() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let clients_dir = root.path().join("clients");
    let client_dir = clients_dir.join("a");
    let durable = root.path().join("Roaming");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let configs = configs_dir(&client.path);

    install(InstallInput { context, packages: &base_packages(), modpack_version: "0.1.0", remove_others: &[], parked: &BTreeSet::new() }).unwrap();
    fs::create_dir_all(&configs).unwrap();

    for name in ["credentials.json", "config.json"] {
        crate::durable::MirroredFile::new(name, &configs, &durable).write(&serde_json::json!({ "secret": "s" })).unwrap();
    }

    fs::create_dir_all(durable.join("manager")).unwrap();
    fs::write(durable.join("manager").join("settings.json"), "{}").unwrap();

    assert!(!installed_elsewhere(&clients_dir, &client_dir));

    uninstall(UninstallInput { context, remove_config: true, durable_dir: &durable, shared_elsewhere: false }).unwrap();

    let stamps: serde_json::Value = serde_json::from_str(&fs::read_to_string(durable.join(crate::durable::STAMPS_NAME)).unwrap()).unwrap();

    assert!(!configs.exists());
    assert!(!durable.join("credentials.json").exists());
    assert!(!durable.join("config.json").exists());
    assert_eq!(stamps["files"], serde_json::json!({}));
    assert!(durable.join("manager").join("settings.json").exists());
}

#[test]
fn keeps_the_durable_binding_while_another_client_has_the_modpack() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let clients_dir = root.path().join("clients");
    let client_dir = clients_dir.join("a");
    let durable = root.path().join("Roaming");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    fs::create_dir_all(clients_dir.join("b")).unwrap();
    fs::write(clients_dir.join("b").join(MANIFEST_INI), "").unwrap();
    fs::create_dir_all(&durable).unwrap();
    fs::write(durable.join("credentials.json"), "{}").unwrap();

    let shared = installed_elsewhere(&clients_dir, &client_dir);

    uninstall(UninstallInput { context, remove_config: true, durable_dir: &durable, shared_elsewhere: shared }).unwrap();

    assert!(shared);
    assert!(durable.join("credentials.json").exists());
}

#[test]
fn a_full_disk_during_install_keeps_the_previous_modpack() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let parked = disabled_dir(&client_dir).join("net.triotmetki.hit_log_0.0.9.mtmod");

    fs::write(client.mods_dir.join("net.triotmetki.core_0.0.9.mtmod"), "old core").unwrap();
    fs::create_dir_all(parked.parent().unwrap()).unwrap();
    fs::write(&parked, "old hit log").unwrap();
    crate::fsx::faults::fail_after(2, std::io::ErrorKind::StorageFull);

    let result =
        install(InstallInput { context, packages: &base_packages(), modpack_version: "0.1.0", remove_others: &[], parked: &BTreeSet::new() });

    crate::fsx::faults::clear();

    assert_eq!(result.unwrap_err().code(), ErrorCode::DiskFull);
    assert_eq!(fs::read_to_string(client.mods_dir.join("net.triotmetki.core_0.0.9.mtmod")).unwrap(), "old core");
    assert!(parked.exists());
    assert_eq!(list_files(&client.mods_dir).len(), 1);
}

#[test]
fn a_reinstall_keeps_the_selected_parked_components_parked() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let mut packages = base_packages();

    packages.push(fetched("hit_log", "net.triotmetki.hit_log_0.1.0.mtmod"));
    install(InstallInput {
        context,
        packages: &packages,
        modpack_version: "0.1.0",
        remove_others: &[],
        parked: &BTreeSet::from(["hit_log".to_owned(), "damage_log".to_owned()]),
    })
    .unwrap();

    assert!(disabled_dir(&client_dir).join("net.triotmetki.hit_log_0.1.0.mtmod").exists());
    assert!(!client.mods_dir.join("net.triotmetki.hit_log_0.1.0.mtmod").exists());
    assert!(client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod").exists());
}

#[test]
fn refuses_to_remove_a_path_outside_the_reviewed_list() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let outside = root.path().join("important.txt");

    fs::write(&outside, "keep").unwrap();

    assert!(remove_other_mods(&client, &catalog(), std::slice::from_ref(&outside)).is_err());
    assert!(outside.exists());
}

#[test]
fn a_tampered_package_leaves_the_client_untouched() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let mut packages = base_packages();

    fs::write(client.mods_dir.join("net.triotmetki.core_0.0.9.mtmod"), "old").unwrap();
    packages[1].bytes = b"evil".to_vec();

    assert!(install(InstallInput { context, packages: &packages, modpack_version: "0.1.0", remove_others: &[], parked: &BTreeSet::new() }).is_err());
    assert_eq!(crate::fsx::list_files(&client.mods_dir), vec![client.mods_dir.join("net.triotmetki.core_0.0.9.mtmod")]);
}

#[test]
fn selects_required_components_and_dependencies() {
    let ids = selection(&catalog(), &["hit_log".to_owned()]).unwrap();

    assert_eq!(ids, BTreeSet::from(["companion", "core", "damage_log", "hit_log"].map(String::from)));
    assert!(selection(&catalog(), &["nope".to_owned()]).is_err());
}

#[test]
fn uninstalls_our_files_and_optionally_the_config() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let configs = configs_dir(&client.path);

    install(InstallInput { context, packages: &base_packages(), modpack_version: "0.1.0", remove_others: &[], parked: &BTreeSet::new() }).unwrap();
    fs::write(client.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod"), "").unwrap();
    fs::create_dir_all(&configs).unwrap();
    fs::write(configs.join("config.json"), "{}").unwrap();

    uninstall(UninstallInput { context, remove_config: false, durable_dir: &root.path().join("Roaming"), shared_elsewhere: false }).unwrap();

    assert_eq!(list_files(&client.mods_dir), vec![client.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod")]);
    assert!(configs.join("config.json").exists());
    assert!(!client_dir.exists());
}

#[test]
fn the_app_uninstaller_cleans_every_recorded_client() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let clients_dir = root.path().join("clients");
    let client_dir = clients_dir.join(crate::state::client_key(&client.path));
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    install(InstallInput { context, packages: &base_packages(), modpack_version: "0.1.0", remove_others: &[], parked: &BTreeSet::new() }).unwrap();

    let cleaned = uninstall_everywhere(&clients_dir, &owned_patterns_catalog(None));

    assert_eq!(cleaned, vec![client.path.clone()]);
    assert!(list_files(&client.mods_dir).is_empty());
    assert!(!client_dir.exists());
}

#[test]
fn reads_an_installer_component_profile() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("Стрим.ini");
    let mut ini = ini::Ini::new();

    ini.with_section(Some("Setup")).set("SetupType", "custom").set("Components", r"base\core,battle\marks_panel,battle");
    crate::ini_file::write(&path, &ini).unwrap();

    assert_eq!(read_component_profile(&path).unwrap(), vec!["core", "marks_panel", "battle"]);
}

#[cfg(windows)]
#[test]
fn an_other_mod_that_cannot_be_removed_does_not_fail_the_install() {
    use std::os::windows::fs::OpenOptionsExt;

    const FILE_SHARE_READ: u32 = 1;

    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let reviewed = client.mods_dir.join("a.mtmod");

    fs::write(&reviewed, "").unwrap();

    let lock = fs::OpenOptions::new().read(true).share_mode(FILE_SHARE_READ).open(&reviewed).unwrap();
    let installed = install(InstallInput {
        context,
        packages: &base_packages(),
        modpack_version: "0.1.0",
        remove_others: std::slice::from_ref(&reviewed),
        parked: &BTreeSet::new(),
    });

    drop(lock);

    let installed = installed.unwrap();

    assert_eq!(installed.others_error, Some(ErrorCode::FileLocked));
    assert_eq!(installed.written, vec!["core", "companion", "marks_panel"]);
    assert!(reviewed.exists());
}

#[test]
fn a_tampered_manifest_cannot_point_the_uninstall_outside_the_mods_folders() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let outside = root.path().join("Документы").join("otmetki.companion_0.1.0.mtmod");

    install(InstallInput { context, packages: &base_packages(), modpack_version: "0.1.0", remove_others: &[], parked: &BTreeSet::new() }).unwrap();
    fs::create_dir_all(outside.parent().unwrap()).unwrap();
    fs::write(&outside, "not ours to delete").unwrap();

    let mut manifest = Manifest::read(&client_dir).unwrap().unwrap();

    manifest.files.push(outside.clone());
    manifest.write(&client_dir).unwrap();

    uninstall(UninstallInput { context, remove_config: false, durable_dir: &root.path().join("Roaming"), shared_elsewhere: false }).unwrap();

    assert_eq!(fs::read_to_string(&outside).unwrap(), "not ours to delete");
}

#[test]
fn the_uninstall_still_removes_packages_left_in_an_older_version_folder() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let older = client.path.join("mods").join("1.44.0.0").join("otmetki.companion_0.1.0.mtmod");

    install(InstallInput { context, packages: &base_packages(), modpack_version: "0.1.0", remove_others: &[], parked: &BTreeSet::new() }).unwrap();
    fs::create_dir_all(older.parent().unwrap()).unwrap();
    fs::write(&older, "older").unwrap();

    let mut manifest = Manifest::read(&client_dir).unwrap().unwrap();

    manifest.files.push(older.clone());
    manifest.write(&client_dir).unwrap();

    uninstall(UninstallInput { context, remove_config: false, durable_dir: &root.path().join("Roaming"), shared_elsewhere: false }).unwrap();

    assert!(!older.exists());
}
