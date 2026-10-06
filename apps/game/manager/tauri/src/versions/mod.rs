use std::cmp::Ordering;

use semver::Version;

pub fn compare(left: &str, right: &str) -> Option<Ordering> {
    Some(Version::parse(left).ok()?.cmp(&Version::parse(right).ok()?))
}

pub fn is_newer(version: &str, than: &str) -> bool {
    compare(version, than) == Some(Ordering::Greater)
}

#[cfg(test)]
mod tests;
