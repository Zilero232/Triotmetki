use std::collections::BTreeMap;

use super::fixtures::{release, TestSigner};
use super::sequence::{by_game_line, check_sequence, game_line, Freshness, SequenceInput, CORRUPT_SUFFIX};
use super::signature::{signed_payload, verify_release_with, PayloadFormat, RELEASE_PUBLIC_KEY};
use super::*;

#[test]
fn verifies_a_sha256_case_insensitively() {
    let digest = sha256_hex(b"mtmod");

    assert!(verify_sha256(b"mtmod", &digest.to_uppercase()).is_ok());
    assert_eq!(verify_sha256(b"tampered", &digest).unwrap_err().code(), ErrorCode::ChecksumMismatch);
}

#[test]
fn refuses_package_names_that_leave_the_folder() {
    assert!(safe_file_name("../evil.mtmod").is_err());
    assert!(safe_file_name(r"C:\evil.mtmod").is_err());
    assert!(safe_file_name("net.triotmetki.core_0.2.0.mtmod").is_ok());
}

#[test]
fn refuses_package_names_windows_cannot_hold() {
    for name in ["", ".", "..", "a|b.mtmod", "a?.mtmod", "core.mtmod.", "core.mtmod ", "NUL.mtmod", "com1", "lpt9.txt", "a\u{1}.mtmod"] {
        assert!(safe_file_name(name).is_err(), "{name:?}");
    }

    assert!(safe_file_name("console.mtmod").is_ok());
}

#[test]
fn reads_the_server_contract() {
    let parsed: LatestRelease = serde_json::from_str(
        r#"{"game":"1.46.0.0","status":"compatible","release":{"version":"0.2.0","publishedAt":"2026-09-27T12:00:00.000Z","games":["1.46.*"],"notes":{"ru":"Исправления","en":"Fixes"},"catalog":{"url":"https://triotmetki.ru/downloads/modpack/0.2.0/catalog/components.json","sha256":"ab"},"packages":[{"id":"core","file":"net.triotmetki.core_0.2.0.mtmod","url":"https://triotmetki.ru/downloads/modpack/0.2.0/net.triotmetki.core_0.2.0.mtmod","sha256":"ab","size":10}]}}"#,
    )
    .unwrap();

    assert_eq!(parsed.status, ReleaseStatus::Compatible);
    assert_eq!(parsed.release.unwrap().package("core").unwrap().size, 10);
}

#[test]
fn finds_a_release_package_by_component() {
    assert!(release("0.2.0").package("companion").is_some());
    assert!(release("0.2.0").package("minimap").is_none());
}

#[test]
fn accepts_only_a_release_signed_by_the_trusted_key() {
    let signer = TestSigner::new(1);
    let signed = signer.signed(release("0.2.0"));

    assert!(verify_release_with(&signed, &signer.public_key()).is_ok());
    assert_eq!(verify_release_with(&release("0.2.0"), &signer.public_key()).unwrap_err().code(), ErrorCode::SignatureInvalid);
    assert_eq!(verify_release_with(&signed, &TestSigner::new(2).public_key()).unwrap_err().code(), ErrorCode::SignatureInvalid);
}

#[test]
fn a_changed_package_breaks_the_signature() {
    let signer = TestSigner::new(3);
    let mut signed = signer.signed(release("0.2.0"));

    signed.packages[0].sha256 = "f".repeat(64);

    assert!(verify_release_with(&signed, &signer.public_key()).is_err());
}

#[test]
fn the_payload_ignores_package_order_and_urls() {
    let mut reordered = release("0.2.0");

    reordered.packages.reverse();
    reordered.packages[0].url = "https://mirror.triotmetki.ru/x.mtmod".into();

    assert_eq!(signed_payload(&reordered, PayloadFormat::Current), signed_payload(&release("0.2.0"), PayloadFormat::Current));
    assert!(signed_payload(&release("0.2.0"), PayloadFormat::Current).starts_with(
        "otmetki-modpack-release/2
version 0.2.0
games 1.46.*
catalog -
notes -
package companion "
    ));
    assert!(signed_payload(&release("0.2.0"), PayloadFormat::Legacy).starts_with(
        "otmetki-modpack-release/1
version 0.2.0
games 1.46.*
catalog -
package companion "
    ));
}

