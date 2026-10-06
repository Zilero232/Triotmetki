use super::*;

#[test]
fn a_file_mapped_by_another_process_is_locked() {
    assert_eq!(io_code(&std::io::Error::from_raw_os_error(USER_MAPPED_FILE)), ErrorCode::FileLocked);
}

#[test]
fn a_refused_access_has_its_own_code() {
    assert_eq!(io_code(&std::io::Error::from_raw_os_error(ACCESS_DENIED)), ErrorCode::AccessDenied);
}
