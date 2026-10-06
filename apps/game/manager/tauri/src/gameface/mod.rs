mod pyjson;

use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};

use serde::Serialize;

pub use pyjson::{KeyOrders, MergeError, ResourceMap};

use crate::conflicts::{package_files, read_package};
use crate::detect::client::{Branch, PATHS_XML};
use crate::detect::GameClient;
use crate::fsx::{remove_path, write_atomic};
use crate::paths::{join_relative, same_path};
use crate::text::{decode_text, Fallback};

pub const GAMEFACE_PACKAGE_ID: &str = "net.openwg.gameface";
pub const SUPPORTED_VERSIONS: [&str; 1] = ["1.2.2"];
pub const LESTA_REALM: &str = "RU";
pub const RES_MAP_FILE: &str = "gui/unbound/gen/res_map.json";
pub const CONFIGS_DIR: &str = "mods/configs/res_map";
pub const PACKAGE_CONFIGS_DIR: &str = "res/mods/configs/res_map/";
pub const GAME_PACKAGES_DIR: &str = "res/packages";
pub const GAME_RES_DIR: &str = "res";
pub const GUI_PACKAGE_PREFIX: &str = "gui-part";
pub const CONFIG_EXTENSION: &str = ".json";
pub const META_XML: &str = "meta.xml";
pub const META_VERSION: &str = "version";
pub const MAX_META_BYTES: u64 = 64 * 1024;
pub const MAX_CONFIG_BYTES: u64 = 16 * 1024 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ResMapOutcome {
    NoGameface,
    Unchanged,
    Written,
    Removed,
    Skipped,
}

