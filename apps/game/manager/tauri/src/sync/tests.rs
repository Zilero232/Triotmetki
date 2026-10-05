use serde_json::{json, Map};

use super::profiles::{apply_profiles, local_profiles};
use super::*;
use crate::profiles::{Profile, ProfileData, ProfilesFile};

fn set(id: &str, updated: f64) -> ComponentSet {
    ComponentSet { id: id.into(), name: format!("Набор {id}"), components: vec!["core".into()], created: 1.0, updated }
}

fn tombstone(id: &str, deleted: f64) -> Tombstone {
    Tombstone { id: id.into(), deleted }
}

#[test]
fn counts_local_changes_since_the_last_sync() {
    let sets = [set("a", 5.0), set("b", 20.0)];
    let deleted = [tombstone("c", 30.0), tombstone("d", 1.0)];
    let side = Side { items: &sets, deleted: &deleted };

    assert_eq!(local_changes(&side, None), 4);
    assert_eq!(local_changes(&side, Some(10.0)), 2);
    assert_eq!(local_changes(&side, Some(40.0)), 0);
}

#[test]
fn counts_remote_changes_against_the_local_copy() {
    let local_sets = [set("a", 5.0), set("b", 6.0)];
    let local_deleted = [tombstone("gone", 50.0)];
    let local = Side { items: &local_sets, deleted: &local_deleted };
    let remote_sets = [set("a", 5.0), set("b", 9.0), set("new", 3.0), set("gone", 10.0)];
    let remote_deleted = [tombstone("a", 7.0)];
    let remote = Side { items: &remote_sets, deleted: &remote_deleted };

    assert_eq!(remote_changes(&local, &remote), 3);
    assert_eq!(remote_changes(&local, &local), 0);
}

#[test]
fn decides_by_which_side_changed() {
    let base = SyncBase { synced_at: Some(10.0), revision: Some(3) };
    let step = |local: usize, remote: usize, revision: u64, resolution: Option<Resolution>| decide(local, remote, &base, revision, resolution);

    assert_eq!(step(0, 0, 3, None), Decision { step: Step::Nothing, outcome: SyncOutcome::UpToDate });
    assert_eq!(step(0, 2, 3, None).outcome, SyncOutcome::UpToDate);
    assert_eq!(step(1, 0, 4, None), Decision { step: Step::Put(PutMode::Merge), outcome: SyncOutcome::Pushed });
    assert_eq!(step(0, 2, 4, None), Decision { step: Step::TakeRemote, outcome: SyncOutcome::Pulled });
    assert_eq!(step(1, 2, 4, None), Decision { step: Step::Ask, outcome: SyncOutcome::Conflict });
    assert_eq!(step(1, 2, 4, Some(Resolution::Merge)), Decision { step: Step::Put(PutMode::Merge), outcome: SyncOutcome::Merged });
    assert_eq!(step(1, 2, 4, Some(Resolution::KeepLocal)), Decision { step: Step::Put(PutMode::Replace), outcome: SyncOutcome::Pushed });
    assert_eq!(step(1, 2, 4, Some(Resolution::TakeRemote)), Decision { step: Step::TakeRemote, outcome: SyncOutcome::Pulled });
    assert_eq!(decide(2, 2, &SyncBase::default(), 1, None).outcome, SyncOutcome::Conflict);
    assert_eq!(decide(2, 0, &SyncBase::default(), 0, None).outcome, SyncOutcome::Pushed);
}

#[test]
fn merges_any_stamped_items_with_limits() {
    let local_sets: Vec<ComponentSet> = (0..10).map(|index| set(&format!("l{index}"), f64::from(index))).collect();
    let remote_sets: Vec<ComponentSet> = (0..10).map(|index| set(&format!("r{index}"), f64::from(index) + 0.5)).collect();
    let tombstones: Vec<Tombstone> = (0..5).map(|index| tombstone(&format!("t{index}"), f64::from(index))).collect();
    let merged = merge_items(&Side { items: &local_sets, deleted: &tombstones }, &Side { items: &remote_sets, deleted: &[] }, 12, 3);

    assert_eq!(merged.items.len(), 12);
    assert!(!merged.items.iter().any(|item| item.id == "l0" || item.id == "r0"));
    assert_eq!(merged.deleted.iter().map(|item| item.id.as_str()).collect::<Vec<_>>(), vec!["t2", "t3", "t4"]);
}

fn profile(id: &str, updated: f64) -> Profile {
    let mut config = Map::new();

    config.insert("hud_scale".into(), json!(1.2));
    config.insert("send_battles".into(), json!(true));

    Profile {
        id: id.into(),
        name: format!("Профиль {id}"),
        created: Some(1.0),
        updated: Some(updated),
        data: ProfileData { config, components: Map::new() },
        installed: None,
        extra: Map::new(),
    }
}

