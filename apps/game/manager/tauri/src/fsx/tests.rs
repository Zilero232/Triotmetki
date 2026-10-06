use std::fs;
use std::path::Path;

use super::*;

fn write(path: &Path, text: &str) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, text).unwrap();
}

#[test]
fn refuses_to_delete_roots_and_relative_paths() {
    assert!(ensure_removable(Path::new(r"C:\")).is_err());
    assert!(ensure_removable(Path::new("relative")).is_err());
    assert!(ensure_removable(Path::new(r"C:\Games\Мир танков\mods\..\..\Users")).is_err());
}

#[test]
fn keeps_deletions_inside_the_listed_roots() {
    let dir = tempfile::tempdir().unwrap();
    let mods = dir.path().join("Мир танков").join("mods");
    let roots = [mods.clone()];

    write(&mods.join("1.45.0.0").join("core.mtmod"), "core");
    write(&dir.path().join("Документы").join("важное.txt"), "keep");

    assert!(ensure_within(&mods.join("1.45.0.0").join("core.mtmod"), &roots).is_ok());
    assert!(ensure_within(&mods.join("1.45.0.0").join("missing.mtmod"), &roots).is_ok());
    assert!(ensure_within(&mods, &roots).is_err());
    assert!(ensure_within(&mods.join("..").join("..").join("Документы").join("важное.txt"), &roots).is_err());
    assert!(ensure_within(&dir.path().join("Мир танков").join("modsevil").join("a.mtmod"), &roots).is_err());
    assert!(ensure_within(Path::new("mods").join("a.mtmod").as_path(), &[PathBuf::from("mods")]).is_err());
}

#[test]
fn moves_a_file_over_an_existing_one() {
    let dir = tempfile::tempdir().unwrap();
    let from = dir.path().join("from").join("x.mtmod");
    let to = dir.path().join("to").join("x.mtmod");

    write(&from, "new");
    write(&to, "old");
    move_file(&from, &to).unwrap();

    assert!(!from.exists());
    assert_eq!(fs::read_to_string(&to).unwrap(), "new");
}

#[test]
fn lists_only_the_files_of_a_folder() {
    let dir = tempfile::tempdir().unwrap();

    write(&dir.path().join("file"), "");
    fs::create_dir_all(dir.path().join("folder")).unwrap();

    assert_eq!(list_files(dir.path()), vec![dir.path().join("file")]);
    assert!(list_files(&dir.path().join("absent")).is_empty());
}

#[test]
fn a_copy_that_does_not_match_the_expected_hash_never_lands() {
    let dir = tempfile::tempdir().unwrap();
    let from = dir.path().join("снимок").join("core.mtmod");
    let to = dir.path().join("mods").join("core.mtmod");

    write(&from, "changed after the check");
    write(&to, "the player's file");

    let error = copy_expected(&from, &to, Some(&hex::encode(Sha256::digest(b"what was checked")))).unwrap_err();

    assert_eq!(error.code(), ErrorCode::ChecksumMismatch);
    assert_eq!(fs::read_to_string(&to).unwrap(), "the player's file");
    assert!(!sibling(&to, PART_SUFFIX).exists());

    copy_expected(&from, &to, Some(&hex::encode(Sha256::digest(b"changed after the check")).to_uppercase())).unwrap();

    assert_eq!(fs::read_to_string(&to).unwrap(), "changed after the check");
}

#[test]
fn a_move_that_falls_back_to_a_copy_still_lands() {
    let dir = tempfile::tempdir().unwrap();
    let from = dir.path().join("from").join("x.mtmod");
    let to = dir.path().join("to").join("x.mtmod");

    write(&from, "new");
    faults::fail_after(0, std::io::ErrorKind::CrossesDevices);

    let moved = move_file(&from, &to);

    faults::clear();
    moved.unwrap();

    assert!(!from.exists());
    assert_eq!(fs::read_to_string(&to).unwrap(), "new");
}

#[test]
fn a_failed_cross_drive_move_keeps_the_existing_destination() {
    let dir = tempfile::tempdir().unwrap();
    let from = dir.path().join("from").join("x.mtmod");
    let to = dir.path().join("to").join("x.mtmod");

    write(&from, "new");
    write(&to, "old");
    faults::fail_times(0, 2, std::io::ErrorKind::CrossesDevices);

    let moved = move_file(&from, &to);

    faults::clear();

    assert!(moved.is_err());
    assert_eq!(fs::read_to_string(&from).unwrap(), "new");
    assert_eq!(fs::read_to_string(&to).unwrap(), "old");
    assert!(!sibling(&to, PART_SUFFIX).exists());
}

#[test]
fn a_replaced_file_can_be_put_back() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("каталог").join("components.json");

    write(&path, "previous");

    let replaced = replace_restorable(&path, b"next").unwrap();

    assert_eq!(fs::read_to_string(&path).unwrap(), "next");

    replaced.restore().unwrap();

    assert_eq!(fs::read_to_string(&path).unwrap(), "previous");
}

#[test]
fn a_new_file_is_removed_when_put_back() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("components.json");

    replace_restorable(&path, b"next").unwrap().restore().unwrap();

    assert!(!path.exists());
}

#[test]
fn keeps_a_path_whose_folders_do_not_exist_yet_inside_the_roots() {
    let dir = tempfile::tempdir().unwrap();
    let mods = dir.path().join("Мир танков").join("mods");

    fs::create_dir_all(&mods).unwrap();

    assert!(ensure_within(&mods.join("1.46.0.0").join("новая").join("core.mtmod"), &[mods]).is_ok());
}

#[test]
fn keeps_a_path_under_a_root_that_does_not_exist_yet() {
    let dir = tempfile::tempdir().unwrap();
    let mods = dir.path().join("Мир танков").join("mods").join("1.47.0.0");

    assert!(ensure_within(&mods.join("core.mtmod"), &[mods]).is_ok());
}

#[cfg(windows)]
#[test]
fn refuses_a_new_path_behind_a_junction_out_of_the_roots() {
    let dir = tempfile::tempdir().unwrap();
    let mods = dir.path().join("Мир танков").join("mods");
    let outside = dir.path().join("Документы");
    let junction = mods.join("ссылка");

    fs::create_dir_all(&mods).unwrap();
    fs::create_dir_all(&outside).unwrap();

    let made = std::process::Command::new("cmd").arg("/C").arg("mklink").arg("/J").arg(&junction).arg(&outside).output().unwrap();

    assert!(made.status.success());
    assert!(ensure_within(&junction.join("новая").join("core.mtmod"), &[mods]).is_err());
}
