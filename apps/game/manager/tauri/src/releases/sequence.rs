use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use crate::error::AppResult;
use crate::fsx::{rename_file, sibling, write_atomic};

pub const SEQUENCES_FILE: &str = "release-sequences.json";
pub const CORRUPT_SUFFIX: &str = ".corrupt";
pub const GAME_LINE_PARTS: usize = 2;
pub const GAME_PART_SEPARATOR: char = '.';

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Freshness {
    Newer,
    Same,
    Older,
}

pub struct SequenceInput<'a> {
    pub seen: &'a BTreeMap<String, u64>,
    pub game: &'a str,
    pub sequence: u64,
}

pub fn game_line(game: &str) -> String {
    let parts: Vec<&str> = game.trim().split(GAME_PART_SEPARATOR).take(GAME_LINE_PARTS).collect();

    parts.join(&GAME_PART_SEPARATOR.to_string())
}

pub fn check_sequence(input: SequenceInput) -> Freshness {
    let highest = input.seen.get(&game_line(input.game)).copied().unwrap_or_default();

    match input.sequence.cmp(&highest) {
        std::cmp::Ordering::Greater => Freshness::Newer,
        std::cmp::Ordering::Equal => Freshness::Same,
        std::cmp::Ordering::Less => Freshness::Older,
    }
}

pub fn by_game_line(seen: BTreeMap<String, u64>) -> BTreeMap<String, u64> {
    let mut lines = BTreeMap::new();

    for (game, sequence) in seen {
        let highest: &mut u64 = lines.entry(game_line(&game)).or_default();

        *highest = (*highest).max(sequence);
    }

    lines
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

fn set_aside(path: &Path) {
    let aside = sibling(path, CORRUPT_SUFFIX);

    if let Err(error) = rename_file(path, &aside) {
        log::warn!("set the unreadable {} aside: {error}", path.display());
    }
}

fn read_seen(path: &Path) -> BTreeMap<String, u64> {
    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return BTreeMap::new(),
        Err(error) => {
            log::error!("the release sequences in {} are unreadable ({error}); only releases verified from now on are remembered", path.display());

            return BTreeMap::new();
        }
    };

    match serde_json::from_slice::<BTreeMap<String, u64>>(&bytes) {
        Ok(seen) => by_game_line(seen),
        Err(error) => {
            log::error!(
                "the release sequences in {} are corrupt ({error}); treating it as tampering, setting it aside and remembering only releases verified from now on",
                path.display()
            );
            set_aside(path);

            BTreeMap::new()
        }
    }
}

impl SequenceStore {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into(), lock: Arc::new(Mutex::new(())) }
    }

    pub fn remember(&self, input: RememberInput) -> AppResult<Freshness> {
        let _guard = self.lock.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        let mut seen = read_seen(&self.path);
        let freshness = check_sequence(SequenceInput { seen: &seen, game: input.game, sequence: input.sequence });

        match freshness {
            Freshness::Older => {
                log::warn!(
                    "release {} for {} is signed at {}, before a release already seen for it; it is not offered",
                    input.version,
                    input.game,
                    input.sequence
                );
            }
            Freshness::Newer => {
                seen.insert(game_line(input.game), input.sequence);
                write_atomic(&self.path, &serde_json::to_vec_pretty(&seen)?)?;
            }
            Freshness::Same => {}
        }

        Ok(freshness)
    }
}
