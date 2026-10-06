use serde::Serialize;
use tauri::Url;

use crate::profiles::CODE_PREFIX;

pub const SCHEME: &str = "triotmetki";
pub const EVENT: &str = "deep-link";
pub const MAX_LINK_LENGTH: usize = 64 * 1024;
pub const PRESET_PATTERN_MAX: usize = 32;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DeepLink {
    Open,
    Profile { code: String },
    Install { preset: Option<String> },
}

fn valid_preset(preset: &str) -> bool {
    !preset.is_empty() && preset.len() <= PRESET_PATTERN_MAX && preset.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

pub fn parse(url: &Url) -> Option<DeepLink> {
    if url.as_str().len() > MAX_LINK_LENGTH || url.scheme() != SCHEME {
        return None;
    }

    let path = url.path().trim_start_matches('/').trim_end_matches('/');

    match (url.host_str().unwrap_or_default(), path) {
        ("" | "open", "") => Some(DeepLink::Open),
        ("profile", code) if code.starts_with(CODE_PREFIX) => Some(DeepLink::Profile { code: code.to_owned() }),
        ("install", "") => Some(DeepLink::Install {
            preset: url.query_pairs().find(|(key, _)| key == "preset").map(|(_, preset)| preset.into_owned()).filter(|preset| valid_preset(preset)),
        }),
        _ => None,
    }
}

pub fn first_link<'a>(urls: impl IntoIterator<Item = &'a Url>) -> Option<DeepLink> {
    urls.into_iter().find_map(parse)
}

pub fn first_arg_link<'a>(args: impl IntoIterator<Item = &'a str>) -> Option<DeepLink> {
    args.into_iter().filter(|arg| arg.len() <= MAX_LINK_LENGTH).find_map(|arg| Url::parse(arg.trim()).ok().as_ref().and_then(parse))
}

#[cfg(test)]
mod tests;
