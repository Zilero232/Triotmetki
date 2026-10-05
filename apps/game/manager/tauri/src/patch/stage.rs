use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::{file_sha256, remove_path, rename_file, sibling, write_atomic, write_file, PART_SUFFIX, RETIRED_SUFFIX};
use crate::releases::safe_file_name;

pub const COMMIT_JOURNAL: &str = "commit-journal.json";

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

#[derive(Debug, Default, Serialize, Deserialize)]
struct Journal {
    retired: Vec<(PathBuf, PathBuf)>,
    placed: Vec<(PathBuf, PathBuf)>,
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

fn plan(parts: &[(PathBuf, PathBuf)], retire: &[PathBuf]) -> Journal {
    let mut pending: Vec<PathBuf> = retire.to_vec();

    for (_, target) in parts {
        if !pending.contains(target) {
            pending.push(target.clone());
        }
    }

    Journal {
        retired: pending
            .into_iter()
            .filter(|path| path.is_file())
            .map(|path| {
                let old = sibling(&path, RETIRED_SUFFIX);

                (path, old)
            })
            .collect(),
        placed: parts.to_vec(),
    }
}

fn apply(plan: &Journal, progress: &mut Journal) -> AppResult<()> {
    for (path, old) in &plan.retired {
        remove_path(old)?;
        rename_file(path, old)?;
        progress.retired.push((path.clone(), old.clone()));
    }

    for (part, target) in &plan.placed {
        rename_file(part, target)?;
        progress.placed.push((part.clone(), target.clone()));
    }

    Ok(())
}

fn rollback(journal: &Journal) -> bool {
    let mut clean = true;

    for (_, placed) in journal.placed.iter().rev() {
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

pub fn commit_journal(client_dir: &Path) -> PathBuf {
    client_dir.join(COMMIT_JOURNAL)
}

fn undo_placed(part: &Path, target: &Path) -> AppResult<()> {
    if sibling(target, PART_SUFFIX) != part {
        return Ok(());
    }

    if part.is_file() {
        fs::remove_file(part)?;
    } else if target.is_file() {
        fs::remove_file(target)?;
    }

    Ok(())
}

fn undo_retired(original: &Path, old: &Path) -> AppResult<()> {
    if sibling(original, RETIRED_SUFFIX) != old || !old.is_file() {
        return Ok(());
    }

    if original.exists() {
        fs::remove_file(old)?;
    } else {
        fs::rename(old, original)?;
    }

    Ok(())
}

pub fn recover_commit(journal_path: &Path) -> AppResult<bool> {
    let bytes = match fs::read(journal_path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(error) => return Err(error.into()),
    };

    if let Ok(journal) = serde_json::from_slice::<Journal>(&bytes) {
        for (part, target) in journal.placed.iter().rev() {
            undo_placed(part, target)?;
        }

        for (original, old) in journal.retired.iter().rev() {
            undo_retired(original, old)?;
        }
    } else {
        log::warn!("unreadable commit journal {}", journal_path.display());
    }

    remove_path(journal_path)?;

    Ok(true)
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

    pub fn commit(self, journal_path: &Path, retire: &[PathBuf]) -> AppResult<Vec<PathBuf>> {
        let plan = plan(&self.parts, retire);

        if let Err(error) = recover_commit(journal_path).and_then(|_| write_atomic(journal_path, &serde_json::to_vec(&plan)?)) {
            self.discard();

            return Err(error);
        }

        let mut progress = Journal::default();

        if let Err(error) = apply(&plan, &mut progress) {
            let clean = rollback(&progress);

            self.discard();

            if !clean {
                return Err(AppError::coded(ErrorCode::RollbackFailed, error.to_string()));
            }

            if let Err(cleanup) = remove_path(journal_path) {
                log::warn!("remove the commit journal: {cleanup}");
            }

            return Err(error);
        }

        if let Err(error) = remove_path(journal_path) {
            log::warn!("remove the commit journal: {error}");
        }

        for (_, old) in &progress.retired {
            if let Err(error) = fs::remove_file(old) {
                log::warn!("remove the retired {}: {error}", old.display());
            }
        }

        Ok(progress.placed.into_iter().map(|(_, target)| target).collect())
    }
}
