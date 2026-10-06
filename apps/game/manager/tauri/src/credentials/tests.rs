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
        CredentialStore::new(&self.game, &self.roaming).with_format(SecretFormat::Sealed)
    }

    fn legacy_store(&self) -> CredentialStore {
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

fn write_legacy(folders: &Folders, legacy: &Credentials) {
    let entry = json!({ "device_id": legacy.device_id, "secret": legacy.secret, "account_id": legacy.account_id, "bound_at": 100.0 });

    write(&folders.game.join(FILE_NAME), &json!({ "accounts": { legacy.account_id.to_string(): entry } }));
    write(&folders.roaming.join(FILE_NAME), &json!({ "accounts": { legacy.account_id.to_string(): entry } }));
}

#[test]
fn reads_a_legacy_plaintext_secret() {
    let folders = Folders::new();
    let legacy = credentials(3);

    write_legacy(&folders, &legacy);

    assert_eq!(folders.store().find(None).unwrap().secret, legacy.secret);
}

#[test]
fn never_rewrites_the_files_when_it_only_reads_them() {
    let folders = Folders::new();
    let legacy = credentials(3);

    write_legacy(&folders, &legacy);
    folders.store().load();

    assert!(fs::read_to_string(folders.game.join(FILE_NAME)).unwrap().contains(&legacy.secret));
}

#[test]
fn migrates_a_legacy_plaintext_secret_out_of_the_game_folder() {
    let folders = Folders::new();
    let legacy = credentials(3);

    write_legacy(&folders, &legacy);
    folders.store().migrate().unwrap();

    assert_eq!(read(&folders.game.join(FILE_NAME))["accounts"]["3"], json!({ "device_id": "dev_3", "account_id": 3, "bound_at": 100.0 }));
}

#[test]
fn migrates_a_legacy_plaintext_secret_into_the_sealed_appdata_copy() {
    let folders = Folders::new();
    let legacy = credentials(3);

    write_legacy(&folders, &legacy);
    folders.store().migrate().unwrap();

    assert!(!fs::read_to_string(folders.roaming.join(FILE_NAME)).unwrap().contains(&legacy.secret));
    assert_eq!(folders.store().find(None).unwrap().secret, legacy.secret);
}

#[test]
fn does_not_migrate_while_the_installed_core_reads_only_plaintext() {
    let folders = Folders::new();
    let legacy = credentials(3);

    write_legacy(&folders, &legacy);

    assert!(!folders.legacy_store().migrate().unwrap());
}

#[test]
fn does_not_migrate_files_already_in_the_protected_format() {
    let folders = Folders::new();

    folders.store().save(&credentials(7)).unwrap();

    assert!(!folders.store().migrate().unwrap());
}

#[test]
fn saves_a_plaintext_secret_both_copies_while_the_installed_core_reads_only_plaintext() {
    let folders = Folders::new();
    let saved = credentials(9);

    folders.legacy_store().save(&saved).unwrap();

    assert_eq!(read(&folders.game.join(FILE_NAME))["accounts"]["9"]["secret"], json!(saved.secret));
    assert_eq!(read(&folders.roaming.join(FILE_NAME))["accounts"]["9"]["secret"], json!(saved.secret));
}

#[test]
fn keeps_a_sealed_secret_that_does_not_open_when_it_saves_another_account() {
    let folders = Folders::new();
    let unopened = json!({ "device_id": "dev_1", "account_id": 1, "bound_at": 50.0, "secret_dpapi": "bm90IGEgYmxvYg==" });

    write(&folders.roaming.join(FILE_NAME), &json!({ "accounts": { "1": unopened } }));
    write(&folders.game.join(FILE_NAME), &json!({ "accounts": { "1": { "device_id": "dev_1", "account_id": 1 } } }));
    folders.store().save(&credentials(2)).unwrap();

    assert_eq!(read(&folders.roaming.join(FILE_NAME))["accounts"]["1"], unopened);
}

#[test]
fn keeps_the_game_folder_half_of_a_sealed_secret_that_does_not_open() {
    let folders = Folders::new();
    let shown = json!({ "device_id": "dev_1", "account_id": 1 });

    write(
        &folders.roaming.join(FILE_NAME),
        &json!({ "accounts": { "1": { "device_id": "dev_1", "account_id": 1, "secret_dpapi": "bm90IGEgYmxvYg==" } } }),
    );
    write(&folders.game.join(FILE_NAME), &json!({ "accounts": { "1": shown } }));
    folders.store().save(&credentials(2)).unwrap();

    assert_eq!(read(&folders.game.join(FILE_NAME))["accounts"]["1"], shown);
}

#[test]
fn does_not_count_a_sealed_secret_that_does_not_open_as_stale() {
    let folders = Folders::new();

    write(
        &folders.roaming.join(FILE_NAME),
        &json!({ "accounts": { "1": { "device_id": "dev_1", "account_id": 1, "secret_dpapi": "bm90IGEgYmxvYg==" } } }),
    );
    write(&folders.game.join(FILE_NAME), &json!({ "accounts": { "1": { "device_id": "dev_1", "account_id": 1 } } }));

    assert!(!folders.store().migrate().unwrap());
}

#[test]
fn keeps_bound_at_in_the_game_folder_copy() {
    let folders = Folders::new();
    let saved = Credentials { bound_at: Some(1_700_000_000.0), ..credentials(6) };

    folders.store().save(&saved).unwrap();

    assert_eq!(read(&folders.game.join(FILE_NAME))["accounts"]["6"]["bound_at"], json!(1_700_000_000.0));
}

#[test]
fn finds_the_most_recently_bound_account_first() {
    let folders = Folders::new();
    let store = folders.store();

    store.save(&Credentials { bound_at: Some(10.0), ..credentials(1) }).unwrap();
    store.save(&Credentials { bound_at: Some(20.0), ..credentials(2) }).unwrap();

    assert_eq!(store.find(None).unwrap().account_id, 2);
}

#[test]
fn reads_a_legacy_secret_left_only_in_the_game_folder() {
    let folders = Folders::new();
    let legacy = credentials(4);

    write(&folders.game.join(FILE_NAME), &json!({ "accounts": { "4": { "device_id": "dev_4", "secret": legacy.secret, "account_id": 4 } } }));

    assert_eq!(folders.store().find(Some(4)).unwrap().secret, legacy.secret);
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
fn finds_nothing_before_any_binding() {
    assert!(Folders::new().store().find(None).is_none());
}

#[test]
fn keeps_every_account_and_finds_the_requested_one() {
    let folders = Folders::new();
    let store = folders.store();

    store.save(&credentials(1)).unwrap();
    store.save(&credentials(2)).unwrap();

    assert_eq!(store.find(Some(2)).unwrap().account_id, 2);
}

#[test]
fn falls_back_to_the_first_account_for_an_unknown_one() {
    let folders = Folders::new();
    let store = folders.store();

    store.save(&credentials(1)).unwrap();
    store.save(&credentials(2)).unwrap();

    assert_eq!(store.find(Some(99)).unwrap().account_id, 1);
}

#[test]
fn shows_the_device_of_a_binding() {
    assert_eq!(credentials(5).binding().device_id, "dev_5");
}

#[test]
fn writes_one_protected_file_when_no_game_folder_is_known() {
    let folders = Folders::new();
    let store = CredentialStore::new(&folders.roaming, &folders.roaming).with_format(SecretFormat::Sealed);

    store.save(&credentials(8)).unwrap();

    assert!(read(&folders.roaming.join(FILE_NAME))["accounts"]["8"][SEALED_FIELD].is_string());
    assert_eq!(store.find(None).unwrap().account_id, 8);
}

#[test]
fn reads_sealed_from_a_core_package_that_knows_the_protected_format() {
    let files = [PathBuf::from(r"C:\Игры\Мир танков\mods\1.46.0.0\net.triotmetki.core_0.9.4.mtmod")];

    assert_eq!(SecretFormat::for_installed(&files), SecretFormat::Sealed);
}

#[test]
fn keeps_plaintext_for_an_older_core_package() {
    let files = [PathBuf::from(r"C:\Игры\Мир танков\mods\1.46.0.0\net.triotmetki.core_0.9.3.mtmod")];

    assert_eq!(SecretFormat::for_installed(&files), SecretFormat::Plaintext);
}

#[test]
fn keeps_plaintext_without_a_core_package() {
    let files = [PathBuf::from(r"C:\Игры\Мир танков\mods\1.46.0.0\net.triotmetki.damage_log_2.0.0.mtmod")];

    assert_eq!(SecretFormat::for_installed(&files), SecretFormat::Plaintext);
}
