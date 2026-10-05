mod scan;

use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use serde::Serialize;

pub use scan::{id_from_name, package_files, read_package, ModPackage};

use crate::catalog::{wildcard_match, Catalog};
use crate::components::{is_owned, read_installation, ClientContext, ComponentState};
use crate::error::AppResult;
use crate::fsx::file_sha256;
use crate::install::ForeignLocation;

pub const RES_PREFIX: &str = "res/";
pub const SAMPLE_PATHS: usize = 5;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MissingComponent {
    pub id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplacedComponent {
    pub id: String,
    pub file: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicatePackage {
    pub package_id: String,
    pub files: Vec<String>,
    pub ours: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForeignConflict {
    pub rule: String,
    pub file: String,
    pub package_id: String,
    pub components: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverridingFiles {
    pub file: String,
    pub location: ForeignLocation,
    pub paths: Vec<String>,
    pub count: usize,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictReport {
    pub missing: Vec<MissingComponent>,
    pub replaced: Vec<ReplacedComponent>,
    pub duplicates: Vec<DuplicatePackage>,
    pub foreign: Vec<ForeignConflict>,
    pub overrides: Vec<OverridingFiles>,
}

fn relative_name(root: &Path, path: &Path) -> String {
    path.strip_prefix(root).unwrap_or(path).to_string_lossy().replace('\\', "/")
}

fn owned_prefixes(catalog: &Catalog) -> Vec<String> {
    catalog.owned_paths.iter().map(|path| path.to_lowercase().replace('\\', "/")).collect()
}

fn touches_owned(prefixes: &[String], entry: &str) -> bool {
    let entry = entry.to_lowercase().replace('\\', "/");
    let entry = entry.strip_prefix(RES_PREFIX).unwrap_or(&entry);

    prefixes.iter().any(|prefix| entry.starts_with(prefix.as_str()))
}

fn sample(mut paths: Vec<String>) -> (Vec<String>, usize) {
    paths.sort();
    paths.dedup();

    let count = paths.len();

    paths.truncate(SAMPLE_PATHS);

    (paths, count)
}

fn is_dependency(catalog: &Catalog, package: &ModPackage) -> bool {
    catalog.dependencies.iter().any(|dependency| dependency.package_id.eq_ignore_ascii_case(&package.package_id))
}

fn matching_rules(catalog: &Catalog, package: &ModPackage, enabled: &BTreeSet<String>, mods_dir: &Path) -> Vec<ForeignConflict> {
    let name = package.name.to_lowercase();

    catalog
        .conflicts
        .iter()
        .filter(|rule| rule.patterns.iter().any(|pattern| wildcard_match(pattern, &name) || wildcard_match(pattern, &package.package_id)))
        .filter_map(|rule| {
            let components: Vec<String> = rule.components.iter().filter(|id| enabled.contains(*id)).cloned().collect();

            (!components.is_empty()).then(|| ForeignConflict {
                rule: rule.id.clone(),
                file: relative_name(mods_dir, &package.path),
                package_id: package.package_id.clone(),
                components,
            })
        })
        .collect()
}

fn res_mods_overrides(res_mods_dir: &Path, prefixes: &[String]) -> Option<OverridingFiles> {
    let mut found = Vec::new();

    for prefix in prefixes {
        let parent = prefix.rsplit_once('/').map_or("", |(parent, _)| parent);
        let dir = parent.split('/').filter(|part| !part.is_empty()).fold(res_mods_dir.to_path_buf(), |path, part| path.join(part));

        for entry in walkdir::WalkDir::new(&dir).min_depth(1).follow_links(false).into_iter().filter_map(Result::ok) {
            let relative = relative_name(res_mods_dir, entry.path());

            if entry.file_type().is_file() && relative.to_lowercase().starts_with(prefix.as_str()) {
                found.push(relative);
            }
        }
    }

    (!found.is_empty()).then(|| {
        let (paths, count) = sample(found);
        let file = relative_name(res_mods_dir.parent().and_then(Path::parent).unwrap_or(res_mods_dir), res_mods_dir);

        OverridingFiles { file, location: ForeignLocation::ResMods, paths, count }
    })
}

fn expected_sha256<'a>(catalog: &'a Catalog, id: &str, version: Option<&str>) -> Option<&'a str> {
    let component = catalog.component(id)?;

    component.sha256.as_deref().filter(|_| version == Some(component.version.as_str()))
}

pub fn scan(context: ClientContext) -> AppResult<ConflictReport> {
    let catalog = context.catalog;
    let mods_dir = &context.client.mods_dir;
    let installation = read_installation(context)?;
    let enabled: BTreeSet<String> =
        installation.components.iter().filter(|component| component.state == ComponentState::Enabled).map(|component| component.id.clone()).collect();
    let prefixes = owned_prefixes(catalog);
    let mut report = ConflictReport::default();

    for component in &installation.components {
        match (component.state, component.file.as_deref()) {
            (ComponentState::Missing, _) if catalog.component(&component.id).is_some() => {
                report.missing.push(MissingComponent { id: component.id.clone() })
            }
            (ComponentState::Enabled, Some(file)) => {
                let Some(expected) = expected_sha256(catalog, &component.id, component.version.as_deref()) else {
                    continue;
                };

                if file_sha256(&mods_dir.join(file)).is_ok_and(|actual| !actual.eq_ignore_ascii_case(expected)) {
                    report.replaced.push(ReplacedComponent { id: component.id.clone(), file: file.to_owned() });
                }
            }
            _ => {}
        }
    }

    let mut by_id: BTreeMap<String, Vec<(String, bool)>> = BTreeMap::new();

    for path in package_files(mods_dir) {
        let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();

        if is_owned(catalog, &name) {
            let package_id = catalog.component_for_file(&name).map_or_else(|| id_from_name(&name), |component| component.package_id.to_lowercase());

            by_id.entry(package_id).or_default().push((relative_name(mods_dir, &path), true));
            continue;
        }

        let package = read_package(&path);

        by_id.entry(package.package_id.clone()).or_default().push((relative_name(mods_dir, &path), false));

        if !is_dependency(catalog, &package) {
            report.foreign.extend(matching_rules(catalog, &package, &enabled, mods_dir));
        }

        let touched: Vec<String> = package.entries.iter().filter(|entry| touches_owned(&prefixes, entry)).cloned().collect();

        if !touched.is_empty() {
            let (paths, count) = sample(touched);

            report.overrides.push(OverridingFiles { file: relative_name(mods_dir, &path), location: ForeignLocation::Mods, paths, count });
        }
    }

    report.duplicates = by_id
        .into_iter()
        .filter(|(_, files)| files.len() > 1)
        .map(|(package_id, files)| DuplicatePackage {
            ours: files.iter().any(|(_, ours)| *ours),
            files: files.into_iter().map(|(file, _)| file).collect(),
            package_id,
        })
        .collect();
    report.overrides.extend(res_mods_overrides(&context.client.res_mods_dir, &prefixes));

    Ok(report)
}

impl ConflictReport {
    pub fn to_restore(&self) -> Vec<String> {
        let ids: BTreeSet<String> = self.missing.iter().map(|item| item.id.clone()).chain(self.replaced.iter().map(|item| item.id.clone())).collect();

        ids.into_iter().collect()
    }
}

#[cfg(test)]
mod tests;
