mod merge;
mod profiles;

use serde::{Deserialize, Serialize};

pub use merge::{merge_items, Side};
pub use profiles::{apply_profiles, local_profiles, ProfileSyncState, SyncProfile};

use crate::sets::{ComponentSet, Tombstone};

pub const SETS_PATH: &str = "/mod/me/sets";
pub const PROFILES_PATH: &str = "/mod/me/profiles";

pub trait Stamped {
    fn id(&self) -> &str;
    fn created(&self) -> f64;
    fn updated(&self) -> f64;
}

impl Stamped for ComponentSet {
    fn id(&self) -> &str {
        &self.id
    }

    fn created(&self) -> f64 {
        self.created
    }

    fn updated(&self) -> f64 {
        self.updated
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PutMode {
    Merge,
    Replace,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Resolution {
    Merge,
    KeepLocal,
    TakeRemote,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncOutcome {
    UpToDate,
    Pushed,
    Pulled,
    Merged,
    Conflict,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Step {
    Nothing,
    Put(PutMode),
    TakeRemote,
    Ask,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Decision {
    pub step: Step,
    pub outcome: SyncOutcome,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncBase {
    pub synced_at: Option<f64>,
    pub revision: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RemoteSets {
    #[serde(default)]
    pub sets: Vec<ComponentSet>,
    #[serde(default)]
    pub deleted: Vec<Tombstone>,
    #[serde(default)]
    pub revision: u64,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RemoteProfiles {
    #[serde(default)]
    pub profiles: Vec<SyncProfile>,
    #[serde(default)]
    pub deleted: Vec<Tombstone>,
    #[serde(default)]
    pub revision: u64,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SignedBody {
    pub device_id: String,
    pub account_id: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct PutProfiles<'a> {
    #[serde(flatten)]
    pub signed: SignedBody,
    pub profiles: &'a [SyncProfile],
    pub deleted: &'a [Tombstone],
    pub mode: PutMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySync {
    pub outcome: SyncOutcome,
    pub local: usize,
    pub remote: usize,
    pub local_changes: usize,
    pub remote_changes: usize,
}

pub fn local_changes<T: Stamped>(side: &Side<T>, synced_at: Option<f64>) -> usize {
    let Some(synced_at) = synced_at else {
        return side.items.len() + side.deleted.len();
    };

    side.items.iter().filter(|item| item.updated() > synced_at).count()
        + side.deleted.iter().filter(|tombstone| tombstone.deleted > synced_at).count()
}

pub fn remote_changes<T: Stamped + PartialEq>(local: &Side<T>, remote: &Side<T>) -> usize {
    let buried = |item: &T| local.deleted.iter().any(|tombstone| tombstone.id == item.id() && tombstone.deleted >= item.updated());
    let changed = remote.items.iter().filter(|item| !buried(item) && !local.items.iter().any(|known| known == *item)).count();
    let removed = local
        .items
        .iter()
        .filter(|item| remote.deleted.iter().any(|tombstone| tombstone.id == item.id() && tombstone.deleted >= item.updated()))
        .count();

    changed + removed
}

pub fn decide(local_changes: usize, remote_changes: usize, base: &SyncBase, revision: u64, resolution: Option<Resolution>) -> Decision {
    let remote_changed = remote_changes > 0 && base.revision != Some(revision);

    match (local_changes > 0, remote_changed, resolution) {
        (false, false, _) => Decision { step: Step::Nothing, outcome: SyncOutcome::UpToDate },
        (true, false, _) => Decision { step: Step::Put(PutMode::Merge), outcome: SyncOutcome::Pushed },
        (false, true, _) => Decision { step: Step::TakeRemote, outcome: SyncOutcome::Pulled },
        (true, true, None) => Decision { step: Step::Ask, outcome: SyncOutcome::Conflict },
        (true, true, Some(Resolution::Merge)) => Decision { step: Step::Put(PutMode::Merge), outcome: SyncOutcome::Merged },
        (true, true, Some(Resolution::KeepLocal)) => Decision { step: Step::Put(PutMode::Replace), outcome: SyncOutcome::Pushed },
        (true, true, Some(Resolution::TakeRemote)) => Decision { step: Step::TakeRemote, outcome: SyncOutcome::Pulled },
    }
}

#[cfg(test)]
mod tests;
