use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value;

use crate::cache::{CacheLocation, CachePlan, CacheResult, CacheTarget};
use crate::catalog::fixtures::catalog;
use crate::catalog::{LoadedCatalog, Localized};
use crate::changelog::{ChangelogRelease, ComponentChange};
use crate::commands::AppInfo;
use crate::components::{ComponentState, Installation, InstalledComponent};
use crate::conflicts::{ConflictReport, DuplicatePackage, ForeignConflict, MissingComponent, OverridingFiles, ReplacedComponent};
use crate::credentials::AccountBinding;
use crate::deep_link::DeepLink;
use crate::detect::client::{Branch, ClientProblem};
use crate::detect::{ClientSource, GameClient, GameVersion};
use crate::error::{AppError, ErrorCode};
use crate::gameface::GamefaceStatus;
use crate::health::{FailureKind, HealthReport, LoadFailure, LogSource};
use crate::install::{ForeignEntry, ForeignLocation};
use crate::patch::{PatchReport, PatchStatus};
use crate::profiles::{ProfileSummary, ProfilesView, MAX_PROFILES};
use crate::report::{ReportItem, ReportPart, ReportPreview, ReportReceipt};
use crate::service::setup::{InstallStep, InstallWarning, PackageSource, ReleaseSummary};
use crate::service::sync::LocalSync;
use crate::service::{AccountLink, ClientsView, InstallOutcome, InstallPlan, SyncReport, SyncStatus, WhatsNew};
use crate::sets::{ComponentSet, SetsView, MAX_SETS};
use crate::settings::ManagerSettings;
use crate::sync::{LibrarySync, SyncOutcome};

pub const UPDATE_ENV: &str = "OTMETKI_UPDATE_FIXTURES";
pub const CLIENT_PATH: &str = r"D:\Игры\Мир танков";

fn contract_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("contract")
}

fn client(path: &str, version: &str, problem: Option<ClientProblem>) -> GameClient {
    let root = PathBuf::from(path);

    GameClient {
        mods_dir: root.join("mods").join(version),
        res_mods_dir: root.join("res_mods").join(version),
        path: root,
        version: GameVersion::parse(version).unwrap(),
        branch: Branch::Release,
        realm: Some("RU".into()),
        package_mask: "*.mtmod".into(),
        problem,
        source: ClientSource::Lgc,
        preferred: true,
    }
}

