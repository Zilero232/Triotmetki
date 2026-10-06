use std::fs;

use chrono::TimeZone;

use super::*;
use crate::detect::fixtures::lesta_client;

#[test]
fn bundles_the_diagnostics_but_never_the_credentials() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let layout = Layout::new(root.path().join("Local"), root.path().join("Roaming"));
    let configs = configs_dir(&client.path);

    fs::create_dir_all(layout.logs_dir()).unwrap();
    fs::write(layout.logs_dir().join("manager.log"), "started").unwrap();
    fs::write(client.path.join("python.log"), "[OTMETKI] started").unwrap();
    fs::write(client.mods_dir.join("net.triotmetki.core_0.1.0.mtmod"), "x").unwrap();
    fs::create_dir_all(&configs).unwrap();
    fs::write(configs.join("config.json"), "{}").unwrap();
    fs::write(configs.join("credentials.json"), "secret").unwrap();

    let now = Local.with_ymd_and_hms(2026, 9, 28, 10, 0, 0).unwrap();
    let redactor = Redactor::new(&crate::report::RedactContext::default());
    let zip_path = collect(CollectInput {
        layout: &layout,
        clients: std::slice::from_ref(&client),
        output_dir: &root.path().join("Рабочий стол"),
        now,
        redactor: &redactor,
    })
    .unwrap();
    let archive = zip::ZipArchive::new(fs::File::open(&zip_path).unwrap()).unwrap();
    let names: Vec<String> = archive.file_names().map(str::to_owned).collect();
    let key = client_key(&client.path);

    assert!(zip_path.ends_with("otmetki-logs-20260928-100000.zip"));
    assert!(names.contains(&"manager/manager.log".to_owned()));
    assert!(names.contains(&format!("clients/{key}/python.log")));
    assert!(names.contains(&format!("clients/{key}/configs/config.json")));
    assert!(names.contains(&format!("clients/{key}/listing.txt")));
    assert!(names.iter().all(|name| !name.contains("credentials")));
}

#[test]
fn redacts_the_device_secret_and_the_user_in_every_bundled_file() {
    let root = tempfile::tempdir().unwrap();
    let client = lesta_client(root.path(), "1.45.0.0");
    let layout = Layout::new(root.path().join("Local"), root.path().join("Roaming"));
    let secret = "q".repeat(48);
    let utf16: Vec<u8> = [0xFF, 0xFE].into_iter().chain(format!("[install]\nsecret {secret}").encode_utf16().flat_map(u16::to_le_bytes)).collect();

    fs::create_dir_all(layout.logs_dir()).unwrap();
    fs::write(layout.logs_dir().join("manager.log"), format!("signed with {secret} for Игрок")).unwrap();
    fs::write(client.path.join("python.log"), format!("[OTMETKI] key {secret}")).unwrap();
    fs::create_dir_all(layout.client_dir(&client.path)).unwrap();
    fs::write(layout.client_dir(&client.path).join(MANIFEST_INI), utf16).unwrap();

    let redactor =
        Redactor::new(&crate::report::RedactContext { user_name: Some("Игрок".into()), account_ids: Vec::new(), secrets: vec![secret.clone()] });
    let zip_path = collect(CollectInput {
        layout: &layout,
        clients: std::slice::from_ref(&client),
        output_dir: &root.path().join("Рабочий стол"),
        now: Local::now(),
        redactor: &redactor,
    })
    .unwrap();
    let mut archive = zip::ZipArchive::new(fs::File::open(&zip_path).unwrap()).unwrap();
    let key = client_key(&client.path);
    let mut read = |name: &str| {
        let mut text = String::new();

        std::io::Read::read_to_string(&mut archive.by_name(name).unwrap(), &mut text).unwrap();
        text
    };

    assert_eq!(read("manager/manager.log"), "signed with <redacted> for <user>");
    assert_eq!(read(&format!("clients/{key}/python.log")), "[OTMETKI] key <redacted>");
    assert!(read(&format!("clients/{key}/state/{MANIFEST_INI}")).ends_with("secret <redacted>"));
}

#[test]
fn hides_the_bind_code_in_the_bundled_config() {
    let redacted: serde_json::Value = serde_json::from_slice(&redact_config(br#"{"bind_code":"ABCD-1234","enabled":true}"#)).unwrap();

    assert_eq!(redacted["bind_code"], REDACTED);
    assert_eq!(redacted["enabled"], true);
    assert_eq!(redact_config(b"not json"), b"not json");
}
