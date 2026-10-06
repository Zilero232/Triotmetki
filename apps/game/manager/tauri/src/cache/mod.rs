use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use walkdir::WalkDir;

use crate::detect::GameClient;
use crate::fsx::{dir_size, remove_path};

pub const LESTA_FOLDER: &str = "Lesta";
pub const PROFILE_PREFIX: &str = "MirTankov";
pub const PREFERENCES_XML: &str = "preferences.xml";
pub const GAME_ID_PREFIX: &str = "game";
pub const APP_DATA_CACHE_DIRS: [&str; 13] = [
    "web_cache",
    "dossier_cache",
    "custom_data",
    "account_caches",
    "collections_cache",
    "lobby_cdn_cache",
    "offers_cache",
    "external_cache",
    "clan_cache",
    "game_loading_cache_mt",
    "profile/cef_cache/Cache",
    "profile/cef_cache/Code Cache",
    "profile/cef_cache/GPUCache",
];
pub const GAME_CACHE_DIRS: [&str; 2] = ["win64/Reports", "win64/logs"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CacheLocation {
    AppData,
    Game,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheTarget {
    pub id: String,
    pub name: String,
    pub location: CacheLocation,
    pub path: PathBuf,
    pub size_bytes: u64,
    pub files: usize,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CachePlan {
    pub targets: Vec<CacheTarget>,
    pub total_bytes: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheResult {
    pub freed_bytes: u64,
    pub cleared: Vec<String>,
    pub failed: Vec<String>,
}

pub struct PlanInput<'a> {
    pub app_data: &'a Path,
    pub client: &'a GameClient,
}

pub fn profile_dirs(app_data: &Path) -> Vec<PathBuf> {
    let Some(lesta) = real_dir_below(app_data, LESTA_FOLDER) else {
        return Vec::new();
    };
    let mut found: Vec<PathBuf> = fs::read_dir(lesta)
        .map(|entries| {
            entries
                .filter_map(Result::ok)
                .filter(|entry| entry.file_name().to_string_lossy().starts_with(PROFILE_PREFIX))
                .map(|entry| entry.path())
                .filter(|dir| is_real_dir(dir) && dir.join(PREFERENCES_XML).is_file())
                .collect()
        })
        .unwrap_or_default();

    found.sort();
    found
}

fn real_dir_below(root: &Path, relative: &str) -> Option<PathBuf> {
    relative.split('/').try_fold(root.to_path_buf(), |path, part| {
        let next = path.join(part);

        is_real_dir(&next).then_some(next)
    })
}

fn file_count(dir: &Path) -> usize {
    WalkDir::new(dir).follow_links(false).into_iter().filter_map(Result::ok).filter(|entry| entry.file_type().is_file()).count()
}

fn is_real_dir(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|metadata| metadata.is_dir() && !metadata.file_type().is_symlink())
}

struct TargetInput {
    id: String,
    name: String,
    location: CacheLocation,
    path: Option<PathBuf>,
}

fn target(input: TargetInput) -> Option<CacheTarget> {
    let TargetInput { id, name, location, path } = input;
    let path = path?;
    let files = file_count(&path);

    (files > 0).then(|| CacheTarget { id, name, location, size_bytes: dir_size(&path), files, path })
}

pub fn plan(input: PlanInput) -> CachePlan {
    let mut targets = Vec::new();

    for profile in profile_dirs(input.app_data) {
        let profile_name = profile.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();

        for relative in APP_DATA_CACHE_DIRS {
            targets.extend(target(TargetInput {
                id: format!("{profile_name}/{relative}"),
                name: relative.to_owned(),
                location: CacheLocation::AppData,
                path: real_dir_below(&profile, relative),
            }));
        }
    }

    for relative in GAME_CACHE_DIRS {
        targets.extend(target(TargetInput {
            id: format!("{GAME_ID_PREFIX}/{relative}"),
            name: relative.to_owned(),
            location: CacheLocation::Game,
            path: real_dir_below(&input.client.path, relative),
        }));
    }

    CachePlan { total_bytes: targets.iter().map(|target| target.size_bytes).sum(), targets }
}

fn empty_dir(dir: &Path) -> bool {
    if !is_real_dir(dir) {
        return false;
    }

    let children: Vec<PathBuf> =
        fs::read_dir(dir).map(|entries| entries.filter_map(Result::ok).map(|entry| entry.path()).collect()).unwrap_or_default();
    let mut cleared = true;

    for child in children {
        let is_link = fs::symlink_metadata(&child).map(|metadata| metadata.file_type().is_symlink()).unwrap_or(true);

        if is_link || remove_path(&child).is_err() {
            cleared = false;
        }
    }

    cleared
}

pub fn clear(plan: &CachePlan, ids: &[String]) -> CacheResult {
    let mut result = CacheResult::default();

    for target in plan.targets.iter().filter(|target| ids.contains(&target.id)) {
        let cleared = empty_dir(&target.path);

        result.freed_bytes += target.size_bytes.saturating_sub(dir_size(&target.path));

        if cleared {
            result.cleared.push(target.id.clone());
        } else {
            result.failed.push(target.id.clone());
        }
    }

    result
}

#[cfg(test)]
mod tests;
