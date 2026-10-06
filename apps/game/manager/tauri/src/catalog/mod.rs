use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use glob::{MatchOptions, Pattern};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult, ErrorCode};

pub const OWNED_PREFIXES: [&str; 2] = ["net.triotmetki.", "otmetki."];
pub const DEPENDENCY_KIND: &str = "dependency";
pub const PACKAGE_EXTENSIONS: [&str; 2] = ["mtmod", "wotmod"];
pub const SHA256_HEX_LENGTH: usize = 64;

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Localized {
    pub ru: String,
    pub en: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub title: Localized,
    #[serde(default)]
    pub description: Localized,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: String,
    pub title: Localized,
    #[serde(default)]
    pub description: Localized,
    #[serde(default)]
    pub custom: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Preview {
    pub image: Option<String>,
    pub video: Option<String>,
    #[serde(default)]
    pub audio: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Perf {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictRule {
    pub id: String,
    pub title: Localized,
    pub patterns: Vec<String>,
    pub components: Vec<String>,
    #[serde(default)]
    pub note: Localized,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogComponent {
    pub id: String,
    pub package_id: String,
    pub version: String,
    pub file: String,
    pub category: String,
    pub title: Localized,
    #[serde(default)]
    pub description: Localized,
    #[serde(default)]
    pub fair_play: Localized,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub default: bool,
    #[serde(default)]
    pub presets: Vec<String>,
    #[serde(default)]
    pub preview: Preview,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default = "catalogued_default")]
    pub catalogued: bool,
    #[serde(default)]
    pub sha256: Option<String>,
    #[serde(default)]
    pub size: Option<u64>,
    #[serde(default)]
    pub perf: Option<Perf>,
    #[serde(default)]
    pub generator: Option<String>,
}

fn catalogued_default() -> bool {
    true
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DependencyKind {
    #[default]
    Dependency,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Author {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Licence {
    pub name: String,
    pub url: String,
    pub sha256: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyComponent {
    pub id: String,
    #[serde(default)]
    pub kind: DependencyKind,
    pub package_id: String,
    pub version: String,
    pub file: String,
    pub title: Localized,
    #[serde(default)]
    pub description: Localized,
    pub author: Author,
    pub licence: Licence,
    pub source_url: String,
    pub sha256: String,
    pub size: u64,
    #[serde(default)]
    pub required_by: Vec<String>,
    #[serde(default)]
    pub optional: bool,
    #[serde(default)]
    pub restart_required: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawCatalog {
    schema_version: u32,
    modpack_version: String,
    #[serde(default)]
    platform: String,
    #[serde(default)]
    extension: String,
    #[serde(default)]
    categories: Vec<Category>,
    #[serde(default)]
    presets: Vec<Preset>,
    #[serde(default)]
    components: Vec<serde_json::Value>,
    #[serde(default)]
    dependencies: Vec<DependencyComponent>,
    #[serde(default)]
    owned_patterns: Vec<String>,
    #[serde(default)]
    owned_paths: Vec<String>,
    #[serde(default)]
    conflicts: Vec<ConflictRule>,
    #[serde(default)]
    disabled_looks: Vec<String>,
}

impl TryFrom<RawCatalog> for Catalog {
    type Error = serde_json::Error;

    fn try_from(raw: RawCatalog) -> Result<Self, Self::Error> {
        let mut components = Vec::new();
        let mut dependencies = raw.dependencies;

        for entry in raw.components {
            if entry.get("kind").and_then(serde_json::Value::as_str) == Some(DEPENDENCY_KIND) {
                dependencies.push(serde_json::from_value(entry)?);
            } else {
                components.push(serde_json::from_value(entry)?);
            }
        }

        Ok(Self {
            schema_version: raw.schema_version,
            modpack_version: raw.modpack_version,
            platform: raw.platform,
            extension: raw.extension,
            categories: raw.categories,
            presets: raw.presets,
            components,
            dependencies,
            owned_patterns: raw.owned_patterns,
            owned_paths: raw.owned_paths,
            conflicts: raw.conflicts,
            disabled_looks: raw.disabled_looks,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", try_from = "RawCatalog")]
pub struct Catalog {
    pub schema_version: u32,
    pub modpack_version: String,
    #[serde(default)]
    pub platform: String,
    #[serde(default)]
    pub extension: String,
    #[serde(default)]
    pub categories: Vec<Category>,
    #[serde(default)]
    pub presets: Vec<Preset>,
    #[serde(default)]
    pub components: Vec<CatalogComponent>,
    #[serde(default)]
    pub dependencies: Vec<DependencyComponent>,
    #[serde(default)]
    pub owned_patterns: Vec<String>,
    #[serde(default)]
    pub owned_paths: Vec<String>,
    #[serde(default)]
    pub conflicts: Vec<ConflictRule>,
    #[serde(default)]
    pub disabled_looks: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedCatalog {
    #[serde(flatten)]
    pub catalog: Catalog,
    pub previews_dir: Option<PathBuf>,
}

pub fn is_our_name(name: &str) -> bool {
    let lowered = name.to_lowercase();

    OWNED_PREFIXES.iter().any(|prefix| lowered.strip_prefix(prefix).is_some_and(|rest| !rest.is_empty()))
}

pub fn parse(text: &str) -> AppResult<Catalog> {
    let mut catalog: Catalog = serde_json::from_str(text.trim_start_matches('\u{feff}'))?;

    if let Some(component) = catalog.components.iter().find(|component| !is_our_name(&component.package_id) || !is_our_name(&component.file)) {
        return Err(AppError::coded(ErrorCode::InvalidPath, format!("the component {} is not a Three Marks package", component.id)));
    }

    catalog.owned_patterns.retain(|pattern| is_our_name(pattern));
    catalog.owned_paths.retain(|path| !path.is_empty() && !path.contains("..") && !path.contains(':') && !path.starts_with(['/', '\\']));

    for rule in &mut catalog.conflicts {
        rule.patterns.retain(|pattern| !pattern.trim_matches(['*', '?']).is_empty() && !is_our_name(pattern.trim_start_matches('*')));
    }

    catalog.conflicts.retain(|rule| !rule.patterns.is_empty() && !rule.components.is_empty());
    catalog.dependencies.retain(|dependency| {
        let valid = is_valid_dependency(dependency);

        if !valid {
            log::warn!("catalog: skipping the dependency {}", dependency.id);
        }

        valid
    });

    Ok(catalog)
}

pub fn is_valid_dependency(dependency: &DependencyComponent) -> bool {
    let is_hex = |text: &str| text.len() == SHA256_HEX_LENGTH && text.chars().all(|c| c.is_ascii_hexdigit());
    let extension = Path::new(&dependency.file).extension().map(|ext| ext.to_string_lossy().to_lowercase());
    let file_prefix = format!("{}_", dependency.package_id.to_lowercase());

    !dependency.package_id.is_empty()
        && !is_our_name(&dependency.package_id)
        && !is_our_name(&dependency.file)
        && crate::releases::safe_file_name(&dependency.file).is_ok()
        && dependency.file.to_lowercase().starts_with(&file_prefix)
        && extension.is_some_and(|extension| PACKAGE_EXTENSIONS.contains(&extension.as_str()))
        && is_hex(&dependency.sha256)
        && is_hex(&dependency.licence.sha256)
        && dependency.size > 0
}

pub fn read_catalog(path: &Path) -> Option<Catalog> {
    fs::read_to_string(path).ok().and_then(|text| parse(&text).ok())
}

pub fn load(cache: &Path) -> Option<LoadedCatalog> {
    let catalog = read_catalog(cache)?;
    let previews_dir = cache.parent().map(Path::to_path_buf);

    Some(LoadedCatalog { catalog, previews_dir })
}

impl Catalog {
    pub fn dependency(&self, id: &str) -> Option<&DependencyComponent> {
        self.dependencies.iter().find(|dependency| dependency.id == id)
    }

    pub fn component(&self, id: &str) -> Option<&CatalogComponent> {
        self.components.iter().find(|component| component.id == id)
    }

    pub fn with_dependencies<'a>(&self, ids: impl IntoIterator<Item = &'a str>) -> BTreeSet<String> {
        let mut result = BTreeSet::new();
        let mut pending: Vec<String> = ids.into_iter().map(str::to_owned).collect();

        while let Some(id) = pending.pop() {
            let Some(component) = self.component(&id) else {
                continue;
            };

            if result.insert(id) {
                pending.extend(component.dependencies.iter().cloned());
            }
        }

        result
    }

    pub fn with_dependents(&self, id: &str) -> BTreeSet<String> {
        let mut result = BTreeSet::from([id.to_owned()]);
        let mut changed = true;

        while changed {
            changed = false;

            for component in &self.components {
                let depends_on_result = component.dependencies.iter().any(|dependency| result.contains(dependency));

                if depends_on_result && result.insert(component.id.clone()) {
                    changed = true;
                }
            }
        }

        result
    }

    pub fn is_owned_file(&self, file_name: &str) -> bool {
        self.owned_patterns.iter().any(|pattern| wildcard_match(pattern, file_name))
    }

    pub fn component_for_file(&self, file_name: &str) -> Option<&CatalogComponent> {
        let lowered = file_name.to_lowercase();

        self.components.iter().find(|component| {
            let prefix = format!("{}_", component.package_id.to_lowercase());
            let extension = Path::new(&component.file).extension().map(|ext| ext.to_string_lossy().to_lowercase());

            lowered == component.file.to_lowercase()
                || (lowered.starts_with(&prefix) && Path::new(&lowered).extension().map(|ext| ext.to_string_lossy().to_lowercase()) == extension)
        })
    }
}

pub fn wildcard_match(pattern: &str, text: &str) -> bool {
    let options = MatchOptions { case_sensitive: false, ..MatchOptions::default() };

    Pattern::new(pattern).is_ok_and(|pattern| pattern.matches_with(text, options))
}

#[cfg(test)]
pub mod fixtures;

#[cfg(test)]
mod tests;
