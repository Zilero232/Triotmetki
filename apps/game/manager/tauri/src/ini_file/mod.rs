use std::fs;
use std::path::Path;

use encoding_rs::UTF_8;
use ini::{EscapePolicy, Ini, LineSeparator, ParseOption, WriteOption};

use crate::error::{AppError, AppResult, ErrorCode};

const UTF16_LE_BOM: [u8; 2] = [0xFF, 0xFE];

pub fn decode_text(bytes: &[u8]) -> String {
    UTF_8.decode(bytes).0.into_owned()
}

pub fn parse(text: &str) -> AppResult<Ini> {
    let options = ParseOption { enabled_quote: false, enabled_escape: false, ..ParseOption::default() };

    Ini::load_from_str_opt(text, options).map_err(|error| AppError::coded(ErrorCode::Io, format!("ini: {error}")))
}

pub fn read(path: &Path) -> AppResult<Option<Ini>> {
    if !path.is_file() {
        return Ok(None);
    }

    let text = decode_text(&fs::read(path)?);

    parse(&text).map(Some)
}

pub fn to_text(ini: &Ini) -> AppResult<String> {
    let mut buffer = Vec::new();
    let options = WriteOption { escape_policy: EscapePolicy::Nothing, line_separator: LineSeparator::CRLF, ..WriteOption::default() };

    ini.write_to_opt(&mut buffer, options)?;

    Ok(String::from_utf8_lossy(&buffer).into_owned())
}

pub fn write(path: &Path, ini: &Ini) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let text = to_text(ini)?;
    let mut bytes = UTF16_LE_BOM.to_vec();

    bytes.extend(text.encode_utf16().flat_map(u16::to_le_bytes));

    crate::fsx::write_atomic(path, &bytes)
}

pub fn get<'a>(ini: &'a Ini, section: &str, key: &str) -> Option<&'a str> {
    ini.section(Some(section)).and_then(|values| values.get(key)).map(str::trim)
}

#[cfg(test)]
mod tests;
