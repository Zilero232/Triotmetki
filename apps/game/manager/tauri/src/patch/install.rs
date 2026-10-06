use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use super::stage::{commit_journal, stage, StagedFile};
use crate::components::{in_mod_folders, is_owned, sync_manifest, ClientContext};
use crate::error::AppResult;
use crate::fsx::list_files;
use crate::hangars::is_generated_file;
use crate::releases::{FetchLimits, Release, ReleasePackage, ReleasesClient, MAX_PACKAGE_BYTES};
use crate::state::{component_id, disabled_dir, save_client_state, Manifest};

#[derive(Debug, Clone)]
pub struct FetchedPackage {
    pub package: ReleasePackage,
    pub bytes: Vec<u8>,
}

pub fn install_targets(context: ClientContext, extra: &[String]) -> AppResult<(BTreeSet<String>, BTreeSet<String>)> {
    let catalog = context.catalog;
    let manifest = Manifest::read(context.client_dir)?;
    let parked: BTreeSet<String> = list_files(&disabled_dir(context.client_dir))
        .iter()
        .filter_map(|path| path.file_name())
        .filter_map(|name| catalog.component_for_file(&name.to_string_lossy()).map(|component| component.id.clone()))
        .chain(manifest.iter().flat_map(|manifest| manifest.disabled.clone()))
        .collect();
    let active: Vec<String> = list_files(&context.client.mods_dir)
        .iter()
        .filter_map(|path| path.file_name())
        .filter_map(|name| catalog.component_for_file(&name.to_string_lossy()).map(|component| component.id.clone()))
        .chain(manifest.iter().flat_map(Manifest::component_ids))
        .chain(extra.iter().cloned())
        .chain(catalog.components.iter().filter(|component| component.required).map(|component| component.id.clone()))
        .collect();
    let wanted = catalog.with_dependencies(extra.iter().map(String::as_str));
    let enabled: BTreeSet<String> =
        catalog.with_dependencies(active.iter().map(String::as_str)).into_iter().filter(|id| !parked.contains(id) || wanted.contains(id)).collect();
    let disabled = parked.into_iter().filter(|id| !enabled.contains(id)).collect();

    Ok((enabled, disabled))
}

pub async fn fetch_packages(client: &ReleasesClient, release: &Release, ids: &BTreeSet<String>) -> AppResult<Vec<FetchedPackage>> {
    let mut fetched = Vec::new();

    for package in release.packages.iter().filter(|package| ids.contains(&package.id)) {
        let bytes = client.fetch(&package.url, FetchLimits { expected_size: Some(package.size), max_bytes: MAX_PACKAGE_BYTES }).await?;

        crate::releases::verify_sha256(&bytes, &package.sha256)?;
        fetched.push(FetchedPackage { package: package.clone(), bytes });
    }

    Ok(fetched)
}

pub struct ApplyInput<'a> {
    pub context: ClientContext<'a>,
    pub modpack_version: &'a str,
    pub packages: &'a [FetchedPackage],
    pub disabled: &'a BTreeSet<String>,
    pub replace_all: bool,
    pub drop_retired: bool,
}

fn stale_versions(dir: &Path, input: &ApplyInput, package: &ReleasePackage) -> Vec<PathBuf> {
    list_files(dir)
        .into_iter()
        .filter(|path| {
            let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();

            name != package.file && input.context.catalog.component_for_file(&name).is_some_and(|component| component.id == package.id)
        })
        .collect()
}

pub fn retired_files(context: ClientContext) -> Vec<PathBuf> {
    let catalog = context.catalog;

    if catalog.components.is_empty() {
        return Vec::new();
    }

    [context.client.mods_dir.clone(), disabled_dir(context.client_dir)]
        .iter()
        .flat_map(|dir| list_files(dir))
        .filter(|path| {
            let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();

            catalog.is_owned_file(&name) && catalog.component_for_file(&name).is_none() && !is_generated_file(&name)
        })
        .collect()
}

pub fn our_files(context: ClientContext) -> AppResult<Vec<PathBuf>> {
    let catalog = context.catalog;
    let recorded = Manifest::read(context.client_dir)?.map(|manifest| manifest.files).unwrap_or_default();
    let mut found: Vec<PathBuf> = Vec::new();
    let candidates = recorded.into_iter().chain(list_files(&context.client.mods_dir)).chain(list_files(&disabled_dir(context.client_dir)));

    for path in candidates {
        let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();

        if path.is_file() && is_owned(catalog, &name) && !is_generated_file(&name) && in_mod_folders(context, &path) && !found.contains(&path) {
            found.push(path);
        }
    }

    Ok(found)
}

pub fn apply_packages(input: ApplyInput) -> AppResult<Vec<String>> {
    let mods_dir = input.context.client.mods_dir.clone();
    let parked_dir = disabled_dir(input.context.client_dir);
    let files: Vec<StagedFile> = input
        .packages
        .iter()
        .map(|fetched| StagedFile {
            dir: if input.disabled.contains(&fetched.package.id) { &parked_dir } else { &mods_dir },
            name: &fetched.package.file,
            bytes: &fetched.bytes,
            sha256: &fetched.package.sha256,
        })
        .collect();
    let retired = if input.drop_retired { retired_files(input.context) } else { Vec::new() };
    let retire: Vec<PathBuf> = if input.replace_all {
        our_files(input.context)?
    } else {
        input
            .packages
            .iter()
            .flat_map(|fetched| [&mods_dir, &parked_dir].into_iter().flat_map(|dir| stale_versions(dir, &input, &fetched.package)))
            .chain(retired.iter().cloned())
            .collect()
    };

    stage(&files)?.commit(&commit_journal(input.context.client_dir), &retire)?;

    if input.replace_all || !retired.is_empty() {
        if let Some(mut manifest) = Manifest::read(input.context.client_dir)? {
            let catalog = input.context.catalog;

            manifest.components.retain(|name| !input.replace_all && catalog.component(component_id(name)).is_some());
            manifest.write(input.context.client_dir)?;
        }
    }

    let mut manifest = sync_manifest(input.context)?;

    manifest.modpack = input.modpack_version.to_owned();
    manifest.date = crate::components::now_text();
    manifest.write(input.context.client_dir)?;
    save_client_state(input.context.client_dir, input.context.client)?;

    Ok(input.packages.iter().map(|fetched| fetched.package.id.clone()).collect())
}