fn with_notes(version: &str) -> Release {
    let mut release = release(version);

    release.notes = Some(crate::catalog::Localized { ru: "Исправления".into(), en: "Fixes".into() });
    release
}

#[test]
fn the_payload_hashes_each_language_of_the_notes() {
    let payload = signed_payload(&with_notes("0.2.0"), PayloadFormat::Current);

    assert!(payload.contains(
        "notes bb81ae64d8eb1df65dc2457b00e11100de8223f9de01d6237eea5059edc8bacd 59e5965495d92feeab9a57f4fad73dd3169ca0e0752d6d1983c6b2fc006fc13e\n"
    ));
}

#[test]
fn changed_notes_break_the_signature() {
    let signer = TestSigner::new(4);
    let mut signed = signer.signed(with_notes("0.2.0"));

    signed.notes = Some(crate::catalog::Localized { ru: "Обновите вручную: evil.example".into(), en: "Fixes".into() });

    assert_eq!(verify_release_with(&signed, &signer.public_key()).unwrap_err().code(), ErrorCode::SignatureInvalid);
}

#[test]
fn accepts_a_release_signed_in_the_legacy_payload() {
    let signer = TestSigner::new(5);
    let legacy = signer.signed_as(with_notes("0.2.0"), PayloadFormat::Legacy, 1_791_295_184);

    assert_eq!(verify_release_with(&legacy, &signer.public_key()).unwrap(), 1_791_295_184);
}

#[test]
fn returns_the_signed_timestamp_as_the_sequence() {
    let signer = TestSigner::new(6);
    let signed = signer.signed_as(release("0.3.0"), PayloadFormat::Current, 1_800_000_000);

    assert_eq!(verify_release_with(&signed, &signer.public_key()).unwrap(), 1_800_000_000);
}

const SEEN_GAME: &str = "1.46.0.0";

fn seen_at(sequence: u64) -> BTreeMap<String, u64> {
    BTreeMap::from([(game_line(SEEN_GAME), sequence)])
}

#[test]
fn calls_a_release_signed_after_the_highest_seen_newer() {
    let seen = seen_at(200);

    assert_eq!(check_sequence(SequenceInput { seen: &seen, game: SEEN_GAME, sequence: 201 }), Freshness::Newer);
}

#[test]
fn calls_a_release_signed_at_the_highest_seen_the_same() {
    let seen = seen_at(200);

    assert_eq!(check_sequence(SequenceInput { seen: &seen, game: SEEN_GAME, sequence: 200 }), Freshness::Same);
}

#[test]
fn calls_a_release_signed_before_the_highest_seen_older() {
    let seen = seen_at(200);

    assert_eq!(check_sequence(SequenceInput { seen: &seen, game: SEEN_GAME, sequence: 199 }), Freshness::Older);
}

#[test]
fn keeps_the_history_across_a_patch_of_the_same_game_line() {
    let seen = seen_at(200);

    assert_eq!(check_sequence(SequenceInput { seen: &seen, game: "1.46.1.0", sequence: 199 }), Freshness::Older);
}

#[test]
fn starts_a_new_history_for_another_game_line() {
    let seen = seen_at(200);

    assert_eq!(check_sequence(SequenceInput { seen: &seen, game: "1.47.0.0", sequence: 1 }), Freshness::Newer);
}

#[test]
fn folds_sequences_kept_per_client_version_into_their_game_line() {
    let seen = BTreeMap::from([("1.46.0.0".to_owned(), 300), ("1.46.1.0".to_owned(), 200), ("1.47.0.0".to_owned(), 100)]);

    assert_eq!(by_game_line(seen), BTreeMap::from([("1.46".to_owned(), 300), ("1.47".to_owned(), 100)]));
}

fn store_in(dir: &tempfile::TempDir) -> SequenceStore {
    SequenceStore::new(dir.path().join("Игрок").join(SEQUENCES_FILE))
}

fn remember_at(store: &SequenceStore, sequence: u64) -> Freshness {
    store.remember(RememberInput { game: SEEN_GAME, version: "0.2.0", sequence }).unwrap()
}

#[test]
fn reports_a_release_signed_before_the_highest_remembered_as_older() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);

    remember_at(&store, 300);
    remember_at(&store, 400);

    assert_eq!(remember_at(&store, 350), Freshness::Older);
}

