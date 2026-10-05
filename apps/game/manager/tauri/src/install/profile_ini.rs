use std::path::Path;

use crate::error::{AppError, AppResult, ErrorCode};
use crate::ini_file;
use crate::state::{component_id, split_csv};

pub const SECTION: &str = "Setup";
pub const KEY: &str = "Components";
pub const PROFILE_EXTENSION: &str = "ini";

pub fn read_component_profile(path: &Path) -> AppResult<Vec<String>> {
    let ini = ini_file::read(path)?.ok_or_else(|| AppError::coded(ErrorCode::ProfileMissing, format!("no file {}", path.display())))?;
    let components = ini_file::get(&ini, SECTION, KEY).ok_or_else(|| AppError::coded(ErrorCode::ProfileCode, "not an installer profile"))?;

    Ok(split_csv(components).iter().map(|name| component_id(name.trim_start_matches('!')).to_owned()).filter(|id| !id.is_empty()).collect())
}
