use std::fs;
use std::path::Path;

use serde_json::{json, Value};

use super::*;
use crate::sets::ComponentSet;

fn store(root: &Path) -> ProfileStore {
    let configs = root.join("Мир танков").join("mods").join("configs").join("otmetki");

    fs::create_dir_all(&configs).unwrap();
    fs::write(
        configs.join(CONFIG_JSON),
        json!({ "enabled": true, "server_url": "https://api.triotmetki.ru", "bind_code": "X", "battle_damage_log": false }).to_string(),
    )
    .unwrap();
    fs::write(configs.join(COMPONENTS_JSON), json!({ "damage_log": { "x": 10, "y": 20 } }).to_string()).unwrap();

    ProfileStore::new(configs, root.join("Roaming").join("TriOtmetki"))
}

fn read(path: &Path) -> Value {
    serde_json::from_str(&fs::read_to_string(path).unwrap()).unwrap()
}

#[test]
fn saves_the_current_settings_without_secrets_in_the_game_format() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let profile = store.save_current("  Мой   профиль ", None).unwrap();
    let written = read(&store.configs_dir.join(FILE_NAME));

    assert_eq!(profile.name, "Мой профиль");
    assert_eq!(written["version"], 1);
    assert_eq!(written["active"], profile.id.as_str());
    assert_eq!(written["profiles"][0]["data"]["config"], json!({ "enabled": true, "battle_damage_log": false }));
    assert_eq!(written["profiles"][0]["data"]["components"]["damage_log"]["x"], 10);
    assert!(written["profiles"][0]["created"].is_f64());
}

#[test]
fn mirrors_profiles_into_the_shared_durable_folder() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());

    store.save_current("A", None).unwrap();

    assert_eq!(read(&store.durable_dir.join(FILE_NAME))["profiles"][0]["name"], "A");
    assert!(read(&store.durable_dir.join(crate::durable::STAMPS_NAME))["files"][FILE_NAME].is_f64());
}

#[test]
fn keeps_a_durable_copy_and_restores_from_it() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());

    store.save_current("A", None).unwrap();
    fs::remove_file(store.configs_dir.join(FILE_NAME)).unwrap();

    let restored = store.load().unwrap();

    assert_eq!(restored.profiles.len(), 1);
    assert!(store.configs_dir.join(FILE_NAME).exists());
}

#[test]
fn applies_a_profile_by_merging_config_and_component_sections() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let profile = store.save_current("A", None).unwrap();

    fs::write(store.configs_dir.join(CONFIG_JSON), json!({ "enabled": false, "server_url": "http://localhost:4000" }).to_string()).unwrap();
    fs::write(store.configs_dir.join(COMPONENTS_JSON), json!({ "damage_log": { "x": 99, "font": 14 } }).to_string()).unwrap();
    store.activate(&profile.id).unwrap();

    let config = read(&store.configs_dir.join(CONFIG_JSON));
    let components = read(&store.configs_dir.join(COMPONENTS_JSON));

    assert_eq!(config["enabled"], true);
    assert_eq!(config["server_url"], "http://localhost:4000");
    assert_eq!(components["damage_log"], json!({ "x": 10, "y": 20, "font": 14 }));
}

#[test]
fn caps_the_number_of_profiles() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());

    for index in 0..MAX_PROFILES {
        store.save_current(&format!("P{index}"), None).unwrap();
    }

    assert_eq!(store.save_current("one more", None).unwrap_err().code(), ErrorCode::ProfileLimit);
}

#[test]
fn refuses_a_blank_name() {
    assert_eq!(normalize_name(" \t ").unwrap_err().code(), ErrorCode::ProfileName);
    assert_eq!(normalize_name(&"я".repeat(60)).unwrap().chars().count(), NAME_MAX_LENGTH);
}

#[test]
fn renames_and_deletes_the_active_profile() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let profile = store.save_current("A", None).unwrap();

    store.rename(&profile.id, "B").unwrap();
    assert_eq!(store.load().unwrap().profiles[0].name, "B");

    store.delete(&profile.id).unwrap();

    let file = store.load().unwrap();

    assert!(file.profiles.is_empty());
    assert_eq!(file.active, None);
    assert_eq!(store.delete(&profile.id).unwrap_err().code(), ErrorCode::ProfileMissing);
}

