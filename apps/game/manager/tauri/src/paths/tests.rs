use std::path::Path;

use super::*;

#[test]
fn keeps_a_cyrillic_file_name() {
    assert_eq!(safe_file_name("Мой набор.tmset", "set"), "Мой набор.tmset");
}

#[test]
fn a_file_name_cannot_carry_a_folder() {
    assert_eq!(safe_file_name(r"..\..\Windows\evil.json", "set"), "_.._Windows_evil.json");
    assert_eq!(safe_file_name("C:/Users/report.zip", "set"), "C__Users_report.zip");
}

#[test]
fn an_empty_or_dotted_name_falls_back() {
    assert_eq!(safe_file_name(" .. ", "set"), "set");
    assert_eq!(safe_file_name("\u{0}\u{7}", "set"), "set");
}

#[test]
fn a_reserved_device_name_falls_back() {
    for name in ["con", "NUL.zip", "com1.tmset", "Lpt9", "con ."] {
        assert_eq!(safe_file_name(name, "set"), "set", "{name:?}");
    }

    assert_eq!(safe_file_name("console.zip", "set"), "console.zip");
    assert_eq!(safe_file_name("report. . ", "set"), "report");
}

#[test]
fn a_long_name_is_clipped() {
    assert_eq!(safe_file_name(&"я".repeat(500), "set").chars().count(), FILE_NAME_MAX_CHARS);
}

#[test]
fn a_relative_path_never_climbs_out_of_its_root() {
    let root = Path::new(r"D:\Игры\Танки");

    assert_eq!(join_relative(root, "../Windows"), None);
    assert_eq!(join_relative(root, r"mods\..\..\x"), None);
    assert_eq!(join_relative(root, "C:/x"), None);
    assert_eq!(join_relative(root, "mods/configs"), Some(root.join("mods").join("configs")));
}

#[test]
fn a_package_name_windows_cannot_hold_is_refused() {
    let long = format!("{}.mtmod", "a".repeat(255));

    for name in ["com0.mtmod", "con .mtmod", "a\u{7f}.mtmod", "a\u{85}.mtmod", "..", long.as_str()] {
        assert!(crate::releases::safe_file_name(name).is_err(), "{name:?}");
    }

    assert!(crate::releases::safe_file_name("net.triotmetki.core_0.2.0.mtmod").is_ok());
    assert!(crate::releases::safe_file_name("Набор.mtmod").is_ok());
}