#[test]
fn profiles_leave_private_switches_out_and_keep_local_extras() {
    let mut kept = profile("a", 5.0);

    kept.extra.insert("pinned".into(), json!(true));

    let file = ProfilesFile { active: Some("a".into()), profiles: vec![kept, profile("b", 6.0)], ..ProfilesFile::default() };
    let local = local_profiles(&file);

    assert!(local.iter().all(|item| !item.data.config.contains_key("send_battles") && item.data.config.contains_key("hud_scale")));

    let mut remote_a = local[0].clone();

    remote_a.name = "С сайта".into();

    let applied = apply_profiles(
        &file,
        &[
            remote_a,
            SyncProfile { id: "c".into(), name: "Новый".into(), created: None, updated: None, data: ProfileData::default(), installed: None },
        ],
    );

    assert_eq!(applied.active.as_deref(), Some("a"));
    assert_eq!(applied.profiles[0].name, "С сайта");
    assert_eq!(applied.profiles[0].extra.get("pinned"), Some(&json!(true)));
    assert_eq!(applied.profiles.len(), 2);
    assert_eq!(apply_profiles(&file, &[]).active, None);
}

#[test]
fn profile_state_turns_vanished_profiles_into_tombstones() {
    let root = tempfile::tempdir().unwrap();
    let dir = root.path().join("клиент");
    let file = ProfilesFile { profiles: vec![profile("a", 5.0), profile("b", 6.0)], ..ProfilesFile::default() };
    let state = ProfileSyncState::synced(&local_profiles(&file), vec![tombstone("old", 1.0)], 7);

    state.save(&dir).unwrap();

    let loaded = ProfileSyncState::load(&dir);
    let remaining = local_profiles(&ProfilesFile { profiles: vec![profile("a", 5.0)], ..ProfilesFile::default() });
    let tombstones = loaded.tombstones(&remaining);

    assert_eq!(loaded.base().revision, Some(7));
    assert_eq!(tombstones.iter().map(|item| item.id.as_str()).collect::<Vec<_>>(), vec!["old", "b"]);
    assert!(local_changes(&Side { items: &remaining, deleted: &tombstones }, loaded.synced_at) >= 1);
    assert_eq!(ProfileSyncState::load(&root.path().join("нет")), ProfileSyncState::default());
}

#[test]
fn builds_the_signed_bodies_the_server_expects() {
    let mut synced = local_profiles(&ProfilesFile { profiles: vec![profile("a", 2.0)], ..ProfilesFile::default() });

    synced[0].installed = Some(vec!["core".into()]);

    let body = serde_json::to_value(PutProfiles {
        signed: SignedBody { device_id: "dev_1".into(), account_id: 42 },
        profiles: &synced,
        deleted: &[],
        mode: PutMode::Replace,
    })
    .unwrap();

    assert_eq!(body["device_id"], json!("dev_1"));
    assert_eq!(body["account_id"], json!(42));
    assert_eq!(body["mode"], json!("replace"));
    assert_eq!(body["profiles"][0]["updated"], json!(2.0));
    assert_eq!(body["profiles"][0]["installed"], json!(["core"]));

    let remote: RemoteProfiles = serde_json::from_value(json!({
        "profiles": [{ "id": "a", "name": "A", "created": null, "updated": 3.5, "data": { "config": {}, "components": {} } }],
        "deleted": [],
        "revision": 4,
        "updated_at": "2026-09-30T10:00:00.000Z"
    }))
    .unwrap();

    assert_eq!(remote.revision, 4);
    assert_eq!(remote.profiles[0].updated(), 3.5);
}

#[test]
fn a_profile_the_site_returns_without_its_component_list_keeps_the_local_one() {
    let mut local = profile("a", 5.0);

    local.installed = Some(vec!["core".into(), "marks_panel".into()]);

    let file = ProfilesFile { profiles: vec![local], ..ProfilesFile::default() };
    let ours = local_profiles(&file);
    let mut from_site = ours[0].clone();

    from_site.installed = None;

    let local_side = Side { items: &ours, deleted: &[] };
    let remote_side = Side { items: std::slice::from_ref(&from_site), deleted: &[] };

    assert_eq!(from_site, ours[0]);
    assert_eq!(remote_changes(&local_side, &remote_side), 0);
    assert_eq!(apply_profiles(&file, &[from_site]).profiles[0].installed, Some(vec!["core".into(), "marks_panel".into()]));
}