#[test]
fn does_not_lower_the_remembered_sequence_for_an_older_release() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);

    remember_at(&store, 400);
    remember_at(&store, 350);

    assert_eq!(remember_at(&store, 399), Freshness::Older);
}

#[test]
fn sets_a_corrupt_sequences_file_aside() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join(SEQUENCES_FILE);

    std::fs::write(&path, "{ not json").unwrap();
    remember_at(&SequenceStore::new(&path), 500);

    assert_eq!(std::fs::read_to_string(dir.path().join(format!("{SEQUENCES_FILE}{CORRUPT_SUFFIX}"))).unwrap(), "{ not json");
}

#[test]
fn rebuilds_a_corrupt_sequences_file_from_the_verified_release_only() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join(SEQUENCES_FILE);

    std::fs::write(&path, "{ not json").unwrap();
    remember_at(&SequenceStore::new(&path), 500);

    let rebuilt: BTreeMap<String, u64> = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();

    assert_eq!(rebuilt, seen_at(500));
}

#[test]
fn offers_no_release_in_place_of_one_older_than_seen() {
    let latest = LatestRelease { game: SEEN_GAME.to_owned(), status: ReleaseStatus::Compatible, release: Some(release("0.2.0")) };

    assert_eq!(without_release(latest), LatestRelease { game: SEEN_GAME.to_owned(), status: ReleaseStatus::Waiting, release: None });
}

#[test]
fn the_release_key_is_the_updater_key() {
    let config: serde_json::Value = serde_json::from_str(include_str!("../../tauri.conf.json")).unwrap();

    assert_eq!(config["plugins"]["updater"]["pubkey"], RELEASE_PUBLIC_KEY);
}

#[test]
fn downloads_only_from_our_https_hosts() {
    let api = "https://api.triotmetki.ru";

    assert!(is_trusted_url("https://triotmetki.ru/downloads/modpack/0.2.0/net.triotmetki.core_0.2.0.mtmod", api));
    assert!(is_trusted_url("https://triotmetki.ru/downloads/modpack/0.2.0/catalog/components.json", api));
    assert!(is_trusted_url("https://cdn.triotmetki.ru/modpack/a.mtmod", api));
    assert!(!is_trusted_url("http://triotmetki.ru/downloads/modpack/0.2.0/a.mtmod", api));
    assert!(!is_trusted_url("http://cdn.triotmetki.ru/a.mtmod", api));
    assert!(!is_trusted_url("https://triotmetki.ru.evil.com/a.mtmod", api));
    assert!(!is_trusted_url("https://eviltriotmetki.ru/a.mtmod", api));
    assert!(is_trusted_url("http://localhost:3000/modpack/a.mtmod", "http://localhost:3000"));
    assert!(!is_trusted_url("http://localhost:30001/a.mtmod", "http://localhost:3000"));
    assert!(!is_trusted_url("http://mirror.example.com/modpack/a.mtmod", "http://mirror.example.com"));
    assert!(is_trusted_url("https://mirror.example.com/modpack/a.mtmod", "https://mirror.example.com"));
}

