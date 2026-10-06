use super::*;

#[test]
fn announces_the_patch_outcomes_only() {
    let waiting = PatchStatus::Waiting { game_version: "1.46.0.0".into(), from: "1.45.0.0".into() };
    let current = PatchStatus::UpToDate { game_version: "1.46.0.0".into(), modpack_version: None };

    assert_eq!(notice(&waiting, Locale::Ru).unwrap().body, "Ждём обновления модпака под 1.46.0.0.");
    assert!(notice(&current, Locale::En).is_none());
}

#[test]
fn a_failure_never_shows_a_raw_error() {
    let failed = PatchStatus::Failed { code: ErrorCode::FileLocked };

    assert_eq!(notice(&failed, Locale::Ru).unwrap().body, "Не удалось обновить модпак: файлы модпака заняты игрой или антивирусом.");
    assert!(!notice(&PatchStatus::Failed { code: ErrorCode::Io }, Locale::En).unwrap().body.contains("os error"));
}
