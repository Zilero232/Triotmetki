use std::fs;

use super::*;
use crate::catalog::fixtures::catalog_json;

#[test]
fn accepts_only_media_files_directly_in_the_previews_folder() {
    assert!(is_preview_file("previews/core.png"));
    assert!(is_preview_file("previews/session_stats.ogg"));
    assert!(!is_preview_file("previews/../core.png"));
    assert!(!is_preview_file("previews/nested/core.png"));
    assert!(!is_preview_file("other/core.png"));
    assert!(!is_preview_file("previews/core.exe"));
    assert!(!is_preview_file("core.png"));
    assert!(!is_preview_file("previews/con.png"));
}

fn sha(bytes: &[u8]) -> String {
    crate::releases::sha256_hex(bytes)
}

fn preview(file: &str, bytes: &[u8]) -> PreviewFile {
    PreviewFile { file: file.to_owned(), sha256: sha(bytes) }
}

#[test]
fn lists_each_hashed_image_and_sound_of_the_catalogue_once() {
    let mut json = catalog_json();

    json["components"][0]["preview"]["audio"] = "previews/core.ogg".into();
    json["components"][1]["preview"]["image"] = "../escape.png".into();
    json["previewSha256"] =
        serde_json::json!({ "previews/core.png": sha(b"png").to_uppercase(), "previews/core.ogg": sha(b"ogg"), "../escape.png": sha(b"x") });

    let catalog: Catalog = serde_json::from_value(json).unwrap();
    let listed = files(&catalog);

    assert!(listed.contains(&preview("previews/core.png", b"png")));
    assert!(listed.contains(&preview("previews/core.ogg", b"ogg")));
    assert!(listed.iter().all(|listed| is_preview_file(&listed.file)));
    assert_eq!(listed.len(), 2);
}

#[test]
fn skips_a_preview_without_a_valid_sha256() {
    let mut json = catalog_json();

    json["previewSha256"] = serde_json::json!({ "previews/core.png": "not-a-hash" });

    let catalog: Catalog = serde_json::from_value(json).unwrap();

    assert!(files(&catalog).is_empty());
}

#[test]
fn resolves_a_preview_next_to_the_catalogue() {
    assert_eq!(
        url("https://triotmetki.ru/downloads/modpack/0.1.0/catalog/components.json", "previews/core.png").as_deref(),
        Some("https://triotmetki.ru/downloads/modpack/0.1.0/catalog/previews/core.png")
    );
    assert_eq!(url("https://triotmetki.ru/c/components.json?v=2", "previews/a.png").as_deref(), Some("https://triotmetki.ru/c/previews/a.png"));
}

#[test]
fn downloads_the_missing_and_the_altered_previews_unless_the_catalogue_changed() {
    let root = tempfile::tempdir().unwrap();
    let manager = root.path().join("Игрок").join("manager");
    let files = vec![preview("previews/core.png", b"png"), preview("previews/hud.png", b"hud"), preview("previews/map.png", b"map")];

    fs::create_dir_all(manager.join(DIR)).unwrap();
    fs::write(manager.join(DIR).join("core.png"), b"png").unwrap();
    fs::write(manager.join(DIR).join("map.png"), b"tampered").unwrap();

    assert_eq!(pending(PendingInput { root: &manager, files: files.clone(), refresh: false }), files[1..].to_vec());
    assert_eq!(pending(PendingInput { root: &manager, files: files.clone(), refresh: true }), files);
}