#[test]
fn round_trips_a_profile_code() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let profile = store.save_current("Стрим", None).unwrap();
    let code = store.export(&profile.id).unwrap();
    let imported = store.import(&code, None).unwrap();

    assert!(code.starts_with(CODE_PREFIX));
    assert_eq!(imported.name, "Стрим");
    assert_eq!(imported.data, profile.data);
    assert_ne!(imported.id, profile.id);
}

#[test]
fn decodes_a_padded_code_and_rejects_garbage() {
    let data = ProfileData::default();
    let code = encode("x", &data, None).unwrap();
    let padding = "=".repeat((4 - (code.len() - CODE_PREFIX.len()) % 4) % 4);

    assert_eq!(decode(&format!("{code}{padding}")).unwrap(), Decoded { name: "x".to_owned(), data, installed: None });
    assert_eq!(decode("TM1.!!!").unwrap_err().code(), ErrorCode::ProfileCode);
    assert_eq!(decode("TM2.abc").unwrap_err().code(), ErrorCode::ProfileCode);
}

#[test]
fn skips_malformed_profiles_and_keeps_unknown_fields() {
    let file = ProfilesFile::from_value(&json!({
        "version": 1,
        "active": "gone",
        "profiles": [
            { "id": "a", "name": "A", "data": {}, "note": "kept" },
            { "id": 5, "name": "broken", "data": {} },
            { "id": "b", "name": "B" }
        ]
    }));

    assert_eq!(file.profiles.len(), 1);
    assert_eq!(file.active, None);
    assert_eq!(file.profiles[0].extra["note"], "kept");
}

#[test]
fn an_imported_profile_is_not_active_until_it_is_applied() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let code =
        encode("Чужой", &ProfileData { config: json!({ "battle_damage_log": true }).as_object().unwrap().clone(), components: Map::new() }, None)
            .unwrap();
    let imported = store.import(&code, None).unwrap();
    let file = store.load().unwrap();

    assert_eq!(file.active, None);

    store.activate(&imported.id).unwrap();

    assert_eq!(store.load().unwrap().active.as_deref(), Some(imported.id.as_str()));
    assert_eq!(store.file(CONFIG_JSON).read().unwrap()["battle_damage_log"], true);
}

#[test]
fn a_profile_code_never_switches_privacy_or_network_flags() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let config = json!({
        "publish_replays": true,
        "upload_replays": true,
        "send_shots": false,
        "settings_target": "profile",
        "settings_include_resolution": true,
        "server_url": "https://evil.example",
        "enabled": "yes",
        "battle_damage_log": true
    });
    let code = encode("Стример", &ProfileData { config: config.as_object().unwrap().clone(), components: Map::new() }, None).unwrap();
    let imported = store.import(&code, None).unwrap();

    store.activate(&imported.id).unwrap();

    let applied = store.file(CONFIG_JSON).read().unwrap();

    for key in ["publish_replays", "upload_replays", "send_shots", "settings_target", "settings_include_resolution"] {
        assert!(applied.get(key).is_none(), "{key}");
    }

    assert_eq!(applied["server_url"], "https://api.triotmetki.ru");
    assert_eq!(applied["enabled"], true);
    assert_eq!(applied["battle_damage_log"], true);
}

#[test]
fn keeps_unreadable_profiles_when_saving() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());

    store.file(FILE_NAME).write(&json!({ "version": 1, "profiles": [{ "id": "x", "name": "X", "data": { "config": null } }] })).unwrap();
    store.save_current("Новый", None).unwrap();

    let raw = store.file(FILE_NAME).read().unwrap();

    assert_eq!(raw["profiles"].as_array().unwrap().len(), 2);
}

fn ids(items: &[&str]) -> Vec<String> {
    items.iter().map(|item| (*item).to_owned()).collect()
}

fn legacy_set(id: &str, name: &str) -> ComponentSet {
    ComponentSet { id: id.into(), name: name.into(), components: ids(&["core", "marks_panel"]), created: 1.0, updated: 2.0 }
}

