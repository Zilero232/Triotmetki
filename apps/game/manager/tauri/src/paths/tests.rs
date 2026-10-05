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
