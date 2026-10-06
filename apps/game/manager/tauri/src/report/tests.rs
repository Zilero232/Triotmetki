use std::fs;

use super::*;

fn redactor() -> Redactor {
    Redactor::new(&RedactContext { user_name: Some("Игрок".into()), account_ids: vec![12_345_678], secrets: Vec::new() })
}

#[test]
fn hides_personal_data_and_counts_it() {
    let text = [
        r"C:\Users\Игрок\AppData\Roaming\TriOtmetki\config.json",
        "c:/users/john.doe/Documents/replay.mtreplay",
        "player Игрок joined, account 12345678, mail me@example.ru",
        "bound dev_AbCdEf123456 with secret=abcdefghijklmnopqrstuvwxyz0123456789",
        "\"token\": \"xyz.abc\", header sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "game 1.45.0.0 tank 51201 damage 3500",
    ]
    .join("\n");
    let (redacted, count) = redactor().redact(&text);

    assert!(redacted.contains(r"C:\Users\<user>\AppData"));
    assert!(redacted.contains("c:/users/<user>/Documents"));
    assert!(redacted.contains("player <user> joined, account <account>, mail <email>"));
    assert!(redacted.contains("bound <device> with secret=<redacted>"));
    assert!(redacted.contains("\"token\": \"<redacted>\""));
    assert!(redacted.contains("header <redacted>"));
    assert!(redacted.contains("game 1.45.0.0 tank 51201 damage 3500"));
    assert!(!redacted.contains("Игрок") && !redacted.contains("john.doe") && !redacted.contains("12345678"));
    assert_eq!(count, 9);
}

#[test]
fn hides_a_known_secret_wherever_it_appears() {
    let secret = "Zx9".repeat(16);
    let redactor = Redactor::new(&RedactContext { user_name: None, account_ids: Vec::new(), secrets: vec![secret.clone(), "short".into()] });

    let (redacted, count) = redactor.redact(&format!("hmac key {secret} (len 48) and short"));

    assert_eq!(redacted, "hmac key <redacted> (len 48) and short");
    assert_eq!(count, 1);
}

#[test]
fn skips_names_too_short_to_redact_safely() {
    let (redacted, count) =
        Redactor::new(&RedactContext { user_name: Some("Al".into()), account_ids: vec![0], secrets: Vec::new() }).redact("Alpha 0 Al");

    assert_eq!((redacted.as_str(), count), ("Alpha 0 Al", 0));
}

#[test]
fn reads_the_tail_of_a_log_from_a_whole_line() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("Логи").join(PYTHON_LOG);

    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, "first line\nsecond line\nthird line\n").unwrap();

    assert_eq!(read_tail(&path, 1024).unwrap(), ("first line\nsecond line\nthird line\n".to_owned(), false));
    assert_eq!(read_tail(&path, 15).unwrap(), ("third line\n".to_owned(), true));
    assert!(read_tail(&root.path().join("нет.log"), 10).is_none());
}

#[test]
fn decodes_a_cp1251_log() {
    let (bytes, _, _) = encoding_rs::WINDOWS_1251.encode("Путь D:\\Игры");

    assert_eq!(decode_text(&bytes), "Путь D:\\Игры");
    assert_eq!(decode_text("юникод".as_bytes()), "юникод");
}

fn preview() -> ReportPreview {
    let redactor = redactor();

    ReportPreview {
        id: "p1".into(),
        manager_version: "0.2.0".into(),
        modpack_version: Some("0.1.3".into()),
        game_version: None,
        items: vec![
            item(ReportPart::Environment, ENVIRONMENT_FILE, "manager 0.2.0", false, &redactor),
            item(ReportPart::PythonLog, PYTHON_LOG, "Игрок logged in", true, &redactor),
        ],
    }
}

#[test]
fn builds_the_upload_from_the_ticked_parts_only() {
    let preview = preview();
    let body = serde_json::to_value(upload(&preview, &[ReportPart::PythonLog], &format!("  {}  ", "ы".repeat(MESSAGE_MAX_CHARS + 5)))).unwrap();

    assert_eq!(preview.items[1].text, format!("{TRUNCATED_MARK}<user> logged in"));
    assert_eq!(preview.items[1].redactions, 1);
    assert_eq!(body["files"].as_array().unwrap().len(), 1);
    assert_eq!(body["files"][0]["name"], "python.log");
    assert_eq!(body["modpack_version"], "0.1.3");
    assert_eq!(body["game_version"], serde_json::Value::Null);
    assert_eq!(body["message"].as_str().unwrap().chars().count(), MESSAGE_MAX_CHARS);
}

#[test]
fn saves_the_same_content_as_a_zip() {
    let root = tempfile::tempdir().unwrap();
    let saved = write_zip(&root.path().join("отчёт"), &preview(), &[ReportPart::Environment, ReportPart::PythonLog], "Не грузится").unwrap();
    let mut archive = zip::ZipArchive::new(File::open(&saved).unwrap()).unwrap();
    let mut names: Vec<String> = archive.file_names().map(str::to_owned).collect();
    let mut message = String::new();

    names.sort();
    archive.by_name(MESSAGE_FILE).unwrap().read_to_string(&mut message).unwrap();

    assert_eq!(saved.extension().unwrap(), "zip");
    assert_eq!(names, vec!["environment.txt", "message.txt", "python.log"]);
    assert_eq!(message, "Не грузится");
}

#[test]
fn reads_the_receipt_the_server_answers() {
    let receipt: ReportReceipt = serde_json::from_str(r#"{"id":"4c1f","expires_at":"2026-10-30T10:00:00.000Z"}"#).unwrap();

    assert_eq!(receipt.expires_at, "2026-10-30T10:00:00.000Z");
    assert_eq!(serde_json::to_value(&receipt).unwrap()["expiresAt"], "2026-10-30T10:00:00.000Z");
}

#[test]
fn a_failed_save_keeps_the_file_it_would_replace() {
    let root = tempfile::tempdir().unwrap();
    let target = root.path().join("отчёт.zip");
    let mut broken = preview();

    fs::write(&target, "the previous report").unwrap();
    broken.items[1].name = broken.items[0].name.clone();

    assert!(write_zip(&target, &broken, &[ReportPart::Environment, ReportPart::PythonLog], "").is_err());
    assert_eq!(fs::read_to_string(&target).unwrap(), "the previous report");
    assert_eq!(fs::read_dir(root.path()).unwrap().count(), 1);
}
