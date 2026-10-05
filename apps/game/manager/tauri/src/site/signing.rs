use hmac::{Hmac, Mac};
use sha2::Sha256;

use super::{NONCE_BYTES, SIGNATURE_PREFIX, SIGNATURE_VERSION};
use crate::error::{AppError, AppResult, ErrorCode};

pub struct SignedMessage<'a> {
    pub method: &'a str,
    pub path: &'a str,
    pub timestamp: &'a str,
    pub nonce: &'a str,
    pub body: &'a [u8],
}

pub fn signed_message(message: &SignedMessage) -> Vec<u8> {
    let lines = [SIGNATURE_VERSION, &message.method.to_uppercase(), message.path, message.timestamp, message.nonce];
    let mut bytes = format!("{}\n", lines.join("\n")).into_bytes();

    bytes.extend_from_slice(message.body);
    bytes
}

pub fn sign(secret: &str, message: &[u8]) -> AppResult<String> {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).map_err(|error| AppError::coded(ErrorCode::NotLinked, error.to_string()))?;

    mac.update(message);

    Ok(format!("{SIGNATURE_PREFIX}{}", hex::encode(mac.finalize().into_bytes())))
}

pub fn new_nonce() -> String {
    let mut bytes = [0; NONCE_BYTES];

    if getrandom::fill(&mut bytes).is_err() {
        let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|time| time.as_nanos()).unwrap_or_default();

        bytes.copy_from_slice(&nanos.to_le_bytes()[..NONCE_BYTES]);
    }

    hex::encode(bytes)
}
