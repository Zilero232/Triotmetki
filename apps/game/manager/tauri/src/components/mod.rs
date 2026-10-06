use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::catalog::{Catalog, CatalogComponent};
use crate::detect::{GameClient, GameVersion};
use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::{ensure_within, list_files, move_file};
use crate::paths::same_path;
use crate::state::{component_id, disabled_dir, inno_name, mod_roots, Manifest, ModRootsInput, MODS_DIR};

pub const MANAGER_VERSION: &str = env!("MANAGER_VERSION");

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ComponentState {
    Enabled,
    Disabled,
    Missing,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledComponent {
    pub id: String,
    pub state: ComponentState,
    pub file: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Installation {
    pub installed: bool,
    pub client_path: PathBuf,
    pub game_version: GameVersion,
    pub manifest_game_version: Option<String>,
    pub mods_dir: PathBuf,
    pub modpack_version: Option<String>,
    pub installed_at: Option<String>,
    pub needs_migration: bool,
    pub components: Vec<InstalledComponent>,
}

#[derive(Clone, Copy)]
pub struct ClientContext<'a> {
    pub client_dir: &'a Path,
    pub client: &'a GameClient,
    pub catalog: &'a Catalog,
}

#[derive(Debug, Clone)]
struct PackageFile {
    path: PathBuf,
    name: String,
    version: Option<String>,
}

fn package_version(component: &CatalogComponent, file_name: &str) -> Option<String> {
    let stem = Path::new(file_name).file_stem()?.to_string_lossy().into_owned();
    let prefix = format!("{}_", component.package_id);

    stem.get(prefix.len()..).filter(|_| stem.to_lowercase().starts_with(&prefix.to_lowercase())).map(str::to_owned)
}

fn packages_in(dir: &Path, catalog: &Catalog) -> BTreeMap<String, PackageFile> {
    list_files(dir)
        .into_iter()
        .filter_map(|path| {
            let name = path.file_name()?.to_string_lossy().into_owned();
            let component = catalog.component_for_file(&name)?;
            let version = package_version(component, &name);

            Some((component.id.clone(), PackageFile { path, name, version }))
        })
        .collect()
}

pub fn read_installation(context: ClientContext) -> AppResult<Installation> {
    let manifest = Manifest::read(context.client_dir)?;
    let enabled = packages_in(&context.client.mods_dir, context.catalog);
    let disabled = packages_in(&disabled_dir(context.client_dir), context.catalog);
    let recorded: BTreeSet<String> = manifest.iter().flat_map(Manifest::component_ids).collect();
    let ids: BTreeSet<&String> = recorded.iter().chain(enabled.keys()).chain(disabled.keys()).collect();
    let order = |id: &str| context.catalog.components.iter().position(|component| component.id == id).unwrap_or(usize::MAX);
    let mut components: Vec<InstalledComponent> = ids
        .into_iter()
        .map(|id| {
            let (state, package) = match (enabled.get(id), disabled.get(id)) {
                (Some(package), _) => (ComponentState::Enabled, Some(package)),
                (None, Some(package)) => (ComponentState::Disabled, Some(package)),
                (None, None) => (ComponentState::Missing, None),
            };

            InstalledComponent {
                id: id.clone(),
                state,
                file: package.map(|package| package.name.clone()),
                version: package.and_then(|package| package.version.clone()),
            }
        })
        .collect();

    components.sort_by_key(|component| order(&component.id));

    let manifest_version = manifest.as_ref().map(|manifest| manifest.version.clone()).filter(|version| !version.is_empty());
    let needs_migration = manifest_version.as_deref().and_then(GameVersion::parse).is_some_and(|recorded| recorded != context.client.version);

    Ok(Installation {
        installed: manifest.is_some() || !enabled.is_empty(),
        client_path: context.client.path.clone(),
        game_version: context.client.version,
        manifest_game_version: manifest_version,
        mods_dir: context.client.mods_dir.clone(),
        modpack_version: manifest.as_ref().map(|manifest| manifest.modpack.clone()).filter(|version| !version.is_empty()),
        installed_at: manifest.as_ref().map(|manifest| manifest.date.clone()).filter(|date| !date.is_empty()),
        needs_migration,
        components,
    })
}

pub struct ToggleInput<'a> {
    pub context: ClientContext<'a>,
    pub component_id: &'a str,
    pub enabled: bool,
}

fn known_component<'a>(catalog: &'a Catalog, id: &str) -> AppResult<&'a CatalogComponent> {
    catalog.component(id).ok_or_else(|| AppError::coded(ErrorCode::UnknownComponent, format!("unknown component {id}")))
}

