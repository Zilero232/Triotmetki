pub mod faults;

use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

use sha2::{Digest, Sha256};
use walkdir::WalkDir;

use crate::error::{AppError, AppResult, ErrorCode};
use crate::paths::normalized;

pub const RETIRED_SUFFIX: &str = ".otm-old";
pub const PART_SUFFIX: &str = ".part";
pub const TEMP_SUFFIX: &str = ".otm-tmp";
pub const MIN_SAFE_PATH_LENGTH: usize = 4;
pub const PATH_SEPARATOR: char = '\\';

pub fn write_file(path: &Path, bytes: &[u8]) -> AppResult<()> {
    faults::check(path)?;

    let mut file = fs::File::create(path)?;

    file.write_all(bytes)?;
    file.sync_all()?;

    Ok(())
}

pub fn copy_file(from: &Path, to: &Path) -> AppResult<u64> {
    faults::check(to)?;

    Ok(fs::copy(from, to)?)
}

pub fn rename_file(from: &Path, to: &Path) -> AppResult<()> {
    faults::check(to)?;
    fs::rename(from, to)?;

    Ok(())
}

pub fn write_atomic(path: &Path, bytes: &[u8]) -> AppResult<()> {
    let parent = path.parent().filter(|parent| !parent.as_os_str().is_empty()).unwrap_or(Path::new("."));

    fs::create_dir_all(parent)?;

    let mut temp = tempfile::Builder::new().suffix(TEMP_SUFFIX).tempfile_in(parent)?;

    faults::check(temp.path())?;
    temp.write_all(bytes)?;
    temp.as_file().sync_all()?;
    faults::check(path)?;
    temp.persist(path).map_err(|error| error.error)?;

    Ok(())
}

#[derive(Debug)]
#[must_use]
pub struct Replaced {
    path: PathBuf,
    previous: Option<Vec<u8>>,
}

impl Replaced {
    pub fn restore(self) -> AppResult<()> {
        match &self.previous {
            Some(bytes) => write_atomic(&self.path, bytes),
            None => remove_path(&self.path),
        }
    }
}

pub fn replace_restorable(path: &Path, bytes: &[u8]) -> AppResult<Replaced> {
    let previous = match fs::read(path) {
        Ok(previous) => Some(previous),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(error.into()),
    };

    write_atomic(path, bytes)?;

    Ok(Replaced { path: path.to_path_buf(), previous })
}

pub fn file_sha256(path: &Path) -> AppResult<String> {
    let mut hasher = Sha256::new();

    std::io::copy(&mut fs::File::open(path)?, &mut hasher)?;

    Ok(hex::encode(hasher.finalize()))
}

pub fn same_content(left: &Path, right: &Path) -> bool {
    let size = |path: &Path| fs::metadata(path).ok().filter(fs::Metadata::is_file).map(|metadata| metadata.len());

    size(left).is_some_and(|left_size| size(right) == Some(left_size))
        && matches!((file_sha256(left), file_sha256(right)), (Ok(left), Ok(right)) if left == right)
}

pub fn copy_verified(from: &Path, to: &Path) -> AppResult<()> {
    copy_expected(from, to, None)
}

pub fn copy_expected(from: &Path, to: &Path, sha256: Option<&str>) -> AppResult<()> {
    let part = sibling(to, PART_SUFFIX);
    let copied = copy_file(from, &part).and_then(|_| {
        let intact = match sha256 {
            Some(expected) => file_sha256(&part).is_ok_and(|actual| actual.eq_ignore_ascii_case(expected)),
            None => same_content(from, &part),
        };

        if !intact {
            return Err(AppError::coded(ErrorCode::ChecksumMismatch, format!("the copy of {} differs", from.display())));
        }

        rename_file(&part, to)
    });

    if copied.is_err() {
        let _ = fs::remove_file(&part);
    }

    copied
}

fn has_relative_parts(path: &Path) -> bool {
    path.components().any(|component| matches!(component, Component::ParentDir | Component::CurDir))
}

fn is_strictly_inside(path: &Path, root: &Path) -> bool {
    let root = normalized(root);
    let prefix = if root.ends_with(PATH_SEPARATOR) { root } else { format!("{root}{PATH_SEPARATOR}") };

    normalized(path).starts_with(&prefix)
}

fn resolved(path: &Path) -> Option<PathBuf> {
    fs::canonicalize(path)
        .ok()
        .or_else(|| path.parent().and_then(|parent| fs::canonicalize(parent).ok()).zip(path.file_name()).map(|(parent, name)| parent.join(name)))
}

fn is_within(path: &Path, root: &Path) -> bool {
    if !root.is_absolute() || !is_strictly_inside(path, root) {
        return false;
    }

    match (resolved(path), fs::canonicalize(root).ok()) {
        (Some(path), Some(root)) => is_strictly_inside(&path, &root),
        _ => true,
    }
}

pub fn ensure_within(path: &Path, roots: &[PathBuf]) -> AppResult<()> {
    let inside = path.is_absolute() && !has_relative_parts(path) && roots.iter().any(|root| is_within(path, root));

    if !inside {
        return Err(AppError::coded(ErrorCode::InvalidPath, format!("{} is outside the folders the manager writes", path.display())));
    }

    Ok(())
}

pub fn ensure_removable(path: &Path) -> AppResult<()> {
    if !path.is_absolute() || has_relative_parts(path) || path.to_string_lossy().trim_end_matches(['\\', '/']).len() < MIN_SAFE_PATH_LENGTH {
        return Err(AppError::coded(ErrorCode::InvalidPath, format!("refusing to delete {}", path.display())));
    }

    Ok(())
}

pub fn remove_path(path: &Path) -> AppResult<()> {
    ensure_removable(path)?;

    if path.is_dir() {
        fs::remove_dir_all(path)?;
    } else if path.exists() {
        fs::remove_file(path)?;
    }

    Ok(())
}

pub fn move_file(from: &Path, to: &Path) -> AppResult<()> {
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent)?;
    }

    if rename_file(from, to).is_ok() {
        return Ok(());
    }

    let existed = to.exists();

    copy_verified(from, to)?;

    if let Err(error) = fs::remove_file(from) {
        if !existed {
            let _ = fs::remove_file(to);
        }

        return Err(error.into());
    }

    Ok(())
}

pub fn sibling(path: &Path, suffix: &str) -> PathBuf {
    let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();

    path.with_file_name(format!("{name}{suffix}"))
}

pub fn dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| entry.metadata().ok())
        .map(|metadata| metadata.len())
        .sum()
}

pub fn list_files(dir: &Path) -> Vec<PathBuf> {
    fs::read_dir(dir)
        .map(|entries| {
            entries.filter_map(Result::ok).filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_file())).map(|entry| entry.path()).collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests;
