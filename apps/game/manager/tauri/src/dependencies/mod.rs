use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use walkdir::WalkDir;

use crate::catalog::{Catalog, DependencyComponent, PACKAGE_EXTENSIONS};
use crate::components::{in_mod_folders, sync_manifest, ClientContext};
use crate::error::AppResult;
use crate::fsx::{copy_verified, file_sha256, remove_path, write_atomic};
use crate::patch::{commit_journal, stage, StagedFile};
use crate::paths::same_path;
use crate::releases::{safe_file_name, verify_sha256, FetchLimits, ReleasesClient, MAX_NOTICE_BYTES, MAX_PACKAGE_BYTES};
use crate::state::{DependencyOwner, DependencyRecord, Manifest};

pub const NOTICES_DIR: &str = "notices";
pub const LICENCE_FILE: &str = "LICENSE";
pub const SEARCH_DEPTH: usize = 4;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DependencyState {
    Missing,
    Ours,
    Outdated,
    User,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DependencyStatus {
    pub id: String,
    pub state: DependencyState,
    pub file: Option<String>,
}

#[derive(Debug, Clone)]
pub struct FetchedDependency {
    pub dependency: DependencyComponent,
    pub bytes: Vec<u8>,
    pub licence: Vec<u8>,
}

pub struct ResolveInput<'a> {
    pub catalog: &'a Catalog,
    pub components: &'a BTreeSet<String>,
}

pub struct InstallDependenciesInput<'a> {
    pub context: ClientContext<'a>,
    pub wanted: &'a BTreeSet<String>,
    pub fetched: &'a [FetchedDependency],
}

pub struct CarryInput<'a> {
    pub context: ClientContext<'a>,
    pub from_mods_dir: &'a Path,
}

pub struct UpdatesInput<'a> {
    pub context: ClientContext<'a>,
    pub from_mods_dir: Option<&'a Path>,
}

pub fn resolve(input: ResolveInput) -> BTreeSet<String> {
    input
        .catalog
        .dependencies
        .iter()
        .filter(|dependency| dependency.required_by.iter().any(|id| input.components.contains(id)))
        .map(|dependency| dependency.id.clone())
        .collect()
}

pub fn needed_to_enable(catalog: &Catalog, component_id: &str) -> BTreeSet<String> {
    let mut needed = resolve(ResolveInput { catalog, components: &catalog.with_dependencies([component_id]) });

    needed.retain(|id| catalog.dependency(id).is_some_and(|dependency| !dependency.optional));

    needed
}

pub fn is_copy_of(dependency: &DependencyComponent, file_name: &str) -> bool {
    let lowered = file_name.to_lowercase();
    let path = Path::new(&lowered);
    let extension = path.extension().map(|extension| extension.to_string_lossy().into_owned());
    let stem = path.file_stem().map(|stem| stem.to_string_lossy().into_owned()).unwrap_or_default();
    let package_id = dependency.package_id.to_lowercase();

    extension.is_some_and(|extension| PACKAGE_EXTENSIONS.contains(&extension.as_str()))
        && (stem == package_id || stem.strip_prefix(&package_id).is_some_and(|rest| rest.starts_with('_')))
}

pub fn find_copies(mods_dir: &Path, dependency: &DependencyComponent) -> Vec<PathBuf> {
    let mut found: Vec<PathBuf> = WalkDir::new(mods_dir)
        .max_depth(SEARCH_DEPTH)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file() && is_copy_of(dependency, &entry.file_name().to_string_lossy()))
        .map(|entry| entry.into_path())
        .collect();

    found.sort();
    found
}

fn owned_file(mods_dir: &Path, record: &DependencyRecord) -> Option<PathBuf> {
    let name = safe_file_name(&record.file).ok()?;
    let path = mods_dir.join(name);
    let intact =
        record.owner == DependencyOwner::Ours && path.is_file() && file_sha256(&path).is_ok_and(|sha| sha.eq_ignore_ascii_case(&record.sha256));

    intact.then_some(path)
}

