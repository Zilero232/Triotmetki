use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    Io,
    Json,
    Http,
    ClientNotFound,
    ClientRunning,
    NotInstalled,
    UnknownComponent,
    RequiredComponent,
    ProfileLimit,
    ProfileName,
    ProfileMissing,
    ProfileCode,
    ChecksumMismatch,
    ReleaseUnavailable,
    InvalidPath,
    Autostart,
    Busy,
    ClientUnsupported,
    SignatureInvalid,
    UntrustedHost,
    DiskFull,
    FileLocked,
    AccessDenied,
    RollbackFailed,
    NothingToRestore,
    SetName,
    SetCode,
    Offline,
    NotLinked,
    LinkRevoked,
    LinkCode,
    RateLimited,
    SyncUnavailable,
    ReportExpired,
    SiteOffline,
}

pub const ACCESS_DENIED: i32 = 5;
pub const SHARING_VIOLATION: i32 = 32;
pub const LOCK_VIOLATION: i32 = 33;
pub const DISK_FULL_OS: i32 = 112;
pub const USER_MAPPED_FILE: i32 = 1224;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Http(#[from] reqwest::Error),
    #[error("{0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("{0}")]
    Walk(#[from] walkdir::Error),
    #[error("{message}")]
    Coded { code: ErrorCode, message: String },
}

impl AppError {
    pub fn coded(code: ErrorCode, message: impl Into<String>) -> Self {
        Self::Coded { code, message: message.into() }
    }

    pub fn code(&self) -> ErrorCode {
        match self {
            Self::Io(error) => io_code(error),
            Self::Json(_) => ErrorCode::Json,
            Self::Http(_) => ErrorCode::Http,
            Self::Zip(_) | Self::Walk(_) => ErrorCode::Io,
            Self::Coded { code, .. } => *code,
        }
    }
}

pub fn io_code(error: &std::io::Error) -> ErrorCode {
    match (error.kind(), error.raw_os_error()) {
        (std::io::ErrorKind::StorageFull, _) | (_, Some(DISK_FULL_OS)) => ErrorCode::DiskFull,
        (_, Some(SHARING_VIOLATION | LOCK_VIOLATION | USER_MAPPED_FILE)) => ErrorCode::FileLocked,
        (_, Some(ACCESS_DENIED)) => ErrorCode::AccessDenied,
        _ => ErrorCode::Io,
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", &self.code())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_file_mapped_by_another_process_is_locked() {
        assert_eq!(io_code(&std::io::Error::from_raw_os_error(USER_MAPPED_FILE)), ErrorCode::FileLocked);
    }

    #[test]
    fn a_refused_access_has_its_own_code() {
        assert_eq!(io_code(&std::io::Error::from_raw_os_error(ACCESS_DENIED)), ErrorCode::AccessDenied);
    }
}
