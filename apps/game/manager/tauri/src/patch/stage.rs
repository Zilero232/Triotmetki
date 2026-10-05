use std::fs;
use std::path::{Path, PathBuf};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::{file_sha256, list_files, remove_path, rename_file, sibling, write_file, PART_SUFFIX, RETIRED_SUFFIX};
use crate::releases::safe_file_name;

pub struct StagedFile<'a> {
    pub dir: &'a Path,
    pub name: &'a str,
    pub bytes: &'a [u8],
    pub sha256: &'a str,
}

#[derive(Debug)]
pub struct Staging {
    parts: Vec<(PathBuf, PathBuf)>,
}

#[derive(Default)]
struct Journal {
    retired: Vec<(PathBuf, PathBuf)>,
    placed: Vec<PathBuf>,
}

fn verify_written(part: &Path, sha256: &str) -> AppResult<()> {
    let actual = file_sha256(part)?;

    if !actual.eq_ignore_ascii_case(sha256.trim()) {
        return Err(AppError::coded(ErrorCode::ChecksumMismatch, format!("{} does not match its sha256", part.display())));
    }

    Ok(())
}

fn stage_one(file: &StagedFile) -> AppResult<(PathBuf, PathBuf)> {
    let name = safe_file_name(file.name)?;
    let target = file.dir.join(name);
    let part = sibling(&target, PART_SUFFIX);

    fs::create_dir_all(file.dir)?;

    let written = write_file(&part, file.bytes).and_then(|()| verify_written(&part, file.sha256));

    if let Err(error) = written {
        let _ = fs::remove_file(&part);

        return Err(error);
    }

    Ok((part, target))
}

pub fn stage(files: &[StagedFile]) -> AppResult<Staging> {
    let mut staging = Staging { parts: Vec::new() };

    for file in files {
        match stage_one(file) {
            Ok(pair) => staging.parts.push(pair),
            Err(error) => {
                staging.discard();

                return Err(error);
            }
        }
    }

    Ok(staging)
}

fn apply(parts: &[(PathBuf, PathBuf)], retire: &[PathBuf], journal: &mut Journal) -> AppResult<()> {
    let mut pending: Vec<PathBuf> = retire.to_vec();

    for (_, target) in parts {
        if !pending.contains(target) {
            pending.push(target.clone());
        }
    }

    for path in pending.into_iter().filter(|path| path.is_file()) {
        let old = sibling(&path, RETIRED_SUFFIX);

        remove_path(&old)?;
        rename_file(&path, &old)?;
        journal.retired.push((path, old));
    }

    for (part, target) in parts {
        rename_file(part, target)?;
        journal.placed.push(target.clone());
    }

    Ok(())
}

fn rollback(journal: &Journal) -> bool {
    let mut clean = true;

    for placed in journal.placed.iter().rev() {
        if let Err(error) = fs::remove_file(placed) {
            log::warn!("rollback: remove {}: {error}", placed.display());
            clean = false;
        }
    }

    for (original, old) in journal.retired.iter().rev() {
        if let Err(error) = fs::rename(old, original) {
            log::warn!("rollback: restore {}: {error}", original.display());
            clean = false;
        }
    }

    clean
}

pub fn recover_retired(dirs: &[PathBuf]) -> Vec<PathBuf> {
    let mut recovered = Vec::new();

    for retired in dirs.iter().flat_map(|dir| list_files(dir)) {
        let name = retired.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
        let Some(original) = name.strip_suffix(RETIRED_SUFFIX).map(|original| retired.with_file_name(original)) else {
            continue;
        };

        if original.exists() {
            continue;
        }

        match rename_file(&retired, &original) {
            Ok(()) => recovered.push(original),
            Err(error) => log::warn!("put back {}: {error}", original.display()),
        }
    }

    recovered
}

impl Staging {
    pub fn discard(&self) {
        for (part, _) in &self.parts {
            if part.exists() {
                if let Err(error) = fs::remove_file(part) {
                    log::warn!("discard {}: {error}", part.display());
                }
            }
        }
    }

    pub fn commit(self, retire: &[PathBuf]) -> AppResult<Vec<PathBuf>> {
        let mut journal = Journal::default();

        if let Err(error) = apply(&self.parts, retire, &mut journal) {
            let clean = rollback(&journal);

            self.discard();

            if !clean {
                return Err(AppError::coded(ErrorCode::RollbackFailed, error.to_string()));
            }

            return Err(error);
        }

        for (_, old) in &journal.retired {
            if let Err(error) = fs::remove_file(old) {
                log::warn!("remove the retired {}: {error}", old.display());
            }
        }

        Ok(journal.placed)
    }
}