pub fn inspect(mods_dir: &Path, manifest: Option<&Manifest>, dependency: &DependencyComponent) -> DependencyStatus {
    let record = manifest.and_then(|manifest| manifest.dependency(&dependency.id));
    let status = |state, file: Option<String>| DependencyStatus { id: dependency.id.clone(), state, file };

    if let Some(record) = record.filter(|record| owned_file(mods_dir, record).is_some()) {
        let current = record.file == dependency.file && record.sha256.eq_ignore_ascii_case(&dependency.sha256);

        return status(if current { DependencyState::Ours } else { DependencyState::Outdated }, Some(record.file.clone()));
    }

    match find_copies(mods_dir, dependency).first() {
        Some(copy) => status(DependencyState::User, copy.file_name().map(|name| name.to_string_lossy().into_owned())),
        None => status(DependencyState::Missing, None),
    }
}

pub fn statuses(context: ClientContext) -> AppResult<Vec<DependencyStatus>> {
    let manifest = Manifest::read(context.client_dir)?;

    Ok(context.catalog.dependencies.iter().map(|dependency| inspect(&context.client.mods_dir, manifest.as_ref(), dependency)).collect())
}

pub struct DownloadPlanInput<'a> {
    pub context: ClientContext<'a>,
    pub wanted: &'a BTreeSet<String>,
    pub removing: &'a [PathBuf],
}

pub fn to_download(input: DownloadPlanInput) -> AppResult<Vec<DependencyComponent>> {
    let manifest = Manifest::read(input.context.client_dir)?;
    let mods_dir = &input.context.client.mods_dir;
    let kept_copy = |dependency: &DependencyComponent| {
        find_copies(mods_dir, dependency)
            .iter()
            .any(|copy| !input.removing.iter().any(|removed| same_path(removed, copy) || copy.starts_with(removed)))
    };

    Ok(input
        .context
        .catalog
        .dependencies
        .iter()
        .filter(|dependency| input.wanted.contains(&dependency.id))
        .filter(|dependency| match inspect(mods_dir, manifest.as_ref(), dependency).state {
            DependencyState::Missing | DependencyState::Outdated => true,
            DependencyState::Ours => false,
            DependencyState::User => !kept_copy(dependency),
        })
        .cloned()
        .collect())
}

pub fn verify(fetched: &FetchedDependency) -> AppResult<()> {
    verify_sha256(&fetched.bytes, &fetched.dependency.sha256)?;
    verify_sha256(&fetched.licence, &fetched.dependency.licence.sha256)
}

pub async fn fetch(client: &ReleasesClient, dependencies: &[DependencyComponent]) -> AppResult<Vec<FetchedDependency>> {
    let mut fetched = Vec::new();

    for dependency in dependencies {
        let bytes = client
            .fetch_dependency(&dependency.source_url, FetchLimits { expected_size: Some(dependency.size), max_bytes: MAX_PACKAGE_BYTES })
            .await?;
        let licence = client.fetch_dependency(&dependency.licence.url, FetchLimits { expected_size: None, max_bytes: MAX_NOTICE_BYTES }).await?;
        let item = FetchedDependency { dependency: dependency.clone(), bytes, licence };

        verify(&item)?;
        fetched.push(item);
    }

    Ok(fetched)
}

pub fn notices_dir(client_dir: &Path) -> PathBuf {
    client_dir.join(NOTICES_DIR)
}

pub fn notice_path(client_dir: &Path, id: &str) -> AppResult<PathBuf> {
    Ok(notices_dir(client_dir).join(safe_file_name(id)?).join(LICENCE_FILE))
}

fn read_manifest(context: ClientContext) -> AppResult<Manifest> {
    match Manifest::read(context.client_dir)? {
        Some(manifest) => Ok(manifest),
        None => sync_manifest(context),
    }
}

#[derive(Default)]
struct Placement<'a> {
    placing: Vec<&'a FetchedDependency>,
    retire: Vec<PathBuf>,
}

fn user_record(id: &str, status: DependencyStatus) -> DependencyRecord {
    DependencyRecord { id: id.to_owned(), owner: DependencyOwner::User, file: status.file.unwrap_or_default(), sha256: String::new() }
}

fn ours_record(dependency: &DependencyComponent) -> DependencyRecord {
    DependencyRecord {
        id: dependency.id.clone(),
        owner: DependencyOwner::Ours,
        file: dependency.file.clone(),
        sha256: dependency.sha256.to_lowercase(),
    }
}

