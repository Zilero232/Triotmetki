use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use walkdir::WalkDir;

use super::is_generated_file;
use crate::catalog::is_our_name;
use crate::conflicts::package_files;
use crate::detect::client::PATHS_XML;
use crate::detect::GameClient;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::file_sha256;
use crate::ini_file::decode_text;
use crate::paths::{join_relative, same_path};

pub const GAME_RES_DIR: &str = "res";
pub const DEFAULT_PACKAGE_ROOT: &str = "res";
pub const DEFAULT_MASK: &str = "*.mtmod";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind {
    Loose,
    GameRes,
    Mtmod,
    Package,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Source {
    pub kind: SourceKind,
    pub path: PathBuf,
    pub root: String,
}

impl Source {
    pub fn is_ours(&self) -> bool {
        self.kind == SourceKind::Mtmod && self.path.file_name().is_some_and(|name| is_our_name(&name.to_string_lossy()))
    }

    pub fn overrides_game(&self) -> bool {
        match self.kind {
            SourceKind::Loose => true,
            SourceKind::Mtmod => !self.is_ours(),
            SourceKind::GameRes | SourceKind::Package => false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Located {
    pub source: usize,
    pub path: String,
    entry: Option<usize>,
}

struct Archive {
    zip: zip::ZipArchive<File>,
    names: BTreeMap<String, (String, usize)>,
}

pub struct ClientFiles {
    sources: Vec<Source>,
    archives: RefCell<HashMap<usize, Option<Archive>>>,
}

fn normalize(path: &str) -> String {
    path.replace('\\', "/").trim_start_matches('/').to_owned()
}

fn lower(path: &str) -> String {
    normalize(path).to_lowercase()
}

fn mask_extension(mask: &str) -> String {
    mask.trim().strip_prefix("*.").unwrap_or(mask.trim()).to_lowercase()
}

fn mtmods(dir: &Path, mask: &str) -> Vec<PathBuf> {
    let extension = mask_extension(mask);

    package_files(dir)
        .into_iter()
        .filter(|path| path.extension().is_some_and(|found| found.to_string_lossy().to_lowercase() == extension))
        .filter(|path| !path.file_name().is_some_and(|name| is_generated_file(&name.to_string_lossy())))
        .collect()
}

fn loose(game_dir: &Path, text: &str) -> Option<Source> {
    let dir = join_relative(game_dir, text)?;
    let kind = if same_path(&dir, &game_dir.join(GAME_RES_DIR)) { SourceKind::GameRes } else { SourceKind::Loose };

    Some(Source { kind, path: dir, root: String::new() })
}

struct MtmodSourcesInput<'a> {
    game_dir: &'a Path,
    text: &'a str,
    mask: &'a str,
    root: &'a str,
}

fn mtmod_sources(input: MtmodSourcesInput) -> Vec<Source> {
    let MtmodSourcesInput { game_dir, text, mask, root } = input;
    let Some(dir) = join_relative(game_dir, text) else {
        return Vec::new();
    };
    let root = if root.trim().is_empty() { String::new() } else { format!("{}/", lower(root.trim()).trim_end_matches('/')) };

    mtmods(&dir, mask).into_iter().map(|path| Source { kind: SourceKind::Mtmod, path, root: root.clone() }).collect()
}

pub fn read_sources(game_dir: &Path) -> Vec<Source> {
    let text = fs::read(game_dir.join(PATHS_XML)).map(|bytes| decode_text(&bytes)).unwrap_or_default();
    let Ok(document) = roxmltree::Document::parse(text.trim_start_matches('\u{feff}')) else {
        return Vec::new();
    };
    let Some(paths) = document.descendants().find(|node| node.has_tag_name("Paths")) else {
        return Vec::new();
    };
    let node_text = |node: roxmltree::Node| node.text().unwrap_or_default().trim().to_owned();
    let mut sources = Vec::new();

    for node in paths.children().filter(roxmltree::Node::is_element) {
        if node.has_tag_name("Path") {
            match node.attribute("mask") {
                Some(mask) => {
                    let root = node.attribute("root").unwrap_or(DEFAULT_PACKAGE_ROOT);

                    sources.extend(mtmod_sources(MtmodSourcesInput { game_dir, text: &node_text(node), mask, root }));
                }
                None => sources.extend(loose(game_dir, &node_text(node))),
            }
        } else if node.has_tag_name("Packages") {
            let child_text = |tag: &str| node.children().find(|child| child.has_tag_name(tag)).map(node_text).filter(|text| !text.is_empty());

            if let Some(root) = child_text("Root") {
                let mask = child_text("Mask").unwrap_or_else(|| DEFAULT_MASK.to_owned());

                sources.extend(mtmod_sources(MtmodSourcesInput { game_dir, text: &root, mask: &mask, root: DEFAULT_PACKAGE_ROOT }));
            }

            for package in node.children().filter(|child| child.has_tag_name("Package")) {
                if let Some(path) = join_relative(game_dir, &node_text(package)) {
                    sources.push(Source { kind: SourceKind::Package, path, root: String::new() });
                }
            }
        }
    }

    sources
}

fn open_archive(source: &Source) -> Option<Archive> {
    let file = File::open(&source.path).ok()?;
    let zip = match zip::ZipArchive::new(file) {
        Ok(zip) => zip,
        Err(error) => {
            log::warn!("hangar looks: cannot read {}: {error}", source.path.display());

            return None;
        }
    };
    let mut names = BTreeMap::new();

    for index in 0..zip.len() {
        let Some(name) = zip.name_for_index(index).map(normalize) else {
            continue;
        };
        let lowered = name.to_lowercase();

        if name.ends_with('/') || !lowered.starts_with(&source.root) {
            continue;
        }

        let relative = name[source.root.len()..].to_owned();

        names.entry(relative.to_lowercase()).or_insert((relative, index));
    }

    Some(Archive { zip, names })
}

impl ClientFiles {
    pub fn open(client: &GameClient) -> Self {
        Self::from_sources(read_sources(&client.path))
    }

    pub fn from_sources(sources: Vec<Source>) -> Self {
        Self { sources, archives: RefCell::new(HashMap::new()) }
    }

    pub fn source(&self, located: &Located) -> &Source {
        &self.sources[located.source]
    }

    fn with_archive<T>(&self, index: usize, work: impl FnOnce(&mut Archive) -> T) -> Option<T> {
        let mut archives = self.archives.borrow_mut();
        let archive = archives.entry(index).or_insert_with(|| open_archive(&self.sources[index]));

        archive.as_mut().map(work)
    }

    fn locate_in(&self, index: usize, path: &str) -> Option<Located> {
        let source = &self.sources[index];

        match source.kind {
            SourceKind::Loose | SourceKind::GameRes => {
                join_relative(&source.path, path).filter(|full| full.is_file()).map(|_| Located { source: index, path: normalize(path), entry: None })
            }
            SourceKind::Mtmod | SourceKind::Package => self
                .with_archive(index, |archive| archive.names.get(&lower(path)).cloned())
                .flatten()
                .map(|(relative, entry)| Located { source: index, path: relative, entry: Some(entry) }),
        }
    }

    pub fn locate(&self, path: &str) -> Option<Located> {
        (0..self.sources.len()).find_map(|index| self.locate_in(index, path))
    }

    fn list_in(&self, index: usize, prefix: &str) -> Vec<Located> {
        let source = &self.sources[index];

        match source.kind {
            SourceKind::Loose | SourceKind::GameRes => {
                let Some(dir) = join_relative(&source.path, &normalize(prefix)) else {
                    return Vec::new();
                };

                WalkDir::new(&dir)
                    .follow_links(false)
                    .into_iter()
                    .filter_map(Result::ok)
                    .filter(|entry| entry.file_type().is_file())
                    .filter_map(|entry| {
                        let relative = entry.path().strip_prefix(&source.path).ok()?.to_string_lossy().replace('\\', "/");

                        Some(Located { source: index, path: relative, entry: None })
                    })
                    .collect()
            }
            SourceKind::Mtmod | SourceKind::Package => self
                .with_archive(index, |archive| {
                    let prefix = lower(prefix);

                    archive
                        .names
                        .range(prefix.clone()..)
                        .take_while(|(key, _)| key.starts_with(&prefix))
                        .map(|(_, (relative, entry))| Located { source: index, path: relative.clone(), entry: Some(*entry) })
                        .collect()
                })
                .unwrap_or_default(),
        }
    }

    pub fn list(&self, prefix: &str) -> Vec<Located> {
        let mut found: BTreeMap<String, Located> = BTreeMap::new();

        for index in 0..self.sources.len() {
            for located in self.list_in(index, prefix) {
                found.entry(located.path.to_lowercase()).or_insert(located);
            }
        }

        found.into_values().collect()
    }

    fn loose_path(&self, located: &Located) -> AppResult<PathBuf> {
        join_relative(&self.sources[located.source].path, &located.path)
            .ok_or_else(|| AppError::coded(ErrorCode::InvalidPath, format!("bad client path {}", located.path)))
    }

    pub fn copy(&self, located: &Located, writer: &mut dyn Write, limit: u64) -> AppResult<u64> {
        let copied = match located.entry {
            None => std::io::copy(&mut File::open(self.loose_path(located)?)?.take(limit + 1), writer)?,
            Some(entry) => self
                .with_archive(located.source, |archive| -> AppResult<u64> {
                    Ok(std::io::copy(&mut archive.zip.by_index(entry)?.take(limit + 1), writer)?)
                })
                .unwrap_or_else(|| Err(unreadable(&self.sources[located.source])))?,
        };

        if copied > limit {
            return Err(AppError::coded(ErrorCode::Io, format!("{} is larger than {limit} bytes", located.path)));
        }

        Ok(copied)
    }

    pub fn read(&self, located: &Located, limit: u64) -> AppResult<Vec<u8>> {
        let mut bytes = Vec::new();
        let too_large = || AppError::coded(ErrorCode::Io, format!("{} is larger than {limit} bytes", located.path));

        match located.entry {
            None => {
                File::open(self.loose_path(located)?)?.take(limit + 1).read_to_end(&mut bytes)?;
            }
            Some(entry) => self
                .with_archive(located.source, |archive| -> AppResult<()> {
                    archive.zip.by_index(entry)?.take(limit + 1).read_to_end(&mut bytes)?;

                    Ok(())
                })
                .unwrap_or_else(|| Err(unreadable(&self.sources[located.source])))?,
        }

        if bytes.len() as u64 > limit {
            return Err(too_large());
        }

        Ok(bytes)
    }

    pub fn fingerprint(&self, located: &Located) -> AppResult<String> {
        let source = &self.sources[located.source];

        match located.entry {
            None => Ok(format!("{}|{}", located.path.to_lowercase(), file_sha256(&self.loose_path(located)?)?)),
            Some(entry) => self
                .with_archive(located.source, |archive| -> AppResult<String> {
                    let file = archive.zip.by_index_raw(entry)?;

                    Ok(format!("{}|{}|{:08x}|{}", source.path.display(), located.path.to_lowercase(), file.crc32(), file.size()))
                })
                .unwrap_or_else(|| Err(unreadable(source))),
        }
    }
}

fn unreadable(source: &Source) -> AppError {
    AppError::coded(ErrorCode::Io, format!("cannot read {}", source.path.display()))
}
