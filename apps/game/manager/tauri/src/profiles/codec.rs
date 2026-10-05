use std::io::{Read, Write};

use base64::engine::{DecodePaddingMode, GeneralPurpose, GeneralPurposeConfig};
use base64::{alphabet, Engine};
use flate2::read::ZlibDecoder;
use flate2::write::ZlibEncoder;
use flate2::Compression;
use serde_json::{json, Map, Value};

use super::ProfileData;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::sets::normalize_components;

pub const CODE_PREFIX: &str = "TM1.";
pub const CODE_MAX_CHARS: usize = 48 * 1024;
pub const MAX_INFLATED_BYTES: u64 = 4 * 1024 * 1024;

const ENGINE: GeneralPurpose = GeneralPurpose::new(
    &alphabet::URL_SAFE,
    GeneralPurposeConfig::new().with_encode_padding(false).with_decode_padding_mode(DecodePaddingMode::Indifferent),
);

fn invalid() -> AppError {
    AppError::coded(ErrorCode::ProfileCode, "not a Three Marks profile code")
}

#[derive(Debug, Clone, PartialEq)]
pub struct Decoded {
    pub name: String,
    pub data: ProfileData,
    pub installed: Option<Vec<String>>,
}

pub fn encode(name: &str, data: &ProfileData, installed: Option<&[String]>) -> AppResult<String> {
    let payload = match installed {
        Some(installed) => json!({ "name": name, "data": data, "installed": installed }),
        None => json!({ "name": name, "data": data }),
    };
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::best());

    encoder.write_all(serde_json::to_string(&payload)?.as_bytes())?;

    Ok(format!("{CODE_PREFIX}{}", ENGINE.encode(encoder.finish()?)))
}

pub fn decode(code: &str) -> AppResult<Decoded> {
    let code = code.trim();
    let body = code.strip_prefix(CODE_PREFIX).filter(|_| code.len() <= CODE_MAX_CHARS).ok_or_else(invalid)?;
    let packed = ENGINE.decode(body).map_err(|_| invalid())?;
    let mut text = String::new();

    ZlibDecoder::new(packed.as_slice()).take(MAX_INFLATED_BYTES).read_to_string(&mut text).map_err(|_| invalid())?;

    let payload: Value = serde_json::from_str(&text).map_err(|_| invalid())?;
    let data = payload.get("data").and_then(Value::as_object).ok_or_else(invalid)?;
    let section = |key: &str| -> AppResult<Map<String, Value>> {
        match data.get(key) {
            None | Some(Value::Null) => Ok(Map::new()),
            Some(Value::Object(map)) => Ok(map.clone()),
            Some(_) => Err(invalid()),
        }
    };
    let name = payload.get("name").and_then(Value::as_str).unwrap_or_default().to_owned();
    let installed = payload.get("installed").and_then(Value::as_array).map(|items| {
        let ids: Vec<String> = items.iter().filter_map(Value::as_str).map(str::to_owned).collect();

        normalize_components(&ids)
    });

    Ok(Decoded { name, data: ProfileData { config: section("config")?, components: section("components")? }, installed })
}