impl ResMapOutcome {
    pub fn restart_expected(self) -> bool {
        self == ResMapOutcome::Skipped
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GamefaceStatus {
    pub restart_expected: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum SkipReason {
    #[error("OpenWG Gameface {0} is not a version whose res_map merge is known")]
    UnknownVersion(String),
    #[error("more than one OpenWG Gameface package is installed")]
    SeveralGamefaces,
    #[error("the client is not a Lesta release client")]
    NotLesta,
    #[error("paths.xml names no existing folder")]
    NoResModsDir,
    #[error("the game packages carry no res_map.json")]
    NoGameResMap,
    #[error("a package cannot be read: {0}")]
    Unreadable(String),
    #[error("several packages carry res_map configs, their order in the game's file system is unknown")]
    AmbiguousOrder,
    #[error("{0}")]
    Merge(#[from] MergeError),
    #[error("cannot write the res_map: {0}")]
    Write(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Gameface {
    pub path: PathBuf,
    pub version: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MergeInputs {
    pub game: Vec<u8>,
    pub configs: Vec<Vec<u8>>,
    pub written: Option<Vec<u8>>,
}

pub fn merge(inputs: &MergeInputs) -> Result<String, MergeError> {
    let mut map = ResourceMap::from_game(&inputs.game)?;
    let mut orders = KeyOrders::known();

    for config in &inputs.configs {
        map.add_config(config)?;
    }

    if let Some(written) = &inputs.written {
        map.learn_from(&mut orders, written)?;
    }

    map.dumps(&orders)
}

fn read_limited(entry: impl Read, limit: u64) -> Option<String> {
    let mut text = String::new();

    entry.take(limit).read_to_string(&mut text).ok().map(|_| text)
}

fn meta_version(path: &Path) -> Option<String> {
    let mut archive = zip::ZipArchive::new(File::open(path).ok()?).ok()?;
    let text = read_limited(archive.by_name(META_XML).ok()?, MAX_META_BYTES)?;
    let document = roxmltree::Document::parse(text.trim_start_matches('\u{feff}')).ok()?;
    let version = document.descendants().find(|node| node.has_tag_name(META_VERSION))?.text()?.trim().to_owned();

    (!version.is_empty()).then_some(version)
}

pub fn find_gameface(mods_dir: &Path) -> Result<Option<Gameface>, SkipReason> {
    let found: Vec<PathBuf> =
        package_files(mods_dir).into_iter().filter(|path| read_package(path).package_id.eq_ignore_ascii_case(GAMEFACE_PACKAGE_ID)).collect();

    match found.as_slice() {
        [] => Ok(None),
        [path] => {
            let version = meta_version(path).unwrap_or_default();

            if SUPPORTED_VERSIONS.contains(&version.as_str()) {
                Ok(Some(Gameface { path: path.clone(), version }))
            } else {
                Err(SkipReason::UnknownVersion(version))
            }
        }
        _ => Err(SkipReason::SeveralGamefaces),
    }
}

fn path_entries(game_dir: &Path) -> Vec<String> {
    let text = fs::read(game_dir.join(PATHS_XML)).map(|bytes| decode_text(&bytes, Fallback::Lossy)).unwrap_or_default();
    let Ok(document) = roxmltree::Document::parse(text.trim_start_matches('\u{feff}')) else {
        return Vec::new();
    };
    let Some(paths) = document.descendants().find(|node| node.has_tag_name("Paths")) else {
        return Vec::new();
    };

    paths.children().filter(|node| node.is_element()).map(|node| node.text().unwrap_or_default().trim().to_owned()).collect()
}

pub fn res_map_dir(game_dir: &Path) -> Option<PathBuf> {
    path_entries(game_dir)
        .into_iter()
        .filter(|entry| !entry.is_empty())
        .filter_map(|entry| join_relative(game_dir, &entry).filter(|dir| dir.is_dir()).map(|_| entry.replace("./", "")))
        .next()
        .and_then(|relative| join_relative(game_dir, &relative))
}

fn read_zip_entry(path: &Path, wanted: impl Fn(&str) -> bool) -> Result<Vec<(String, Vec<u8>)>, SkipReason> {
    let unreadable = |error: &dyn std::fmt::Display| SkipReason::Unreadable(format!("{}: {error}", path.display()));
    let mut archive = zip::ZipArchive::new(File::open(path).map_err(|error| unreadable(&error))?).map_err(|error| unreadable(&error))?;
    let indexes: Vec<usize> = (0..archive.len()).filter(|index| archive.name_for_index(*index).is_some_and(&wanted)).collect();
    let mut found = Vec::new();

    for index in indexes {
        let mut entry = archive.by_index(index).map_err(|error| unreadable(&error))?;

        if entry.is_file() {
            let name = entry.name().to_owned();
            let mut bytes = Vec::new();

            entry.by_ref().take(MAX_CONFIG_BYTES + 1).read_to_end(&mut bytes).map_err(|error| unreadable(&error))?;

            if bytes.len() as u64 > MAX_CONFIG_BYTES {
                return Err(unreadable(&format!("{name} is larger than {MAX_CONFIG_BYTES} bytes")));
            }

            found.push((name, bytes));
        }
    }

    Ok(found)
}

pub fn game_res_map(game_dir: &Path) -> Result<Vec<u8>, SkipReason> {
    let packages_dir = game_dir.join(GAME_PACKAGES_DIR);
    let packages: Vec<PathBuf> = fs::read_dir(&packages_dir)
        .map(|entries| {
            entries
                .filter_map(Result::ok)
                .filter(|entry| entry.file_name().to_string_lossy().starts_with(GUI_PACKAGE_PREFIX))
                .map(|entry| entry.path())
                .collect()
        })
        .unwrap_or_default();

    for package in packages.iter().filter(|path| path.is_file()) {
        let found = read_zip_entry(package, |name| name.eq_ignore_ascii_case(RES_MAP_FILE))?;

        if let Some((_, bytes)) = found.into_iter().next().filter(|(_, bytes)| !bytes.is_empty()) {
            return Ok(bytes);
        }
    }

    Err(SkipReason::NoGameResMap)
}

fn config_name(entry: &str) -> Option<String> {
    let lower = entry.replace('\\', "/").to_lowercase();
    let name = lower.strip_prefix(PACKAGE_CONFIGS_DIR)?;

    (!name.is_empty() && !name.contains('/')).then(|| name.to_owned())
}

fn fs_configs(game_dir: &Path) -> Vec<(String, PathBuf)> {
    fs::read_dir(game_dir.join(CONFIGS_DIR))
        .map(|entries| {
            entries
                .filter_map(Result::ok)
                .map(|entry| (entry.file_name().to_string_lossy().into_owned(), entry.path()))
                .filter(|(name, path)| name.ends_with(CONFIG_EXTENSION) && path.is_file())
                .collect()
        })
        .unwrap_or_default()
}

fn loose_vfs_configs(dir: &Path) -> Vec<(String, Vec<u8>)> {
    fs::read_dir(dir.join(CONFIGS_DIR))
        .map(|entries| {
            entries
                .filter_map(Result::ok)
                .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_file()))
                .filter_map(|entry| fs::read(entry.path()).ok().map(|bytes| (entry.file_name().to_string_lossy().to_lowercase(), bytes)))
                .collect()
        })
        .unwrap_or_default()
}

pub struct ConfigSources<'a> {
    pub game_dir: &'a Path,
    pub res_mods_dir: &'a Path,
    pub mods_dir: &'a Path,
    pub package_mask: &'a str,
}

fn mounted_packages(mods_dir: &Path, package_mask: &str) -> Vec<PathBuf> {
    let extension = package_mask.strip_prefix("*.").unwrap_or(package_mask).to_lowercase();

    package_files(mods_dir)
        .into_iter()
        .filter(|path| path.extension().is_some_and(|found| found.to_string_lossy().to_lowercase() == extension))
        .collect()
}

pub fn configs(sources: ConfigSources) -> Result<Vec<Vec<u8>>, SkipReason> {
    let on_disk = fs_configs(sources.game_dir);
    let taken: Vec<String> = on_disk.iter().map(|(name, _)| name.to_lowercase()).collect();
    let mut packaged: Vec<(String, Vec<u8>)> = loose_vfs_configs(sources.res_mods_dir);

    packaged.extend(loose_vfs_configs(&sources.game_dir.join(GAME_RES_DIR)));

    for package in mounted_packages(sources.mods_dir, sources.package_mask) {
        for (entry, bytes) in read_zip_entry(&package, |name| config_name(name).is_some())? {
            packaged.extend(config_name(&entry).map(|name| (name, bytes)));
        }
    }

    packaged.retain(|(name, _)| !taken.contains(name));
    packaged.sort();
    packaged.dedup();

    let mut names: Vec<&str> = packaged.iter().map(|(name, _)| name.as_str()).collect();

    names.dedup();

    if names.len() != packaged.len() || packaged.len() > 1 {
        return Err(SkipReason::AmbiguousOrder);
    }

    let mut read = Vec::new();

    for (_, path) in &on_disk {
        read.push(fs::read(path).map_err(|error| SkipReason::Unreadable(format!("{}: {error}", path.display())))?);
    }

    read.extend(packaged.into_iter().map(|(_, bytes)| bytes));

    Ok(read)
}

fn apply(target: &Path, merged: Option<String>) -> Result<ResMapOutcome, SkipReason> {
    let write_error = |error: crate::error::AppError| SkipReason::Write(error.to_string());

    match merged {
        None if target.is_file() => {
            remove_path(target).map_err(write_error)?;

            Ok(ResMapOutcome::Removed)
        }
        None => Ok(ResMapOutcome::Unchanged),
        Some(text) if fs::read(target).is_ok_and(|current| current == text.as_bytes()) => Ok(ResMapOutcome::Unchanged),
        Some(text) => {
            write_atomic(target, text.as_bytes()).map_err(write_error)?;

            Ok(ResMapOutcome::Written)
        }
    }
}

pub fn premerge(client: &GameClient) -> Result<ResMapOutcome, SkipReason> {
    if find_gameface(&client.mods_dir)?.is_none() {
        return Ok(ResMapOutcome::NoGameface);
    }

    if client.branch != Branch::Release || client.realm.as_deref().is_some_and(|realm| realm != LESTA_REALM) {
        return Err(SkipReason::NotLesta);
    }

    let target = res_map_dir(&client.path)
        .filter(|dir| same_path(dir, &client.res_mods_dir) || same_path(dir, &client.mods_dir))
        .ok_or(SkipReason::NoResModsDir)?
        .join(RES_MAP_FILE);
    let configs = configs(ConfigSources {
        game_dir: &client.path,
        res_mods_dir: &client.res_mods_dir,
        mods_dir: &client.mods_dir,
        package_mask: &client.package_mask,
    })?;
    let merged = if configs.is_empty() {
        None
    } else {
        Some(merge(&MergeInputs { game: game_res_map(&client.path)?, configs, written: fs::read(&target).ok() })?)
    };

    apply(&target, merged)
}

pub fn sync(client: &GameClient) -> ResMapOutcome {
    match premerge(client) {
        Ok(outcome) => {
            log::info!("res_map for {}: {outcome:?}", client.path.display());

            outcome
        }
        Err(reason) => {
            log::warn!("res_map for {}: skipped, OpenWG Gameface will restart the client once: {reason}", client.path.display());

            ResMapOutcome::Skipped
        }
    }
}

#[cfg(test)]
mod tests;