fn samples() -> Vec<(&'static str, Value)> {
    let main = client(CLIENT_PATH, "1.45.0.0", None);
    let installation = Installation {
        installed: true,
        client_path: main.path.clone(),
        game_version: main.version,
        manifest_game_version: Some("1.45.0.0".into()),
        mods_dir: main.mods_dir.clone(),
        modpack_version: Some("0.1.0".into()),
        installed_at: Some("2026-09-27 21:47:05".into()),
        needs_migration: false,
        components: vec![
            InstalledComponent {
                id: "core".into(),
                state: ComponentState::Enabled,
                file: Some("net.triotmetki.core_0.1.0.mtmod".into()),
                version: Some("0.1.0".into()),
            },
            InstalledComponent {
                id: "hit_log".into(),
                state: ComponentState::Disabled,
                file: Some("net.triotmetki.hit_log_0.1.0.mtmod".into()),
                version: Some("0.1.0".into()),
            },
            InstalledComponent { id: "damage_log".into(), state: ComponentState::Missing, file: None, version: None },
        ],
    };
    let reports = vec![
        PatchReport::default(),
        report(PatchStatus::UpToDate { game_version: "1.45.0.0".into(), modpack_version: Some("0.1.0".into()) }),
        report(PatchStatus::UpdateAvailable {
            game_version: "1.45.0.0".into(),
            current: Some("0.1.0".into()),
            latest: "0.2.0".into(),
            notes: Some(Localized { ru: "Исправления".into(), en: "Fixes".into() }),
        }),
        report(PatchStatus::Migrated { from: "1.45.0.0".into(), to: "1.46.0.0".into(), modpack_version: Some("0.1.0".into()) }),
        report(PatchStatus::Updated { game_version: "1.46.0.0".into(), from: Some("0.1.0".into()), to: "0.2.0".into() }),
        report(PatchStatus::Waiting { game_version: "1.46.0.0".into(), from: "1.45.0.0".into() }),
        report(PatchStatus::Offline { game_version: "1.46.0.0".into() }),
        report(PatchStatus::NotInstalled { game_version: "1.45.0.0".into() }),
        report(PatchStatus::NoClient),
        report(PatchStatus::MigrationReady { game_version: "1.46.0.0".into(), from: "1.45.0.0".into(), modpack_version: Some("0.1.0".into()) }),
        report(PatchStatus::UpdateReady {
            game_version: "1.46.0.0".into(),
            from: "1.45.0.0".into(),
            current: Some("0.1.0".into()),
            latest: "0.2.0".into(),
            notes: None,
        }),
        report(PatchStatus::Deferred { game_version: "1.46.0.0".into(), from: "1.45.0.0".into() }),
        report(PatchStatus::Unsupported { game_version: "1.30.0.0".into() }),
        report(PatchStatus::Failed { code: ErrorCode::FileLocked }),
    ];

    vec![
        (
            "app-info",
            value(&AppInfo {
                version: "0.1.0".into(),
                state_root: r"C:\Users\Игрок\AppData\Local\TriOtmetki".into(),
                roaming_root: r"C:\Users\Игрок\AppData\Roaming\TriOtmetki".into(),
                logs_dir: r"C:\Users\Игрок\AppData\Local\TriOtmetki\manager\logs".into(),
                api_url: "https://api.triotmetki.ru".into(),
            }),
        ),
        (
            "clients",
            value(&ClientsView {
                clients: vec![main.clone(), client(r"D:\Games\WoT", "2.4.1.0", Some(ClientProblem::NotLesta))],
                selected: Some(main.path.clone()),
            }),
        ),
        (
            "catalog",
            value(&Some(LoadedCatalog { catalog: catalog(), previews_dir: Some(r"C:\Users\Игрок\AppData\Local\TriOtmetki\manager".into()) })),
        ),
        ("installation", value(&installation)),
        (
            "install-outcome",
            value(&InstallOutcome {
                installation: installation.clone(),
                warnings: vec![InstallWarning { step: InstallStep::Dependencies, code: ErrorCode::Http }],
            }),
        ),
        (
            "profiles",
            value(&ProfilesView {
                max: MAX_PROFILES,
                active: Some("a1b2c3d4e5f6".into()),
                profiles: vec![ProfileSummary {
                    id: "a1b2c3d4e5f6".into(),
                    name: "Стрим".into(),
                    created: Some(1_790_000_000.5),
                    updated: Some(1_790_000_100.25),
                    active: true,
                }],
            }),
        ),
        (
            "settings",
            value(&ManagerSettings {
                selected_client: Some(main.path.clone()),
                manual_clients: vec![main.path.clone()],
                ..ManagerSettings::default()
            }),
        ),
        ("patch-reports", value(&reports)),
        ("gameface-status", value(&GamefaceStatus { restart_expected: true })),
        ("error", value(&AppError::coded(ErrorCode::Busy, "another operation is running"))),
        (
            "install-plan",
            value(&InstallPlan {
                client: main.clone(),
                catalog: Some(LoadedCatalog { catalog: catalog(), previews_dir: None }),
                release: Some(ReleaseSummary {
                    version: "0.1.0".into(),
                    notes: Some(Localized { ru: "Первый выпуск".into(), en: "First release".into() }),
                }),
                source: PackageSource::Release,
                other_mods: vec![
                    ForeignEntry {
                        path: main.mods_dir.join("izeberg.modssettingsapi_1.6.0.mtmod"),
                        name: "izeberg.modssettingsapi_1.6.0.mtmod".into(),
                        is_dir: false,
                        location: ForeignLocation::Mods,
                    },
                    ForeignEntry { path: main.res_mods_dir.join("gui"), name: "gui".into(), is_dir: true, location: ForeignLocation::ResMods },
                ],
                installed: true,
                current_components: vec!["core".into(), "companion".into(), "hit_log".into()],
                parked_components: vec!["hit_log".into()],
            }),
        ),
        (
            "install-plan-offline",
            value(&InstallPlan {
                client: main.clone(),
                catalog: None,
                release: None,
                source: PackageSource::Offline,
                other_mods: Vec::new(),
                installed: false,
                current_components: Vec::new(),
                parked_components: Vec::new(),
            }),
        ),
        (
            "conflicts",
            value(&ConflictReport {
                missing: vec![MissingComponent { id: "marks_panel".into() }],
                replaced: vec![ReplacedComponent { id: "hit_log".into(), file: "net.triotmetki.hit_log_0.1.0.mtmod".into() }],
                duplicates: vec![DuplicatePackage {
                    package_id: "net.openwg.gameface".into(),
                    files: vec!["deps/net.openwg.gameface_1.2.0.mtmod".into(), "net.openwg.gameface_1.2.2.mtmod".into()],
                    ours: false,
                }],
                foreign: vec![ForeignConflict {
                    rule: "xvm".into(),
                    file: "com.modxvm.xfw.native_12.0.0.wotmod".into(),
                    package_id: "com.modxvm.xfw.native".into(),
                    components: vec!["damage_log".into()],
                }],
                overrides: vec![OverridingFiles {
                    file: "res_mods/1.45.0.0".into(),
                    location: ForeignLocation::ResMods,
                    paths: vec!["scripts/client/gui/mods/mod_otmetki_hit_log.pyc".into()],
                    count: 1,
                }],
            }),
        ),
        (
            "sets",
            value(&SetsView {
                max: MAX_SETS,
                sets: vec![ComponentSet {
                    id: "a1b2c3d4e5f6".into(),
                    name: "Стрим".into(),
                    components: vec!["core".into(), "companion".into(), "marks_panel".into()],
                    created: 1_790_000_000.5,
                    updated: 1_790_000_100.25,
                }],
            }),
        ),
        (
            "cache-plan",
            value(&CachePlan {
                targets: vec![
                    CacheTarget {
                        id: "MirTankov/web_cache".into(),
                        name: "web_cache".into(),
                        location: CacheLocation::AppData,
                        path: r"C:\Users\Игрок\AppData\Roaming\Lesta\MirTankov\web_cache".into(),
                        size_bytes: 538_968_064,
                        files: 1204,
                    },
                    CacheTarget {
                        id: "game/win64/Reports".into(),
                        name: "win64/Reports".into(),
                        location: CacheLocation::Game,
                        path: main.path.join("win64").join("Reports"),
                        size_bytes: 4096,
                        files: 1,
                    },
                ],
                total_bytes: 538_972_160,
            }),
        ),
        (
            "cache-result",
            value(&CacheResult { freed_bytes: 538_968_064, cleared: vec!["MirTankov/web_cache".into()], failed: vec!["game/win64/Reports".into()] }),
        ),
        (
            "deep-links",
            value(&vec![
                DeepLink::Open,
                DeepLink::Profile { code: "TM1.eJyrVkrLz1eyUkpKLFKqBQApfgT-".into() },
                DeepLink::Install { preset: Some("minimal".into()) },
                DeepLink::Install { preset: None },
            ]),
        ),
        (
            "account-link",
            value(&AccountLink {
                accounts: vec![AccountBinding { account_id: 12_345_678, device_id: "dev_Q2xpZW50MTIz".into(), bound_at: Some(1_790_000_000.0) }],
                selected: Some(12_345_678),
            }),
        ),
        (
            "sync-status",
            value(&SyncStatus {
                linked: true,
                sets: LocalSync { synced_at: Some(1_790_000_000.5), pending: 2 },
                profiles: Some(LocalSync { synced_at: None, pending: 1 }),
            }),
        ),
        (
            "sync-report",
            value(&SyncReport {
                sets: LibrarySync { outcome: SyncOutcome::Conflict, local: 3, remote: 4, local_changes: 1, remote_changes: 2 },
                profiles: Some(LibrarySync { outcome: SyncOutcome::Pushed, local: 2, remote: 1, local_changes: 1, remote_changes: 0 }),
            }),
        ),
        (
            "whats-new",
            value(&WhatsNew {
                releases: vec![ChangelogRelease {
                    version: "0.2.0".into(),
                    published_at: "2026-10-01T10:00:00.000Z".into(),
                    games: vec!["1.46.*".into()],
                    notes: Some(Localized { ru: "Новое окно настроек".into(), en: "A new settings window".into() }),
                    changes: vec![
                        ComponentChange {
                            id: "hit_log".into(),
                            version: Some("0.3.0".into()),
                            notes: Some(Localized { ru: "Лог попаданий быстрее".into(), en: "A faster hit log".into() }),
                        },
                        ComponentChange { id: "minimap".into(), version: None, notes: None },
                    ],
                }],
                offline: false,
                installed_version: Some("0.2.0".into()),
                fresh_components: vec!["hit_log".into(), "minimap".into()],
                show_card: true,
            }),
        ),
        (
            "report-preview",
            value(&ReportPreview {
                id: "0123456789abcdef0123456789abcdef".into(),
                manager_version: "0.2.0".into(),
                modpack_version: Some("0.2.0".into()),
                game_version: Some("1.45.0.0".into()),
                items: vec![
                    ReportItem {
                        part: ReportPart::Environment,
                        name: "environment.txt".into(),
                        bytes: 32,
                        truncated: false,
                        redactions: 0,
                        text: "manager: 0.2.0\nmodpack: 0.2.0\n".into(),
                    },
                    ReportItem {
                        part: ReportPart::PythonLog,
                        name: "python.log".into(),
                        bytes: 40,
                        truncated: true,
                        redactions: 1,
                        text: "…\nC:\\Users\\<user>\\Games\n".into(),
                    },
                ],
            }),
        ),
        (
            "report-receipt",
            value(&ReportReceipt { id: "3f2b1c4d-0000-4000-8000-000000000001".into(), expires_at: "2026-10-30T10:00:00.000Z".into() }),
        ),
        (
            "game-health",
            value(&HealthReport {
                log_time: Some("2026-09-30T21:47:05+03:00".into()),
                stale: false,
                failures: vec![LoadFailure {
                    component: "hit_log".into(),
                    kind: FailureKind::Dependency,
                    source: LogSource::PythonLog,
                    excerpt: "ImportError: No module named gambiter".into(),
                }],
            }),
        ),
    ]
}

fn report(status: PatchStatus) -> PatchReport {
    PatchReport { status, client_path: Some(CLIENT_PATH.into()), checked_at: Some("2026-09-28T10:00:00+03:00".into()) }
}

fn value<T: Serialize>(item: &T) -> Value {
    serde_json::to_value(item).unwrap()
}

#[test]
fn the_ui_contract_fixtures_are_current() {
    let update = std::env::var_os(UPDATE_ENV).is_some();
    let mut stale = Vec::new();

    for (name, value) in samples() {
        let path = contract_dir().join(format!("{name}.json"));
        let text = format!("{}\n", serde_json::to_string_pretty(&value).unwrap());

        if update {
            fs::create_dir_all(contract_dir()).unwrap();
            fs::write(&path, &text).unwrap();
        } else if fs::read_to_string(&path).map(|current| current.replace("\r\n", "\n")).ok().as_deref() != Some(text.as_str()) {
            stale.push(name);
        }
    }

    assert!(stale.is_empty(), "stale contract fixtures {stale:?}: rerun with {UPDATE_ENV}=1");
}