pub fn missing_for_enable(input: &ToggleInput) -> AppResult<Vec<String>> {
    known_component(input.context.catalog, input.component_id)?;

    let enabled = packages_in(&input.context.client.mods_dir, input.context.catalog);
    let disabled = packages_in(&disabled_dir(input.context.client_dir), input.context.catalog);

    Ok(input
        .context
        .catalog
        .with_dependencies([input.component_id])
        .into_iter()
        .filter(|id| !enabled.contains_key(id) && !disabled.contains_key(id))
        .collect())
}

fn undo_moves(moved: &[(PathBuf, PathBuf)]) {
    for (from, to) in moved.iter().rev() {
        if let Err(error) = move_file(to, from) {
            log::warn!("toggle rollback: {} -> {}: {error}", to.display(), from.display());
        }
    }
}

fn toggle_moves(input: &ToggleInput) -> AppResult<Vec<(String, PathBuf, PathBuf)>> {
    let catalog = input.context.catalog;
    let mods_dir = &input.context.client.mods_dir;
    let parked_dir = disabled_dir(input.context.client_dir);
    let enabled = packages_in(mods_dir, catalog);
    let disabled = packages_in(&parked_dir, catalog);

    known_component(catalog, input.component_id)?;

    if input.enabled {
        let missing = missing_for_enable(input)?;

        if !missing.is_empty() {
            return Err(AppError::coded(ErrorCode::NotInstalled, missing.join(",")));
        }

        return Ok(catalog
            .with_dependencies([input.component_id])
            .into_iter()
            .filter_map(|id| match (enabled.get(&id), disabled.get(&id)) {
                (None, Some(package)) => Some((id, package.path.clone(), mods_dir.join(&package.name))),
                _ => None,
            })
            .collect());
    }

    let targets = catalog.with_dependents(input.component_id);

    if let Some(required) = targets.iter().find(|id| catalog.component(id).is_some_and(|component| component.required)) {
        return Err(AppError::coded(ErrorCode::RequiredComponent, format!("{required} is required")));
    }

    Ok(targets.into_iter().filter_map(|id| enabled.get(&id).map(|package| (id, package.path.clone(), parked_dir.join(&package.name)))).collect())
}

pub fn set_enabled(input: ToggleInput) -> AppResult<Vec<String>> {
    let moves = toggle_moves(&input)?;
    let mut moved: Vec<(PathBuf, PathBuf)> = Vec::new();
    let mut changed = Vec::new();
    let mut outcome = Ok(());

    for (id, from, to) in moves {
        if let Err(error) = move_file(&from, &to) {
            undo_moves(&moved);
            outcome = Err(error);
            break;
        }

        moved.push((from, to));
        changed.push(id);
    }

    let synced = sync_manifest(input.context);

    outcome?;
    synced?;

    Ok(changed)
}

pub fn sync_manifest(context: ClientContext) -> AppResult<Manifest> {
    let catalog = context.catalog;
    let client = context.client;
    let enabled = packages_in(&client.mods_dir, catalog);
    let disabled = packages_in(&disabled_dir(context.client_dir), catalog);
    let mut manifest = Manifest::read(context.client_dir)?.unwrap_or_else(|| Manifest {
        client: client.path.clone(),
        modpack: catalog.modpack_version.clone(),
        date: now_text(),
        ..Manifest::default()
    });
    let mut names: Vec<String> = manifest.components.clone();

    for id in enabled.keys().chain(disabled.keys()) {
        if !names.iter().any(|name| component_id(name) == id) {
            let category = catalog.component(id).map(|component| component.category.as_str()).unwrap_or_default();

            names.push(inno_name(category, id));
        }
    }

    manifest.version = client.version.to_string();
    manifest.mods_dir = client.mods_dir.clone();
    manifest.components = names;
    manifest.files = enabled.values().map(|package| package.path.clone()).collect();
    manifest.disabled = disabled.keys().cloned().collect();
    manifest.manager = Some(MANAGER_VERSION.to_owned());
    manifest.write(context.client_dir)?;

    Ok(manifest)
}

pub fn is_owned(catalog: &Catalog, name: &str) -> bool {
    catalog.is_owned_file(name) || catalog.component_for_file(name).is_some()
}

pub fn in_mod_folders(context: ClientContext, path: &Path) -> bool {
    let Some(parent) = path.parent() else {
        return false;
    };
    let mods_root = context.client.path.join(MODS_DIR);
    let listed = same_path(parent, &context.client.mods_dir)
        || same_path(parent, &disabled_dir(context.client_dir))
        || parent.parent().is_some_and(|grandparent| same_path(grandparent, &mods_root));

    listed && ensure_within(path, &client_mod_roots(context)).is_ok()
}

pub fn client_mod_roots(context: ClientContext) -> Vec<PathBuf> {
    mod_roots(ModRootsInput { client_path: &context.client.path, client_dir: context.client_dir, mods_dir: &context.client.mods_dir })
}

pub fn now_text() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

#[cfg(test)]
mod tests;