#[test]
fn downloads_dependencies_only_from_their_pinned_release_paths() {
    assert!(is_dependency_source("https://github.com/CH4MPi/GUIFlash/releases/download/v0.6.6/gambiter.guiflash_0.6.6.mtmod"));
    assert!(is_dependency_source("https://raw.githubusercontent.com/CH4MPi/GUIFlash/v0.6.6/LICENSE"));
    assert!(is_dependency_source("https://gitlab.com/-/project/68695173/uploads/43577d5bab856523c1b7a6dcada27f23/net.openwg.gameface_1.2.2.mtmod"));
    assert!(is_dependency_source("https://gitlab.com/openwg/wot.gameface/-/raw/v1.2.2/LICENSE"));
    assert!(is_dependency_source(
        "https://gitlab.com/-/project/26509092/uploads/9705f0b2627e9a074ecac2e84f38c9ca/me.poliroid.modslistapi_1.6.01.wotmod"
    ));
    assert!(is_dependency_source("https://gitlab.com/wot-public-mods/mods-list/-/raw/v1.6.01/LICENSE.md"));

    assert!(!is_dependency_source("http://github.com/CH4MPi/GUIFlash/releases/download/v0.6.6/gambiter.guiflash_0.6.6.mtmod"));
    assert!(!is_dependency_source("https://github.com/evil/GUIFlash/releases/download/v0.6.6/gambiter.guiflash_0.6.6.mtmod"));
    assert!(!is_dependency_source("https://github.com/CH4MPi/GUIFlash/archive/refs/tags/v0.6.6.zip"));
    assert!(!is_dependency_source("https://github.com/CH4MPi/GUIFlash/releases/download/../../../evil/x/releases/download/a.mtmod"));
    assert!(!is_dependency_source("https://github.com:8443/CH4MPi/GUIFlash/releases/download/v0.6.6/a.mtmod"));
    assert!(!is_dependency_source("https://user@github.com/CH4MPi/GUIFlash/releases/download/v0.6.6/a.mtmod"));
    assert!(!is_dependency_source("https://github.com.evil.com/CH4MPi/GUIFlash/releases/download/v0.6.6/a.mtmod"));
    assert!(!is_dependency_source("https://gitlab.com/-/project/1/uploads/a/b.mtmod"));
    assert!(!is_dependency_source("https://gitlab.com/wot-public-mods/other/-/raw/v1/LICENSE.md"));
    assert!(!is_dependency_source("https://triotmetki.ru/downloads/modpack/0.2.0/a.mtmod"));
    assert!(!is_dependency_source("https://release-assets.githubusercontent.com/github-production-release-asset/278886795/a"));
}

#[test]
fn follows_github_asset_redirects_but_no_others() {
    let parse = |url: &str| reqwest::Url::parse(url).unwrap();

    assert!(is_dependency_redirect(&parse("https://release-assets.githubusercontent.com/github-production-release-asset/278886795/2e0c?sp=r")));
    assert!(is_dependency_redirect(&parse("https://objects.githubusercontent.com/github-production-release-asset-2e65be/278886795/2e0c")));
    assert!(is_dependency_redirect(&parse("https://github.com/CH4MPi/GUIFlash/releases/download/v0.6.6/a.mtmod")));
    assert!(!is_dependency_redirect(&parse("https://release-assets.githubusercontent.com/other/a")));
    assert!(!is_dependency_redirect(&parse("https://evil.example/github-production-release-asset/a")));
    assert!(!is_dependency_redirect(&parse("http://release-assets.githubusercontent.com/github-production-release-asset/a")));
}

#[test]
fn the_release_client_refuses_a_dependency_from_elsewhere() {
    let client = ReleasesClient::new("https://api.triotmetki.ru").unwrap();
    let limits = || FetchLimits { expected_size: None, max_bytes: MAX_NOTICE_BYTES };

    tauri::async_runtime::block_on(async {
        assert_eq!(client.fetch_dependency("https://evil.example/a.mtmod", limits()).await.unwrap_err().code(), ErrorCode::UntrustedHost);
        assert_eq!(
            client.fetch("https://github.com/CH4MPi/GUIFlash/releases/download/v0.6.6/a.mtmod", limits()).await.unwrap_err().code(),
            ErrorCode::UntrustedHost
        );
    });
}

#[test]
fn matches_a_game_version_like_the_server() {
    assert!(matches_game("1.46.*", "1.46.0.8259"));
    assert!(!matches_game("1.46.*", "1.47.0.0"));
    assert!(matches_game("1.46", "1.46.0.0"));
    assert!(!matches_game("1.46", "1.46.1.0"));
    assert!(!matches_game("1.5.*", "1.50.0.0"));
    assert!(matches_game("1.050.0.0", "1.50.0.0"));
}

#[test]
fn a_signed_release_for_another_game_is_not_installable() {
    let offered = crate::releases::fixtures::latest("1.47.0.0", Some(crate::releases::fixtures::release("0.2.0")));

    assert_eq!(for_game(offered, "1.47.0.0").status, ReleaseStatus::Waiting);
}

#[test]
fn a_release_listing_the_game_stays_compatible() {
    let offered = crate::releases::fixtures::latest("1.46.0.0", Some(crate::releases::fixtures::release("0.2.0")));

    assert_eq!(for_game(offered, "1.46.0.0").status, ReleaseStatus::Compatible);
}
