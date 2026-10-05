mod redact;

use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

pub use redact::{RedactContext, Redactor};

use crate::error::AppResult;
use crate::fsx::{list_files, TEMP_SUFFIX};

pub const REPORTS_PATH: &str = "/mod/reports";
pub const PYTHON_LOG: &str = "python.log";
pub const OTMETKI_LOG: &str = "otmetki.log";
pub const MESSAGE_FILE: &str = "message.txt";
pub const ENVIRONMENT_FILE: &str = "environment.txt";
pub const MANAGER_LOG_FILE: &str = "manager.log";
pub const MESSAGE_MAX_CHARS: usize = 2000;
pub const PYTHON_TAIL_BYTES: u64 = 160 * 1024;
pub const OTMETKI_TAIL_BYTES: u64 = 128 * 1024;
pub const MANAGER_TAIL_BYTES: u64 = 64 * 1024;
pub const ZIP_EXTENSION: &str = "zip";
pub const TRUNCATED_MARK: &str = "…\n";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReportPart {
    Environment,
    ManagerLog,
    PythonLog,
    OtmetkiLog,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportItem {
    pub part: ReportPart,
    pub name: String,
    pub bytes: usize,
    pub truncated: bool,
    pub redactions: usize,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPreview {
    pub id: String,
    pub manager_version: String,
    pub modpack_version: Option<String>,
    pub game_version: Option<String>,
    pub items: Vec<ReportItem>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct UploadFile<'a> {
    pub name: &'a str,
    pub text: &'a str,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ReportUpload<'a> {
    pub manager_version: &'a str,
    pub modpack_version: Option<&'a str>,
    pub game_version: Option<&'a str>,
    pub message: String,
    pub files: Vec<UploadFile<'a>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportReceipt {
    pub id: String,
    #[serde(alias = "expires_at")]
    pub expires_at: String,
}

pub fn decode_text(bytes: &[u8]) -> String {
    match std::str::from_utf8(bytes) {
        Ok(text) => text.to_owned(),
        Err(error) if error.error_len().is_none() => String::from_utf8_lossy(bytes).into_owned(),
        Err(_) => encoding_rs::WINDOWS_1251.decode(bytes).0.into_owned(),
    }
}

pub fn read_tail(path: &Path, max_bytes: u64) -> Option<(String, bool)> {
    let mut file = File::open(path).ok()?;
    let length = file.metadata().ok()?.len();
    let start = length.saturating_sub(max_bytes);
    let mut bytes = Vec::new();

    file.seek(SeekFrom::Start(start)).ok()?;
    file.take(max_bytes).read_to_end(&mut bytes).ok()?;

    if start == 0 {
        return Some((decode_text(&bytes), false));
    }

    let first_line = bytes.iter().position(|byte| *byte == b'\n').map_or(0, |index| index + 1);

    Some((decode_text(&bytes[first_line..]), true))
}

pub fn newest_file(dir: &Path) -> Option<PathBuf> {
    list_files(dir).into_iter().max_by_key(|path| fs::metadata(path).and_then(|metadata| metadata.modified()).ok())
}

pub fn item(part: ReportPart, name: &str, text: &str, truncated: bool, redactor: &Redactor) -> ReportItem {
    let (text, redactions) = redactor.redact(text);
    let text = if truncated { format!("{TRUNCATED_MARK}{text}") } else { text };

    ReportItem { part, name: name.to_owned(), bytes: text.len(), truncated, redactions, text }
}

pub fn clean_message(message: &str) -> String {
    message.trim().chars().take(MESSAGE_MAX_CHARS).collect()
}

pub fn selected<'a>(preview: &'a ReportPreview, parts: &[ReportPart]) -> Vec<&'a ReportItem> {
    preview.items.iter().filter(|item| parts.contains(&item.part)).collect()
}

pub fn upload<'a>(preview: &'a ReportPreview, parts: &[ReportPart], message: &str) -> ReportUpload<'a> {
    ReportUpload {
        manager_version: &preview.manager_version,
        modpack_version: preview.modpack_version.as_deref(),
        game_version: preview.game_version.as_deref(),
        message: clean_message(message),
        files: selected(preview, parts).into_iter().map(|item| UploadFile { name: &item.name, text: &item.text }).collect(),
    }
}

pub fn write_zip(target: &Path, preview: &ReportPreview, parts: &[ReportPart], message: &str) -> AppResult<PathBuf> {
    let target = crate::sets::with_extension(target, ZIP_EXTENSION);
    let parent = target.parent().filter(|parent| !parent.as_os_str().is_empty()).unwrap_or(Path::new("."));
    let mut writer = ZipWriter::new(tempfile::Builder::new().suffix(TEMP_SUFFIX).tempfile_in(parent)?);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    let message = clean_message(message);

    if !message.is_empty() {
        writer.start_file(MESSAGE_FILE, options)?;
        writer.write_all(message.as_bytes())?;
    }

    for item in selected(preview, parts) {
        writer.start_file(&item.name, options)?;
        writer.write_all(item.text.as_bytes())?;
    }

    let temp = writer.finish()?;

    temp.as_file().sync_all()?;
    temp.persist(&target).map_err(|error| error.error)?;

    Ok(target)
}

#[cfg(test)]
mod tests;
