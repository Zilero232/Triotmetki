use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use minisign_verify::{PublicKey, Signature};

use super::{sha256_hex, Release, ReleasePackage};
use crate::error::{AppError, AppResult, ErrorCode};

pub const RELEASE_PUBLIC_KEY: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDk4RjE3QzUzQzAxMkEwNEEKUldSS29CTEFVM3p4bU9mc3dpaEcwcHdyT1VhaXlMbXVneXltMXBOQ3V1ZUF2dnhBRE1pd1VjcTAK";
pub const PAYLOAD_HEADER: &str = "otmetki-modpack-release/2";
pub const LEGACY_PAYLOAD_HEADER: &str = "otmetki-modpack-release/1";
pub const NO_CATALOG: &str = "-";
pub const NO_NOTES: &str = "-";
pub const TIMESTAMP_FIELD: &str = "timestamp:";
pub const TRUSTED_COMMENT_SEPARATOR: char = '\t';
pub const ALLOW_UNSIGNED_ENV: &str = "OTMETKI_ALLOW_UNSIGNED";
pub const ALLOW_LEGACY_SIGNATURES: bool = cfg!(test);
pub const ACCEPT_LEGACY_PAYLOAD: bool = true;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PayloadFormat {
    Legacy,
    Current,
}

fn invalid(reason: impl std::fmt::Display) -> AppError {
    AppError::coded(ErrorCode::SignatureInvalid, format!("release signature: {reason}"))
}

fn notes_line(release: &Release) -> String {
    let notes = release
        .notes
        .as_ref()
        .map_or_else(|| NO_NOTES.to_owned(), |notes| format!("{} {}", sha256_hex(notes.ru.as_bytes()), sha256_hex(notes.en.as_bytes())));

    format!("notes {notes}")
}

pub fn signed_payload(release: &Release, format: PayloadFormat) -> String {
    let mut packages: Vec<&ReleasePackage> = release.packages.iter().collect();

    packages.sort_by(|left, right| left.id.cmp(&right.id));

    let catalog = release.catalog.as_ref().map_or_else(|| NO_CATALOG.to_owned(), |catalog| catalog.sha256.trim().to_ascii_lowercase());
    let header = match format {
        PayloadFormat::Legacy => LEGACY_PAYLOAD_HEADER,
        PayloadFormat::Current => PAYLOAD_HEADER,
    };
    let mut lines =
        vec![header.to_owned(), format!("version {}", release.version), format!("games {}", release.games.join(",")), format!("catalog {catalog}")];

    if format == PayloadFormat::Current {
        lines.push(notes_line(release));
    }

    lines.extend(
        packages
            .iter()
            .map(|package| format!("package {} {} {} {}", package.id, package.file, package.size, package.sha256.trim().to_ascii_lowercase())),
    );

    format!("{}\n", lines.join("\n"))
}

fn decode_text(encoded: &str) -> AppResult<String> {
    let bytes = STANDARD.decode(encoded.trim()).map_err(invalid)?;

    String::from_utf8(bytes).map_err(invalid)
}

pub fn signed_timestamp(signature: &Signature) -> AppResult<u64> {
    signature
        .trusted_comment()
        .split(TRUSTED_COMMENT_SEPARATOR)
        .find_map(|field| field.strip_prefix(TIMESTAMP_FIELD))
        .and_then(|value| value.trim().parse().ok())
        .ok_or_else(|| invalid("no signed timestamp"))
}

pub fn verify_release_with(release: &Release, public_key: &str) -> AppResult<u64> {
    let encoded = release.signature.as_deref().filter(|signature| !signature.trim().is_empty()).ok_or_else(|| invalid("missing"))?;
    let key = PublicKey::decode(&decode_text(public_key)?).map_err(invalid)?;
    let signature = Signature::decode(&decode_text(encoded)?).map_err(invalid)?;
    let matches = |format| key.verify(signed_payload(release, format).as_bytes(), &signature, ALLOW_LEGACY_SIGNATURES);

    if let Err(error) = matches(PayloadFormat::Current) {
        if !ACCEPT_LEGACY_PAYLOAD || matches(PayloadFormat::Legacy).is_err() {
            return Err(invalid(error));
        }

        log::info!("release {} is signed in the legacy payload format", release.version);
    }

    signed_timestamp(&signature)
}

fn unsigned_allowed(release: &Release) -> bool {
    cfg!(debug_assertions) && release.signature.is_none() && std::env::var_os(ALLOW_UNSIGNED_ENV).is_some()
}

pub fn verify_release(release: &Release) -> AppResult<Option<u64>> {
    if unsigned_allowed(release) {
        log::warn!("accepting the unsigned release {} ({ALLOW_UNSIGNED_ENV})", release.version);

        return Ok(None);
    }

    verify_release_with(release, RELEASE_PUBLIC_KEY).map(Some)
}
