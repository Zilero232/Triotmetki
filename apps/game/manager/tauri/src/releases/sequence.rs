use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::write_atomic;

pub const SEQUENCES_FILE: &str = "release-sequences.json";

pub struct SequenceInput<'a> {
    pub seen: &'a BTreeMap<String, u64>,
    pub game: &'a str,
    pub version: &'a str,
    pub sequence: u64,
}

pub fn check_sequence(input: SequenceInput) -> AppResult<bool> {
    let highest = input.seen.get(input.game).copied().unwrap_or_default();

    if input.sequence < highest {
        log::warn!("release {} for {} is signed at {}, older than the {highest} already seen", input.version, input.game, input.sequence);

        return Err(AppError::coded(
            ErrorCode::SignatureInvalid,
            format!("release {} is older than one already offered for {}", input.version, input.game),
        ));
    }

    Ok(input.sequence > highest)
}

#[derive(Clone)]
pub struct SequenceStore {
    path: PathBuf,
    lock: Arc<Mutex<()>>,
}

pub struct RememberInput<'a> {
    pub game: &'a str,
    pub version: &'a str,
    pub sequence: u64,
}

fn read_seen(path: &Path) -> BTreeMap<String, u64> {
    std::fs::read(path).ok().and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default()
}

impl SequenceStore {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into(), lock: Arc::new(Mutex::new(())) }
    }

    pub fn remember(&self, input: RememberInput) -> AppResult<()> {
        let _guard = self.lock.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let mut seen = read_seen(&self.path);
        let raised = check_sequence(SequenceInput { seen: &seen, game: input.game, version: input.version, sequence: input.sequence })?;

        if raised {
            seen.insert(input.game.to_owned(), input.sequence);
            write_atomic(&self.path, &serde_json::to_vec_pretty(&seen)?)?;
        }

        Ok(())
    }
}
