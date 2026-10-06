use super::*;
use crate::report::RedactContext;

fn redactor() -> Redactor {
    Redactor::new(&RedactContext { user_name: Some("Игрок".into()), account_ids: Vec::new(), secrets: Vec::new() })
}

const PYTHON_LOG: &str = r#"2026-09-30 21:47:05.120: INFO: [OTMETKI] core 0.5.0 loaded
2026-09-30 21:47:05.200: INFO: [OTMETKI] failed to register hit_log
Traceback (most recent call last):
  File "scripts/client/gui/mods/mod_otmetki_hit_log.py", line 6, in <module>
  File "gui/mods/otmetki/features/hit_log/__init__.py", line 3, in <module>
ImportError: No module named gambiter
2026-09-30 21:47:05.300: ERROR: [EXCEPTION] (scripts/client/gui/mods/__init__.py, 60):
Traceback (most recent call last):
  File "scripts/client/gui/mods/__init__.py", line 58, in init
  File "C:\Users\Игрок\Games\Tanki\mods\1.45.0.0\mod_otmetki_marks_panel.pyc", line 1, in <module>
RuntimeError: Bad magic number in .pyc file
2026-09-30 21:47:05.400: INFO: [OTMETKI] failed to start
Traceback (most recent call last):
  File "scripts/client/gui/mods/mod_otmetki.py", line 6, in <module>
ImportError: No module named otmetki.companion.app
2026-09-30 21:47:05.500: INFO: [OTMETKI] failed to register ui
Traceback (most recent call last):
  File "scripts/client/gui/mods/mod_otmetki_ui.py", line 6, in <module>
AttributeError: 'NoneType' object has no attribute 'load'
2026-09-30 21:47:06.000: INFO: [OTMETKI] error in onBattleEvent
Traceback (most recent call last):
  File "gui/mods/otmetki/features/damage_log/panel.py", line 40, in on_event
KeyError: 'damage'
"#;

#[test]
fn finds_the_components_that_failed_to_load_and_why() {
    let failures = scan_text(PYTHON_LOG, LogSource::PythonLog, &redactor());
    let summary: Vec<(&str, FailureKind)> = failures.iter().map(|failure| (failure.component.as_str(), failure.kind)).collect();

    assert_eq!(
        summary,
        vec![
            ("hit_log", FailureKind::Dependency),
            ("marks_panel", FailureKind::Outdated),
            ("companion", FailureKind::Install),
            ("ui", FailureKind::Error)
        ]
    );
    assert_eq!(failures[0].excerpt, "ImportError: No module named gambiter");
    assert!(failures.iter().all(|failure| failure.source == LogSource::PythonLog && !failure.excerpt.contains("Игрок")));
}

#[test]
fn a_clean_log_has_no_failures() {
    assert!(scan_text("[OTMETKI] core loaded\n[OTMETKI] error in handler\nKeyError: 'x'\n", LogSource::OtmetkiLog, &redactor()).is_empty());
}

#[test]
fn merges_both_logs_and_drops_unknown_components() {
    let python = scan_text(PYTHON_LOG, LogSource::PythonLog, &redactor());
    let own = scan_text(
        "[OTMETKI] failed to register minimap\nValueError: bad\n[OTMETKI] failed to register hit_log\n",
        LogSource::OtmetkiLog,
        &redactor(),
    );
    let known: Vec<String> = ["hit_log", "minimap", "ui"].iter().map(|id| (*id).to_owned()).collect();
    let merged = merge_failures(vec![own, python], Some(&known));

    assert_eq!(merged.iter().map(|failure| failure.component.as_str()).collect::<Vec<_>>(), vec!["minimap", "hit_log", "ui"]);
    assert_eq!(merged[1].source, LogSource::OtmetkiLog);
    assert_eq!(merge_failures(vec![scan_text(PYTHON_LOG, LogSource::PythonLog, &redactor())], None).len(), 4);
}

#[test]
fn classifies_the_exception_text() {
    assert_eq!(classify("ImportError: Bad magic number"), FailureKind::Outdated);
    assert_eq!(classify("ImportError: No module named openwg_gameface"), FailureKind::Dependency);
    assert_eq!(classify("ImportError: No module named gui.mods.otmetki.core"), FailureKind::Install);
    assert_eq!(classify("ValueError: x"), FailureKind::Error);
}

#[test]
fn scanning_a_missing_file_finds_nothing() {
    let root = tempfile::tempdir().unwrap();

    assert!(scan_file(&root.path().join("python.log"), LogSource::PythonLog, &redactor()).is_empty());
}
