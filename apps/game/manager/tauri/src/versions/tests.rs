use super::*;

#[test]
fn compares_versions_by_semver() {
    assert_eq!(compare("0.10.0", "0.9.1"), Some(Ordering::Greater));
    assert_eq!(compare("0.2.0", "0.2.0"), Some(Ordering::Equal));
    assert_eq!(compare("0.2.0-beta.1", "0.2.0"), Some(Ordering::Less));
    assert_eq!(compare("garbage", "0.1.0"), None);
}

#[test]
fn only_a_readable_greater_version_is_newer() {
    assert!(is_newer("0.10.0", "0.9.1"));
    assert!(!is_newer("0.2.0", "0.2.0"));
    assert!(!is_newer("garbage", "0.1.0"));
    assert!(!is_newer("0.1.0", "garbage"));
}