fn plan_placement<'a>(input: &InstallDependenciesInput<'a>, manifest: &mut Manifest) -> Placement<'a> {
    let mods_dir = &input.context.client.mods_dir;
    let mut placement = Placement::default();

    for id in input.wanted {
        let Some(dependency) = input.context.catalog.dependency(id) else {
            continue;
        };
        let status = inspect(mods_dir, Some(&*manifest), dependency);
        let fetched = input.fetched.iter().find(|fetched| &fetched.dependency.id == id);

        match (status.state, fetched) {
            (DependencyState::Missing | DependencyState::Outdated, Some(fetched)) => {
                if status.state == DependencyState::Outdated {
                    placement.retire.extend(manifest.dependency(id).and_then(|record| owned_file(mods_dir, record)));
                }

                placement.placing.push(fetched);
            }
            (DependencyState::User, _) => manifest.set_dependency(user_record(id, status)),
            _ => {}
        }
    }

    placement
}

pub fn install(input: InstallDependenciesInput) -> AppResult<Vec<String>> {
    let context = input.context;
    let mods_dir = &context.client.mods_dir;
    let mut manifest = read_manifest(context)?;

    for fetched in input.fetched {
        verify(fetched)?;
        safe_file_name(&fetched.dependency.file)?;
    }

    let Placement { placing, retire } = plan_placement(&input, &mut manifest);
    let files: Vec<StagedFile> = placing
        .iter()
        .map(|fetched| StagedFile { dir: mods_dir, name: &fetched.dependency.file, bytes: &fetched.bytes, sha256: &fetched.dependency.sha256 })
        .collect();

    stage(&files)?.commit(&commit_journal(context.client_dir), &retire)?;

    for fetched in &placing {
        manifest.set_dependency(ours_record(&fetched.dependency));
    }

    manifest.write(context.client_dir)?;

    for fetched in &placing {
        write_atomic(&notice_path(context.client_dir, &fetched.dependency.id)?, &fetched.licence)?;
    }

    Ok(placing.iter().map(|fetched| fetched.dependency.id.clone()).collect())
}

pub fn remove_owned(context: ClientContext) -> AppResult<Vec<PathBuf>> {
    let Some(mut manifest) = Manifest::read(context.client_dir)? else {
        return Ok(Vec::new());
    };
    let dirs = [context.client.mods_dir.clone(), manifest.mods_dir.clone()];
    let mut removed: Vec<PathBuf> = Vec::new();

    for record in manifest.dependencies.iter().filter(|record| record.owner == DependencyOwner::Ours) {
        for path in dirs.iter().filter(|dir| dir.is_absolute()).filter_map(|dir| owned_file(dir, record)).filter(|path| in_mod_folders(context, path))
        {
            if !removed.iter().any(|known| same_path(known, &path)) {
                remove_path(&path)?;
                removed.push(path);
            }
        }

        remove_path(&notices_dir(context.client_dir).join(safe_file_name(&record.id)?))?;
    }

    manifest.dependencies.retain(|record| record.owner != DependencyOwner::Ours);
    manifest.write(context.client_dir)?;

    Ok(removed)
}

pub fn updates(input: UpdatesInput) -> AppResult<BTreeSet<String>> {
    let Some(manifest) = Manifest::read(input.context.client_dir)? else {
        return Ok(BTreeSet::new());
    };
    let dirs: Vec<&Path> = std::iter::once(input.context.client.mods_dir.as_path()).chain(input.from_mods_dir).collect();

    Ok(input
        .context
        .catalog
        .dependencies
        .iter()
        .filter(|dependency| dirs.iter().any(|dir| inspect(dir, Some(&manifest), dependency).state == DependencyState::Outdated))
        .map(|dependency| dependency.id.clone())
        .collect())
}

pub fn carry(input: CarryInput) -> AppResult<Vec<String>> {
    let target = &input.context.client.mods_dir;
    let Some(manifest) = Manifest::read(input.context.client_dir)? else {
        return Ok(Vec::new());
    };
    let mut copied = Vec::new();

    if same_path(input.from_mods_dir, target) {
        return Ok(copied);
    }

    for record in manifest.dependencies.iter().filter(|record| record.owner == DependencyOwner::Ours) {
        let Some(source) = owned_file(input.from_mods_dir, record) else {
            continue;
        };
        let destination = target.join(&record.file);

        if destination.exists() {
            continue;
        }

        fs::create_dir_all(target)?;
        copy_verified(&source, &destination)?;
        copied.push(record.file.clone());
    }

    Ok(copied)
}

#[cfg(test)]
mod tests;
