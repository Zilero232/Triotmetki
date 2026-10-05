use std::fs;

use super::*;

#[test]
fn writes_the_startup_error_to_the_crash_log() {
    let dir = tempfile::tempdir().unwrap();
    let log = write_crash_log(dir.path(), "no application data folder").unwrap();

    assert_eq!(log, dir.path().join(CRASH_LOG));
    assert!(fs::read_to_string(&log).unwrap().contains("no application data folder"));
}