#[test]
fn keeps_the_installed_components_next_to_the_settings() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let profile = store.save_current("Стрим", Some(ids(&["core", "marks_panel", "marks_panel", "Bad-Id"]))).unwrap();
    let written = read(&store.configs_dir.join(FILE_NAME));

    assert_eq!(profile.installed, Some(ids(&["core", "marks_panel"])));
    assert_eq!(written["profiles"][0]["installed"], json!(["core", "marks_panel"]));
    assert!(written["profiles"][0]["data"].get("installed").is_none());
    assert_eq!(store.load().unwrap().view().profiles[0].installed, Some(ids(&["core", "marks_panel"])));
}

#[test]
fn a_profile_saved_again_by_the_game_window_keeps_its_component_list() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let profile = store.save_current("Стрим", Some(ids(&["core"]))).unwrap();
    let mut raw = store.file(FILE_NAME).read().unwrap();

    raw["profiles"][0]["data"] = json!({ "config": { "battle_damage_log": true }, "components": {} });
    store.file(FILE_NAME).write(&raw).unwrap();

    assert_eq!(store.load().unwrap().get(&profile.id).unwrap().installed, Some(ids(&["core"])));
}

#[test]
fn a_profile_code_carries_the_component_list() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let profile = store.save_current("Стрим", Some(ids(&["core", "damage_log"]))).unwrap();
    let imported = store.import(&store.export(&profile.id).unwrap(), Some("Копия")).unwrap();

    assert_eq!(imported.name, "Копия");
    assert_eq!(imported.installed, Some(ids(&["core", "damage_log"])));
    assert_eq!(decode(&encode("x", &ProfileData::default(), None).unwrap()).unwrap().installed, None);
}

#[test]
fn imports_an_old_set_code_as_a_profile_with_the_current_settings() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let code = crate::sets::codec_for_tests::encode("ПТ", &ids(&["core", "reload_timer"])).unwrap();
    let imported = store.import(&code, None).unwrap();

    assert_eq!(imported.name, "ПТ");
    assert_eq!(imported.installed, Some(ids(&["core", "reload_timer"])));
    assert_eq!(imported.data, store.take_snapshot());
}

#[test]
fn imports_a_set_file_and_a_whole_sets_library() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());
    let single = crate::sets::codec_for_tests::to_file_text("Минимум", &ids(&["core", "sixth_sense"])).unwrap();
    let library = json!({ "version": 1, "sets": [legacy_set("a", "Турнир"), legacy_set("b", "Ноутбук")] }).to_string();

    assert_eq!(store.import_text(&single).unwrap(), 1);
    assert_eq!(store.import_text(&library).unwrap(), 2);

    let names: Vec<String> = store.load().unwrap().profiles.into_iter().map(|profile| profile.name).collect();

    assert_eq!(names, vec!["Минимум", "Турнир", "Ноутбук"]);
    assert_eq!(store.import_text("junk").unwrap_err().code(), ErrorCode::SetCode);
}

#[test]
fn moves_saved_sets_into_profiles_while_there_is_room() {
    let root = tempfile::tempdir().unwrap();
    let store = store(root.path());

    for index in 0..MAX_PROFILES - 1 {
        store.save_current(&format!("P{index}"), None).unwrap();
    }

    let sets = vec![legacy_set("set-a", "Турнир"), legacy_set("set-b", "Ноутбук")];
    let mut migrated = Vec::new();
    let pending = store.migrate_sets(&sets, &mut migrated).unwrap();
    let file = store.load().unwrap();
    let moved = file.get("set-a").unwrap();

    assert_eq!(pending, 1);
    assert_eq!(migrated, ids(&["set-a"]));
    assert_eq!((moved.name.as_str(), moved.installed.clone()), ("Турнир", Some(ids(&["core", "marks_panel"]))));
    assert_eq!(file.active.as_deref(), Some(file.profiles[MAX_PROFILES - 2].id.as_str()));

    store.delete("set-a").unwrap();

    assert_eq!(store.migrate_sets(&sets, &mut migrated).unwrap(), 0);
    assert!(store.load().unwrap().get("set-a").is_err());
    assert!(store.load().unwrap().get("set-b").is_ok());
}
