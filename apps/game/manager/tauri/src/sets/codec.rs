use std::io::Read;
#[cfg(test)]
use std::io::Write;

use base64::engine::{DecodePaddingMode, GeneralPurpose, GeneralPurposeConfig};
use base64::{alphabet, Engine};
use flate2::read::ZlibDecoder;
#[cfg(test)]
use flate2::write::ZlibEncoder;
#[cfg(test)]
use flate2::Compression;
use serde::{Deserialize, Serialize};

use super::{normalize_components, normalize_name, SetsFile};
use crate::error::{AppError, AppResult, ErrorCode};

pub const CODE_PREFIX: &str = "TS1.";
pub const CODE_MAX_CHARS: usize = 16 * 1024;
pub const MAX_INFLATED_BYTES: u64 = 256 * 1024;
pub const MAX_FILE_BYTES: u64 = 64 * 1024;
pub const FILE_FORMAT: &str = "triotmetki-component-set";
pub const FILE_FORMAT_VERSION: u32 = 1;

const ENGINE: GeneralPurpose = GeneralPurpose::new(
    &alphabet::URL_SAFE,
    GeneralPurposeConfig::new().with_encode_padding(false).with_decode_padding_mode(DecodePaddingMode::Indifferent),
);

#[derive(Debug, Serialize, Deserialize)]
struct Payload {
    name: String,
    components: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SetFile {
    format: String,
    version: u32,
    name: String,
    components: Vec<String>,
}

fn invalid() -> AppError {
    AppError::coded(ErrorCode::SetCode, "not a Three Marks component set")
}

fn checked(name: &str, components: &[String]) -> AppResult<(String, Vec<String>)> {
    let components = normalize_components(components);

    if components.is_empty() {
        return Err(invalid());
    }

    Ok((normalize_name(name).unwrap_or_default(), components))
}

#[cfg(test)]
pub fn encode(name: &str, components: &[String]) -> AppResult<String> {
    let payload = Payload { name: name.to_owned(), components: components.to_vec() };
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::best());

    encoder.write_all(serde_json::to_string(&payload)?.as_bytes())?;

    Ok(format!("{CODE_PREFIX}{}", ENGINE.encode(encoder.finish()?)))
}

pub fn decode(code: &str) -> AppResult<(String, Vec<String>)> {
    let code = code.trim();
    let body = code.strip_prefix(CODE_PREFIX).filter(|_| code.len() <= CODE_MAX_CHARS).ok_or_else(invalid)?;
    let packed = ENGINE.decode(body).map_err(|_| invalid())?;
    let mut text = String::new();

    ZlibDecoder::new(packed.as_slice()).take(MAX_INFLATED_BYTES).read_to_string(&mut text).map_err(|_| invalid())?;

    let payload: Payload = serde_json::from_str(&text).map_err(|_| invalid())?;

    checked(&payload.name, &payload.components)
}

#[cfg(test)]
pub fn to_file_text(name: &str, components: &[String]) -> AppResult<String> {
    let file = SetFile { format: FILE_FORMAT.to_owned(), version: FILE_FORMAT_VERSION, name: name.to_owned(), components: components.to_vec() };

    Ok(format!("{}\n", serde_json::to_string_pretty(&file)?))
}

pub fn from_file_text(text: &str) -> AppResult<(String, Vec<String>)> {
    let text = text.trim_start_matches('\u{feff}').trim();

    if text.starts_with(CODE_PREFIX) {
        return decode(text);
    }

    let file: SetFile = serde_json::from_str(text).map_err(|_| invalid())?;

    if file.format != FILE_FORMAT || file.version != FILE_FORMAT_VERSION {
        return Err(invalid());
    }

    checked(&file.name, &file.components)
}

pub fn library_from_text(text: &str) -> Option<SetsFile> {
    let value: serde_json::Value = serde_json::from_str(text.trim_start_matches('\u{feff}')).ok()?;

    if !value.get("sets").is_some_and(serde_json::Value::is_array) {
        return None;
    }

    serde_json::from_value(value).ok()
}
