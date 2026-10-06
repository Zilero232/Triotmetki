use super::*;

const ANSWER: &str = r#"{"releases":[
  {"version":"0.2.0","publishedAt":"2026-10-01T10:00:00.000Z","games":["1.46.*"],"notes":{"ru":"Новое окно","en":"A new window"},
   "changes":[{"id":"hit_log","version":"0.3.0","notes":{"ru":"Быстрее","en":"Faster"}},{"id":"minimap","version":null,"notes":null}]},
  {"version":"0.1.3","publishedAt":"2026-09-27T10:00:00.000Z","games":["1.45.*"],"notes":null,"changes":[{"id":"core","version":"0.5.0","notes":null}]}
]}"#;

#[test]
fn reads_the_changelog_the_api_answers() {
    let changelog: Changelog = serde_json::from_str(ANSWER).unwrap();

    assert_eq!(changelog.releases.len(), 2);
    assert_eq!(changelog.releases[0].changes[0].notes.as_ref().unwrap().ru, "Быстрее");
    assert_eq!(changelog.releases[0].changes[1].version, None);
}

#[test]
fn marks_the_components_of_the_installed_release_as_new() {
    let changelog: Changelog = serde_json::from_str(ANSWER).unwrap();

    assert_eq!(changelog.fresh_components(Some("0.1.3")), vec!["core"]);
    assert_eq!(changelog.fresh_components(None), vec!["hit_log", "minimap"]);
    assert!(changelog.fresh_components(Some("9.9.9")).is_empty());
}

#[test]
fn keeps_a_copy_for_offline_use() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("менеджер").join("changelog.json");
    let changelog: Changelog = serde_json::from_str(ANSWER).unwrap();

    assert!(Changelog::load(&path).is_none());

    changelog.save(&path).unwrap();

    assert_eq!(Changelog::load(&path), Some(changelog));
}
