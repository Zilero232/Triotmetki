use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use super::version::GameVersion;
use crate::paths::join_relative;
use crate::text::{decode_text, Fallback};

pub const VERSION_XML: &str = "version.xml";
pub const PATHS_XML: &str = "paths.xml";
pub const GAME_INFO_XML: &str = "game_info.xml";
pub const LESTA_EXECUTABLE: &str = "Tanki.exe";
pub const LESTA_REALMS: [&str; 2] = ["RU", "RPT"];
pub const COMMON_TEST_MARK: &str = ".RPT.";
pub const DEFAULT_PACKAGE_MASK: &str = "*.mtmod";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Branch {
    Release,
    CommonTest,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ClientSource {
    Lgc,
    Manual,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ClientProblem {
    NotLesta,
    OldVersion,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameClient {
    pub path: PathBuf,
    pub version: GameVersion,
    pub branch: Branch,
    pub realm: Option<String>,
    pub mods_dir: PathBuf,
    pub res_mods_dir: PathBuf,
    pub package_mask: String,
    pub problem: Option<ClientProblem>,
    pub source: ClientSource,
    pub preferred: bool,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct ClientPaths {
    pub mods: Option<String>,
    pub res_mods: Option<String>,
    pub mask: Option<String>,
}

pub fn inspect(path: &Path, source: ClientSource) -> Option<GameClient> {
    let version_xml = decode_text(&fs::read(path.join(VERSION_XML)).ok()?, Fallback::Lossy);
    let (version, realm) = parse_version_xml(&version_xml)?;
    let paths = fs::read(path.join(PATHS_XML)).map(|bytes| parse_paths_xml(&decode_text(&bytes, Fallback::Lossy))).unwrap_or_default();
    let game_id = fs::read(path.join(GAME_INFO_XML)).ok().and_then(|bytes| parse_game_id(&decode_text(&bytes, Fallback::Lossy)));
    let is_lesta = realm.as_deref().is_some_and(|realm| LESTA_REALMS.contains(&realm)) || path.join(LESTA_EXECUTABLE).is_file();
    let is_common_test = realm.as_deref() == Some(LESTA_REALMS[1]) || game_id.is_some_and(|id| id.contains(COMMON_TEST_MARK));
    let problem = match (is_lesta, version.is_supported()) {
        (false, _) => Some(ClientProblem::NotLesta),
        (true, false) => Some(ClientProblem::OldVersion),
        (true, true) => None,
    };
    let folder = |relative: Option<&str>, name: &str| {
        relative.and_then(|relative| join_relative(path, relative)).unwrap_or_else(|| path.join(name).join(version.to_string()))
    };

    Some(GameClient {
        path: path.to_path_buf(),
        version,
        branch: if is_common_test { Branch::CommonTest } else { Branch::Release },
        realm,
        mods_dir: folder(paths.mods.as_deref(), "mods"),
        res_mods_dir: folder(paths.res_mods.as_deref(), "res_mods"),
        package_mask: paths.mask.unwrap_or_else(|| DEFAULT_PACKAGE_MASK.to_owned()),
        problem,
        source,
        preferred: false,
    })
}

fn element_text<'a>(document: &'a roxmltree::Document, tag: &str) -> Option<&'a str> {
    document.descendants().find(|node| node.has_tag_name(tag)).and_then(|node| node.text()).map(str::trim).filter(|text| !text.is_empty())
}

fn document(xml: &str) -> Option<roxmltree::Document<'_>> {
    roxmltree::Document::parse(xml.trim_start_matches('\u{feff}')).ok()
}

pub fn parse_version_xml(xml: &str) -> Option<(GameVersion, Option<String>)> {
    let document = document(xml)?;
    let version = GameVersion::parse(element_text(&document, "version")?)?;
    let realm = element_text(&document, "realm").map(str::to_owned);

    Some((version, realm))
}

pub fn parse_paths_xml(xml: &str) -> ClientPaths {
    let Some(document) = document(xml) else {
        return ClientPaths::default();
    };
    let packages = document.descendants().find(|node| node.has_tag_name("Packages"));
    let child_text = |tag: &str| {
        packages
            .and_then(|node| node.children().find(|child| child.has_tag_name(tag)))
            .and_then(|child| child.text())
            .map(|text| text.trim().to_owned())
            .filter(|text| !text.is_empty())
    };
    let res_mods = document
        .descendants()
        .filter(|node| node.has_tag_name("Path"))
        .filter_map(|node| node.text())
        .map(str::trim)
        .find(|text| text.contains("res_mods"))
        .map(str::to_owned);

    ClientPaths { mods: child_text("Root"), res_mods, mask: child_text("Mask") }
}

pub fn parse_game_id(xml: &str) -> Option<String> {
    let document = document(xml)?;

    element_text(&document, "id").map(str::to_owned)
}
