pub mod client_files;
pub mod generate;
pub mod packed_xml;
pub mod recipe;

use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub use recipe::{SkipReason, SkippedLook};

use crate::components::{read_installation, ClientContext, ComponentState};
use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::{file_sha256, list_files, remove_path, write_atomic};
use client_files::ClientFiles;
use generate::{BuildInput, Plan, PlanInput};

pub const GENERATOR_ID: &str = "hangar_looks";
pub const GENERATED_PACKAGE_ID: &str = "net.triotmetki.hangar_looks.gen";
pub const GENERATED_PREFIX: &str = "net.triotmetki.hangar_looks.gen_";
pub const GENERATED_EXTENSION: &str = "mtmod";
pub const RECIPES_ENTRY: &str = "res/mods/configs/otmetki/hangar_looks/recipes.json";
pub const MAX_RECIPES_BYTES: u64 = 1024 * 1024;
pub const STATE_FILE: &str = "generated.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HangarLooksState {
    None,
    Generated,
    Skipped,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedLookView {
    pub id: String,
    pub reason: SkipReason,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HangarLooksStatus {
    pub state: HangarLooksState,
    pub client_version: Option<String>,
    pub looks: Vec<String>,
    pub skipped: Vec<SkippedLookView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HangarLooksRecord {
    pub client_version: String,
    pub file: Option<String>,
    #[serde(default)]
    pub file_sha256: Option<String>,
    pub inputs_sha256: String,
    pub looks: Vec<String>,
    pub skipped: Vec<SkippedLook>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedState {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hangar_looks: Option<HangarLooksRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SyncOutcome {
    Off,
    Unchanged,
    Written,
    Empty,
}

pub fn is_generated_file(name: &str) -> bool {
    let lowered = name.to_lowercase();

    lowered.starts_with(GENERATED_PREFIX) && Path::new(&lowered).extension().is_some_and(|extension| extension == GENERATED_EXTENSION)
}

pub fn generated_file_name(client_version: &str) -> String {
    format!("{GENERATED_PREFIX}{client_version}.{GENERATED_EXTENSION}")
}

pub fn state_path(client_dir: &Path) -> PathBuf {
    client_dir.join(STATE_FILE)
}

pub fn read_state(client_dir: &Path) -> GeneratedState {
    fs::read(state_path(client_dir)).ok().and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default()
}

fn write_state(client_dir: &Path, state: &GeneratedState) -> AppResult<()> {
    if state.hangar_looks.is_none() {
        return remove_path(&state_path(client_dir));
    }

    write_atomic(&state_path(client_dir), &serde_json::to_vec_pretty(state)?)
}

pub fn status(client_dir: &Path, failure: bool, client_version: &str) -> HangarLooksStatus {
    if failure {
        return HangarLooksStatus {
            state: HangarLooksState::Failed,
            client_version: Some(client_version.to_owned()),
            looks: Vec::new(),
            skipped: Vec::new(),
        };
    }

    let Some(record) = read_state(client_dir).hangar_looks else {
        return HangarLooksStatus { state: HangarLooksState::None, client_version: None, looks: Vec::new(), skipped: Vec::new() };
    };
    let state = match (record.looks.is_empty(), record.skipped.is_empty()) {
        (false, _) => HangarLooksState::Generated,
        (true, false) => HangarLooksState::Skipped,
        (true, true) => HangarLooksState::None,
    };

    HangarLooksStatus {
        state,
        client_version: Some(record.client_version),
        looks: record.looks,
        skipped: record.skipped.into_iter().map(|skipped| SkippedLookView { id: skipped.id, reason: skipped.reason }).collect(),
    }
}

fn remove_generated(mods_dir: &Path, keep: Option<&str>) -> AppResult<()> {
    for path in list_files(mods_dir) {
        let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();

        if is_generated_file(&name) && keep.is_none_or(|keep| !name.eq_ignore_ascii_case(keep)) {
            remove_path(&path)?;
        }
    }

    Ok(())
}

fn generator_package(context: ClientContext) -> AppResult<Option<PathBuf>> {
    let Some(component) = context.catalog.components.iter().find(|component| component.generator.as_deref() == Some(GENERATOR_ID)) else {
        return Ok(None);
    };
    let installation = read_installation(context)?;

    Ok(installation
        .components
        .iter()
        .find(|installed| installed.id == component.id && installed.state == ComponentState::Enabled)
        .and_then(|installed| installed.file.as_deref())
        .map(|file| context.client.mods_dir.join(file)))
}

pub fn read_recipes(package: &Path) -> AppResult<Vec<u8>> {
    let mut archive = zip::ZipArchive::new(File::open(package)?)?;
    let index = (0..archive.len())
        .find(|index| archive.name_for_index(*index).is_some_and(|name| name.replace('\\', "/").eq_ignore_ascii_case(RECIPES_ENTRY)))
        .ok_or_else(|| AppError::coded(ErrorCode::NotInstalled, format!("{} has no {RECIPES_ENTRY}", package.display())))?;
    let mut bytes = Vec::new();

    archive.by_index(index)?.take(MAX_RECIPES_BYTES + 1).read_to_end(&mut bytes)?;

    if bytes.len() as u64 > MAX_RECIPES_BYTES {
        return Err(AppError::coded(ErrorCode::Io, format!("{RECIPES_ENTRY} is larger than {MAX_RECIPES_BYTES} bytes")));
    }

    Ok(bytes)
}

fn is_current(record: Option<&HangarLooksRecord>, plan: &Plan, target: &Path, client_version: &str) -> bool {
    let Some(record) = record.filter(|record| record.inputs_sha256 == plan.inputs_sha256 && record.client_version == client_version) else {
        return false;
    };

    match (&record.file, &record.file_sha256) {
        (Some(_), Some(expected)) => file_sha256(target).is_ok_and(|actual| actual.eq_ignore_ascii_case(expected)),
        (None, _) => !target.exists(),
        (Some(_), None) => false,
    }
}

fn now() -> String {
    chrono::Local::now().to_rfc3339()
}

pub fn sync(context: ClientContext) -> AppResult<SyncOutcome> {
    let client = context.client;
    let client_version = client.version.to_string();
    let file_name = generated_file_name(&client_version);
    let target = client.mods_dir.join(&file_name);

    remove_generated(&client.mods_dir, Some(&file_name))?;

    let Some(package) = generator_package(context)? else {
        remove_path(&target)?;
        write_state(context.client_dir, &GeneratedState::default())?;

        return Ok(SyncOutcome::Off);
    };
    let recipes = read_recipes(&package)?;
    let files = ClientFiles::open(client);
    let plan =
        generate::plan(PlanInput { files: &files, recipes: &recipes, disabled: &context.catalog.disabled_looks, client_version: &client_version })?;
    let state = read_state(context.client_dir);

    if is_current(state.hangar_looks.as_ref(), &plan, &target, &client_version) {
        return Ok(SyncOutcome::Unchanged);
    }

    let looks = plan.looks();
    let (outcome, file, file_sha256) = if looks.is_empty() {
        remove_path(&target)?;

        (SyncOutcome::Empty, None, None)
    } else {
        generate::build(BuildInput { files: &files, plan: &plan, client_version: &client_version, target: &target })?;

        (SyncOutcome::Written, Some(file_name), Some(file_sha256(&target)?))
    };
    let record =
        HangarLooksRecord { client_version, file, file_sha256, inputs_sha256: plan.inputs_sha256, looks, skipped: plan.skipped, generated_at: now() };

    write_state(context.client_dir, &GeneratedState { hangar_looks: Some(record) })?;

    Ok(outcome)
}

#[cfg(test)]
mod tests;
