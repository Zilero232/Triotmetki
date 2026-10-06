use std::path::{Path, PathBuf};

use super::*;

#[test]
fn keys_a_client_like_the_installer() {
    let key = client_key(Path::new(r"D:\Games\Tanki"));

    assert_eq!(key.len(), KEY_LENGTH);
    assert!(key.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
    assert_eq!(key, client_key(Path::new(r"d:\games\tanki\")));
}

#[test]
fn keeps_non_ascii_case_like_inno_lowercase() {
    assert_ne!(client_key(Path::new(r"D:\Игры\Танки")), client_key(Path::new(r"D:\игры\танки")));
}

#[test]
fn keeps_a_drive_root_intact() {
    assert_ne!(client_key(Path::new(r"D:\")), client_key(Path::new("D:")));
}

#[test]
fn round_trips_the_manifest_with_cyrillic_paths() {
    let dir = tempfile::tempdir().unwrap();
    let manifest = Manifest {
        client: PathBuf::from(r"D:\Игры\Мир танков"),
        version: "1.45.0.0".into(),
        mods_dir: PathBuf::from(r"D:\Игры\Мир танков\mods\1.45.0.0"),
        installer: "0.1.0".into(),
        modpack: "0.1.0".into(),
        date: "2026-09-27 21:47:05".into(),
        components: vec![r"base\core".into(), r"battle\marks_panel".into()],
        files: vec![PathBuf::from(r"D:\Игры\Мир танков\mods\1.45.0.0\net.triotmetki.core_0.1.0.mtmod")],
        disabled: vec!["marks_panel".into()],
        manager: Some("0.1.0".into()),
        dependencies: vec![
            DependencyRecord {
                id: "modslist".into(),
                owner: DependencyOwner::User,
                file: "me.poliroid.modslistapi_1.6.00.mtmod".into(),
                sha256: String::new(),
            },
            DependencyRecord {
                id: "openwg_gameface".into(),
                owner: DependencyOwner::Ours,
                file: "net.openwg.gameface_1.2.2.mtmod".into(),
                sha256: "ab".repeat(32),
            },
        ],
    };

    manifest.write(dir.path()).unwrap();

    assert_eq!(Manifest::read(dir.path()).unwrap(), Some(manifest));
}

#[test]
fn reads_an_installer_manifest_without_the_manager_section() {
    let dir = tempfile::tempdir().unwrap();

    crate::ini_file::write(
        &Manifest::path(dir.path()),
        &crate::ini_file::parse("[install]\r\nclient=D:\\Tanki\r\nversion=1.45.0.0\r\ncomponents=base\\core,base/companion\r\n[files]\r\ncount=1\r\n0=D:\\Tanki\\mods\\1.45.0.0\\net.triotmetki.core_0.1.0.mtmod\r\n").unwrap(),
    )
    .unwrap();

    let manifest = Manifest::read(dir.path()).unwrap().unwrap();

    assert_eq!(manifest.component_ids(), vec!["core", "companion"]);
    assert_eq!(manifest.files.len(), 1);
    assert!(manifest.disabled.is_empty());
    assert_eq!(manifest.manager, None);
    assert!(manifest.dependencies.is_empty());
}

#[test]
fn ignores_dependency_records_it_cannot_read() {
    assert_eq!(DependencyRecord::parse("x", "theirs|a.mtmod|"), None);
    assert_eq!(DependencyRecord::parse("x", "ours||ab"), None);
    assert_eq!(DependencyRecord::parse("x", "user|a.mtmod").map(|record| record.owner), Some(DependencyOwner::User));
}

#[test]
fn a_missing_manifest_means_not_installed() {
    let dir = tempfile::tempdir().unwrap();

    assert_eq!(Manifest::read(dir.path()).unwrap(), None);
}
