use super::HTTPS;

pub struct SourceRule {
    pub host: &'static str,
    pub path: &'static str,
}

pub const DEPENDENCY_SOURCES: [SourceRule; 4] = [
    SourceRule { host: "gitlab.com", path: "/-/project/68695173/uploads/" },
    SourceRule { host: "gitlab.com", path: "/openwg/wot.gameface/-/raw/" },
    SourceRule { host: "gitlab.com", path: "/-/project/26509092/uploads/" },
    SourceRule { host: "gitlab.com", path: "/wot-public-mods/mods-list/-/raw/" },
];

fn matches(url: &reqwest::Url, rules: &[SourceRule]) -> bool {
    let plain = url.scheme() == HTTPS && url.port().is_none() && url.username().is_empty() && url.password().is_none();
    let host = url.host_str().map(|host| host.trim_end_matches('.').to_ascii_lowercase());

    plain && rules.iter().any(|rule| host.as_deref() == Some(rule.host) && url.path().starts_with(rule.path))
}

pub fn is_dependency_source(url: &str) -> bool {
    reqwest::Url::parse(url).is_ok_and(|parsed| matches(&parsed, &DEPENDENCY_SOURCES))
}

pub fn is_dependency_redirect(url: &reqwest::Url) -> bool {
    matches(url, &DEPENDENCY_SOURCES)
}
