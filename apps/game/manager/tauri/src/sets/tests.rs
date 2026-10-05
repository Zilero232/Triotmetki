use std::fs;

use super::codec::{encode, to_file_text};
use super::*;
use crate::error::ErrorCode;

fn ids(items: &[&str]) -> Vec<String> {
    items.iter().map(|item| (*item).to_owned()).collect()
}

fn store(root: &Path) -> SetStore {
    SetStore::new(root.join("Роуминг").join("manager").join(FILE_NAME))
}

fn set(id: &str, name: &str, updated: f64) -> ComponentSet {
    ComponentSet { id: id.into(), name: name.into(), components: ids(&["core"]), created: 1.0, updated }
}

#[test]
fn codes_round_trip_and_reject_foreign_text() {
    let code = encode("ПТ", &ids(&["core", "reload_timer"])).unwrap();

    assert!(code.starts_with(CODE_PREFIX));
    assert_eq!(decode(&code).unwrap(), ("ПТ".to_owned(), ids(&["core", "reload_timer"])));
    assert_eq!(decode("TM1.abc").unwrap_err().code(), ErrorCode::SetCode);
    assert_eq!(decode(&encode("x", &ids(&["Bad-Id"])).unwrap()).unwrap_err().code(), ErrorCode::SetCode);
}

#[test]
fn reads_a_set_file_or_a_code_saved_as_text() {
    let text = to_file_text("Минимум", &ids(&["core", "sixth_sense"])).unwrap();

    assert!(text.contains("\"format\": \"triotmetki-component-set\""));
    assert_eq!(from_file_text(&text).unwrap(), ("Минимум".to_owned(), ids(&["core", "sixth_sense"])));
    assert_eq!(from_file_text(&encode("Код", &ids(&["core"])).unwrap()).unwrap().0, "Код");
    assert_eq!(
        from_file_text("{\"format\":\"other\",\"version\":1,\"name\":\"x\",\"components\":[\"core\"]}").unwrap_err().code(),
        ErrorCode::SetCode
    );
}

#[test]
fn merging_keeps_the_newest_copy_and_honours_deletions() {
    let local = SetsFile {
        sets: vec![set("a", "Локальный", 5.0), set("b", "Удалённый позже", 2.0)],
        deleted: vec![Tombstone { id: "c".into(), deleted: 9.0 }],
        ..SetsFile::default()
    };
    let remote = SetsFile {
        sets: vec![set("a", "С сайта", 7.0), set("c", "Удалён", 8.0), set("d", "Новый", 3.0)],
        deleted: vec![Tombstone { id: "b".into(), deleted: 4.0 }],
        synced_at: Some(10.0),
        ..SetsFile::default()
    };
    let merged = merge(&local, &remote);

    assert_eq!(merged.sets.iter().map(|set| (set.id.as_str(), set.name.as_str())).collect::<Vec<_>>(), vec![("a", "С сайта"), ("d", "Новый")]);
    assert_eq!(merged.deleted.iter().map(|tombstone| tombstone.id.as_str()).collect::<Vec<_>>(), vec!["b", "c"]);
    assert_eq!(merged.synced_at, Some(10.0));
}

#[test]
fn a_library_is_checked_like_our_own_sets() {
    let long_id = "a".repeat(MAX_ID_LENGTH + 1);
    let mut sets = vec![
        serde_json::json!({ "id": "ok", "name": "  Турнир  ", "components": ["core", long_id, "Bad"], "created": 1.0, "updated": 1.0 }),
        serde_json::json!({ "id": "ok", "name": "Двойник", "components": ["core"], "created": 1.0, "updated": 1.0 }),
        serde_json::json!({ "id": "../x", "name": "Путь", "components": ["core"], "created": 1.0, "updated": 1.0 }),
        serde_json::json!({ "id": "blank", "name": "   ", "components": ["core"], "created": 1.0, "updated": 1.0 }),
        serde_json::json!({ "id": "empty", "name": "Пусто", "components": [], "created": 1.0, "updated": 1.0 }),
    ];

    sets.extend((0..20).map(
        |index| serde_json::json!({ "id": format!("s{index}"), "name": "x".repeat(500), "components": ["core"], "created": 2.0, "updated": 2.0 }),
    ));

    let text = serde_json::json!({ "version": 1, "sets": sets, "deleted": [{ "id": "", "deleted": 1.0 }] }).to_string();
    let library = library_from_text(&text).unwrap().sanitized();
    let first = library.sets.iter().find(|set| set.id == "ok").unwrap();

    assert_eq!(library.sets.len(), MAX_SETS);
    assert_eq!((first.name.as_str(), first.components.clone()), ("Турнир", ids(&["core"])));
    assert!(library.sets.iter().all(|set| is_set_id(&set.id) && set.name.chars().count() <= NAME_MAX_LENGTH));
    assert!(library.sets.iter().all(|set| set.id != "empty"));
    assert!(library.deleted.is_empty());
    assert!(library_from_text("{\"name\":\"x\"}").is_none());
}

#[test]
fn absorbs_the_sets_kept_on_the_site() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());

    store.absorb(&SetsFile { sets: vec![set("a", "С сайта", 7.0)], ..SetsFile::default() }).unwrap();
    store.absorb(&SetsFile { sets: vec![set("b", "Ещё", 8.0)], ..SetsFile::default() }).unwrap();

    let names: Vec<String> = store.load().sets.into_iter().map(|set| set.name).collect();

    assert_eq!(names, vec!["С сайта", "Ещё"]);
}

#[test]
fn a_damaged_sets_file_is_kept_aside_not_overwritten() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());

    fs::create_dir_all(store.path.parent().unwrap()).unwrap();
    fs::write(&store.path, "{ \"sets\": [").unwrap();

    assert!(store.load().sets.is_empty());

    store.absorb(&SetsFile { sets: vec![set("a", "Новый", 1.0)], ..SetsFile::default() }).unwrap();

    assert_eq!(fs::read_to_string(crate::fsx::sibling(&store.path, DAMAGED_SUFFIX)).unwrap(), "{ \"sets\": [");
    assert_eq!(store.load().sets.len(), 1);
}

#[test]
fn reads_at_most_a_small_file_and_adds_extensions() {
    let root = tempfile::tempdir().unwrap();
    let big = root.path().join("big.tmset");

    fs::write(&big, vec![b' '; usize::try_from(MAX_FILE_BYTES).unwrap() + 1]).unwrap();

    assert_eq!(read_limited(&big).unwrap_err().code(), ErrorCode::SetCode);
    assert_eq!(with_extension(&root.path().join("a.TMSET"), SET_EXTENSION), root.path().join("a.TMSET"));
    assert_eq!(with_extension(&root.path().join("game.exe"), SET_EXTENSION), root.path().join("game.exe.tmset"));
}

#[test]
fn remembers_which_sets_a_client_already_moved_into_profiles() {
    let root = tempfile::tempdir().unwrap();
    let client_dir = root.path().join("clients").join("abc");

    assert!(Migration::load(&client_dir).migrated.is_empty());

    Migration { migrated: ids(&["a", "b"]) }.save(&client_dir).unwrap();

    assert_eq!(Migration::load(&client_dir).migrated, ids(&["a", "b"]));
}
