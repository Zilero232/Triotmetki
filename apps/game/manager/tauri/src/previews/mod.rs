use std::collections::BTreeSet;
use std::path::Path;

use crate::catalog::Catalog;
use crate::fsx::{file_sha256, write_atomic};
use crate::paths::join_relative;
use crate::releases::{safe_file_name, verify_sha256, FetchLimits, ReleasesClient};

pub const DIR: &str = "previews";
pub const MAX_PREVIEW_BYTES: u64 = 8 * 1024 * 1024;
pub const SHA256_HEX_LENGTH: usize = 64;
pub const EXTENSIONS: [&str; 8] = ["png", "jpg", "jpeg", "webp", "gif", "mp3", "ogg", "wav"];

pub fn is_preview_file(file: &str) -> bool {
    let Some((dir, name)) = file.split_once('/') else {
        return false;
    };
    let extension = Path::new(name).extension().map(|extension| extension.to_string_lossy().to_lowercase());

    dir == DIR && safe_file_name(name).is_ok() && extension.is_some_and(|extension| EXTENSIONS.contains(&extension.as_str()))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PreviewFile {
    pub file: String,
    pub sha256: String,
}

fn is_sha256(value: &str) -> bool {
    value.len() == SHA256_HEX_LENGTH && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

pub fn files(catalog: &Catalog) -> Vec<PreviewFile> {
    let listed: BTreeSet<&String> = catalog
        .components
        .iter()
        .flat_map(|component| [component.preview.image.as_ref(), component.preview.audio.as_ref()])
        .flatten()
        .filter(|file| is_preview_file(file))
        .collect();

    listed
        .into_iter()
        .filter_map(|file| match catalog.preview_sha256.get(file).filter(|sha256| is_sha256(sha256)) {
            Some(sha256) => Some(PreviewFile { file: file.clone(), sha256: sha256.to_ascii_lowercase() }),
            None => {
                log::warn!("preview {file} has no sha256 in the catalogue");
                None
            }
        })
        .collect()
}

pub fn url(catalog_url: &str, file: &str) -> Option<String> {
    let (base, _) = catalog_url.split(['?', '#']).next()?.rsplit_once('/')?;

    Some(format!("{base}/{file}"))
}

pub struct PendingInput<'a> {
    pub root: &'a Path,
    pub files: Vec<PreviewFile>,
    pub refresh: bool,
}

fn is_current(path: &Path, sha256: &str) -> bool {
    file_sha256(path).is_ok_and(|actual| actual.eq_ignore_ascii_case(sha256))
}

pub fn pending(input: PendingInput) -> Vec<PreviewFile> {
    input
        .files
        .into_iter()
        .filter(|preview| input.refresh || join_relative(input.root, &preview.file).is_some_and(|path| !is_current(&path, &preview.sha256)))
        .collect()
}

pub struct DownloadInput<'a> {
    pub client: &'a ReleasesClient,
    pub root: &'a Path,
    pub catalog_url: &'a str,
    pub files: &'a [PreviewFile],
}

pub async fn download(input: DownloadInput<'_>) -> usize {
    let mut written = 0;

    for preview in input.files {
        let (Some(source), Some(path)) = (url(input.catalog_url, &preview.file), join_relative(input.root, &preview.file)) else {
            continue;
        };
        let fetched = input.client.fetch(&source, FetchLimits { expected_size: None, max_bytes: MAX_PREVIEW_BYTES }).await;
        let verified = fetched.and_then(|bytes| verify_sha256(&bytes, &preview.sha256).map(|()| bytes));

        match verified.and_then(|bytes| write_atomic(&path, &bytes)) {
            Ok(()) => written += 1,
            Err(error) => log::warn!("preview {}: {error}", preview.file),
        }
    }

    written
}

#[cfg(test)]
mod tests;
