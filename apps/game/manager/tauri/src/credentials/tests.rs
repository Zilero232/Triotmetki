use std::fs;
use std::path::{Path, PathBuf};

use serde_json::{json, Value};

use super::*;

fn credentials(account_id: u64) -> Credentials {
    Credentials { device_id: format!("dev_{account_id}"), secret: format!("{account_id}").repeat(MIN_SECRET_LENGTH), account_id, bound_at: None }
}

struct Folders {
    _root: tempfile::TempDir,
    game: PathBuf,
    roaming: PathBuf,
}

impl Folders {
    fn new() -> Self {
        let root = tempfile::tempdir().unwrap();
        let game = root.path().join("Игра").join("mods").join("configs").join("otmetki");
        let roaming = root.path().join("Роуминг").join("TriOtmetki");

        Self { _root: root, game, roaming }
    }

    fn store(&self) -> CredentialStore {
        CredentialStore::new(&self.game, &self.roaming)
    }
}

fn read(path: &Path) -> Value {
    serde_json::from_str(&fs::read_to_string(path).unwrap()).unwrap()
}

fn write(path: &Path, value: &Value) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, value.to_string()).unwrap();
}

#[test]
fn seals_and_opens_a_secret_for_this_windows_user() {
    let sealed = seal_secret("секрет-устройства").unwrap();

    assert_ne!(sealed, "секрет-устройства");
    assert_eq!(open_secret(&sealed).as_deref(), Some("секрет-устройства"));
    assert_eq!(open_secret("bm90IGEgYmxvYg=="), None);
}

#[test]
fn writes_only_the_ids_to_the_game_folder_and_the_sealed_secret_to_appdata() {
    let folders = Folders::new();
    let saved = credentials(7);

    folders.store().save(&saved).unwrap();

    let public = read(&folders.game.join(FILE_NAME));
    let private = read(&folders.roaming.join(FILE_NAME));

    assert_eq!(public, json!({ "accounts": { "7": { "device_id": "dev_7", "account_id": 7 } } }));
    assert_eq!(private["accounts"]["7"]["device_id"], "dev_7");
    assert_eq!(open_secret(private["accounts"]["7"][SEALED_FIELD].as_str().unwrap()), Some(saved.secret.clone()));
    assert!(!fs::read_to_string(folders.roaming.join(FILE_NAME)).unwrap().contains(&saved.secret));
    assert_eq!(folders.store().find(Some(7)), Some(saved));
}

#[test]
fn rewrites_a_legacy_plaintext_secret_once_it_is_read() {
    let folders = Folders::new();
    let legacy = credentials(3);
    let entry = json!({ "device_id": "dev_3", "secret": legacy.secret, "account_id": 3, "bound_at": 100.0 });

    write(&folders.game.join(FILE_NAME), &json!({ "accounts": { "3": entry } }));
    write(&folders.roaming.join(FILE_NAME), &json!({ "accounts": { "3": entry } }));

    let loaded = folders.store().load();

    assert_eq!(loaded.iter().map(|item| item.secret.clone()).collect::<Vec<_>>(), vec![legacy.secret.clone()]);
    assert!(!fs::read_to_string(folders.game.join(FILE_NAME)).unwrap().contains(&legacy.secret));
    assert!(!fs::read_to_string(folders.roaming.join(FILE_NAME)).unwrap().contains(&legacy.secret));
    assert_eq!(read(&folders.game.join(FILE_NAME))["accounts"]["3"], json!({ "device_id": "dev_3", "account_id": 3 }));
    assert_eq!(folders.store().find(None).unwrap().secret, legacy.secret);
}

#[test]
fn reads_a_legacy_secret_left_only_in_the_game_folder() {
    let folders = Folders::new();
    let legacy = credentials(4);

    write(&folders.game.join(FILE_NAME), &json!({ "accounts": { "4": { "device_id": "dev_4", "secret": legacy.secret, "account_id": 4 } } }));

    assert_eq!(folders.store().find(Some(4)).unwrap().secret, legacy.secret);
    assert!(read(&folders.roaming.join(FILE_NAME))["accounts"]["4"][SEALED_FIELD].is_string());
}

#[test]
fn skips_bindings_without_a_usable_secret() {
    let folders = Folders::new();

    write(
        &folders.roaming.join(FILE_NAME),
        &json!({ "accounts": {
            "1": { "device_id": "dev_1", "account_id": 1, "secret_dpapi": "bm90IGEgYmxvYg==" },
            "2": { "device_id": "dev_2", "secret": "short", "account_id": 2 },
            "3": "broken"
        } }),
    );

    assert!(folders.store().load().is_empty());
}

#[test]
fn keeps_every_account_and_finds_the_requested_one() {
    let folders = Folders::new();
    let store = folders.store();

    assert!(store.find(None).is_none());

    store.save(&credentials(1)).unwrap();
    store.save(&credentials(2)).unwrap();

    assert_eq!(store.find(Some(2)).unwrap().account_id, 2);
    assert_eq!(store.find(Some(99)).unwrap().account_id, 1);
    assert_eq!(credentials(5).binding().device_id, "dev_5");
}

#[test]
fn writes_one_protected_file_when_no_game_folder_is_known() {
    let folders = Folders::new();
    let store = CredentialStore::new(&folders.roaming, &folders.roaming);

    store.save(&credentials(8)).unwrap();

    assert!(read(&folders.roaming.join(FILE_NAME))["accounts"]["8"][SEALED_FIELD].is_string());
    assert_eq!(store.find(None).unwrap().account_id, 8);
}
