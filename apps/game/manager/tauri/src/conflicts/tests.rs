use std::fs;
use std::io::Write;
use std::path::Path;

use zip::write::SimpleFileOptions;

use super::*;
use crate::catalog::fixtures::catalog;
use crate::components::sync_manifest;
use crate::detect::fixtures::lesta_client;
use crate::detect::GameClient;
use crate::releases::sha256_hex;

const CORE: &str = "net.triotmetki.core_0.1.0.mtmod";
const COMPANION: &str = "otmetki.companion_0.1.0.mtmod";
const DAMAGE_LOG: &str = "net.triotmetki.damage_log_0.1.0.mtmod";
const MARKS_PANEL: &str = "net.triotmetki.marks_panel_0.1.0.mtmod";

fn package(path: &Path, meta_id: Option<&str>, entries: &[&str]) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();

    let mut writer = zip::ZipWriter::new(fs::File::create(path).unwrap());
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    if let Some(id) = meta_id {
        writer.start_file("meta.xml", options).unwrap();
        writer.write_all(format!("<root>\n\t<id>{id}</id>\n\t<version>1.0.0</version>\n</root>\n").as_bytes()).unwrap();
    }

    for entry in entries {
        writer.start_file(*entry, options).unwrap();
        writer.write_all(b"x").unwrap();
    }

    writer.finish().unwrap();
}

fn install(client: &GameClient, files: &[&str]) {
    for file in files {
        fs::write(client.mods_dir.join(file), file.as_bytes()).unwrap();
    }
}

#[test]
fn flags_third_party_copies_of_enabled_components_only() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    install(&client, &[CORE, COMPANION, DAMAGE_LOG]);
    package(&client.mods_dir.join("xfw").join("com.modxvm.xfw.native_12.0.0.wotmod"), Some("com.modxvm.xfw.native"), &["res/scripts/x.pyc"]);
    package(&client.mods_dir.join("MarksOnGunExtended_2.1.mtmod"), None, &[]);
    package(&client.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod"), Some("izeberg.modssettingsapi"), &[]);

    let report = scan(context).unwrap();

    assert_eq!(report.foreign.len(), 1);
    assert_eq!(report.foreign[0].rule, "xvm");
    assert_eq!(report.foreign[0].file, "xfw/com.modxvm.xfw.native_12.0.0.wotmod");
    assert_eq!(report.foreign[0].package_id, "com.modxvm.xfw.native");
    assert_eq!(report.foreign[0].components, vec!["damage_log"]);
    assert!(report.duplicates.is_empty() && report.overrides.is_empty() && report.missing.is_empty());
}

#[test]
fn finds_duplicate_packages_ours_and_theirs() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    install(&client, &[CORE, COMPANION, "net.triotmetki.core_0.0.9.mtmod"]);
    package(&client.mods_dir.join("net.openwg.gameface_1.2.2.mtmod"), Some("net.openwg.gameface"), &[]);
    package(&client.mods_dir.join("deps").join("gameface.mtmod"), Some("net.openwg.gameface"), &[]);

    let report = scan(context).unwrap();
    let ids: Vec<(&str, bool)> = report.duplicates.iter().map(|item| (item.package_id.as_str(), item.ours)).collect();

    assert_eq!(ids, vec![("net.openwg.gameface", false), ("net.triotmetki.core", true)]);
    assert_eq!(report.duplicates[0].files, vec!["deps/gameface.mtmod", "net.openwg.gameface_1.2.2.mtmod"]);
    assert!(report.foreign.is_empty());
}

#[test]
fn reports_packages_and_res_mods_that_overwrite_our_files() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };
    let res_mods = client.res_mods_dir.join("scripts").join("client").join("gui").join("mods");

    install(&client, &[CORE, COMPANION]);
    package(
        &client.mods_dir.join("someone.patch_1.0.mtmod"),
        Some("someone.patch"),
        &["res/scripts/client/gui/mods/otmetki/core/__init__.pyc", "res/scripts/client/gui/mods/mod_someone.pyc"],
    );
    fs::create_dir_all(&res_mods).unwrap();
    fs::write(res_mods.join("mod_otmetki_hit_log.pyc"), "x").unwrap();
    fs::write(res_mods.join("mod_other.pyc"), "x").unwrap();

    let report = scan(context).unwrap();

    assert_eq!(report.overrides.len(), 2);
    assert_eq!(report.overrides[0].file, "someone.patch_1.0.mtmod");
    assert_eq!(report.overrides[0].paths, vec!["res/scripts/client/gui/mods/otmetki/core/__init__.pyc"]);
    assert_eq!(report.overrides[1].location, ForeignLocation::ResMods);
    assert_eq!(report.overrides[1].file, "res_mods/1.45.0.0");
    assert_eq!(report.overrides[1].paths, vec!["scripts/client/gui/mods/mod_otmetki_hit_log.pyc"]);
    assert_eq!(report.overrides[1].count, 1);
}

#[test]
fn lists_what_a_cleaner_removed_or_replaced_for_a_download() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("Состояние");
    let mut catalog = catalog();

    catalog.components.iter_mut().find(|component| component.id == "marks_panel").unwrap().sha256 = Some(sha256_hex(MARKS_PANEL.as_bytes()));

    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    install(&client, &[CORE, COMPANION, MARKS_PANEL]);
    sync_manifest(context).unwrap();
    fs::remove_file(client.mods_dir.join(COMPANION)).unwrap();
    fs::write(client.mods_dir.join(MARKS_PANEL), "someone else's build").unwrap();

    let report = scan(context).unwrap();

    assert_eq!(report.missing, vec![MissingComponent { id: "companion".into() }]);
    assert_eq!(report.replaced, vec![ReplacedComponent { id: "marks_panel".into(), file: MARKS_PANEL.into() }]);
    assert_eq!(report.to_restore(), vec!["companion", "marks_panel"]);
}

#[test]
fn a_clean_install_has_nothing_to_restore() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("state");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    install(&client, &[CORE, COMPANION, MARKS_PANEL]);
    sync_manifest(context).unwrap();

    assert!(scan(context).unwrap().to_restore().is_empty());
}

#[test]
fn reads_the_package_id_from_meta_xml_or_the_file_name() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("Моды").join("renamed.mtmod");

    package(&path, Some(" Some.Author.Mod "), &["res/gui/x.swf"]);

    let read = read_package(&path);

    assert_eq!(read.package_id, "some.author.mod");
    assert_eq!(read.entries, vec!["meta.xml", "res/gui/x.swf"]);
    assert_eq!(id_from_name("me.poliroid.pmod_2.3.1.wotmod"), "me.poliroid.pmod");
    assert_eq!(id_from_name("SixthSense.mtmod"), "sixthsense");
    assert_eq!(read_package(&root.path().join("broken.mtmod")).package_id, "broken");
}

#[test]
fn a_component_that_left_the_catalog_is_not_restored() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let client_dir = root.path().join("Состояние");
    let catalog = catalog();
    let context = ClientContext { client_dir: &client_dir, client: &client, catalog: &catalog };

    install(&client, &[CORE, COMPANION, MARKS_PANEL]);
    sync_manifest(context).unwrap();

    let mut manifest = crate::state::Manifest::read(&client_dir).unwrap().unwrap();

    manifest.components.push("hud\retired_widget".into());
    manifest.write(&client_dir).unwrap();
    fs::remove_file(client.mods_dir.join(COMPANION)).unwrap();

    assert_eq!(scan(context).unwrap().to_restore(), vec!["companion"]);
}
