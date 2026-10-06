use std::fs;
use std::io::Read;

use super::*;

#[test]
fn writes_the_entries_into_a_new_folder() {
    let root = tempfile::tempdir().unwrap();
    let target = root.path().join("Рабочий стол").join("логи.zip");
    let mut zip = AtomicZip::create(&target).unwrap();

    zip.add("manager/manager.log", "запущен".as_bytes()).unwrap();

    let saved = zip.finish().unwrap();
    let mut archive = zip::ZipArchive::new(fs::File::open(&saved).unwrap()).unwrap();
    let mut text = String::new();

    archive.by_name("manager/manager.log").unwrap().read_to_string(&mut text).unwrap();

    assert_eq!(saved, target);
    assert_eq!(text, "запущен");
    assert_eq!(fs::read_dir(target.parent().unwrap()).unwrap().count(), 1);
}

#[test]
fn an_unfinished_zip_leaves_the_previous_file_alone() {
    let root = tempfile::tempdir().unwrap();
    let target = root.path().join("логи.zip");

    fs::write(&target, "previous").unwrap();

    let mut zip = AtomicZip::create(&target).unwrap();

    zip.add("a.txt", b"a").unwrap();
    assert!(zip.add("a.txt", b"again").is_err());
    drop(zip);

    assert_eq!(fs::read_to_string(&target).unwrap(), "previous");
    assert_eq!(fs::read_dir(root.path()).unwrap().count(), 1);
}
