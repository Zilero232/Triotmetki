use std::collections::BTreeSet;
use std::fs;

use super::*;
use crate::catalog::fixtures::catalog;
use crate::detect::fixtures::{lesta_client, patch_client};
use crate::detect::GameClient;
use crate::error::ErrorCode;
use crate::install::{remove_our_files, selection};
use crate::releases::sha256_hex;

const GAMEFACE: &str = "openwg_gameface";
const MODSLIST: &str = "modslist";
const LICENCE: &[u8] = b"MIT License\n\nCopyright (c) test";

fn body(id: &str) -> Vec<u8> {
    format!("{id} package").into_bytes()
}

fn test_catalog() -> Catalog {
    let mut catalog = catalog();

    for dependency in &mut catalog.dependencies {
        let bytes = body(&dependency.id);

        dependency.sha256 = sha256_hex(&bytes);
        dependency.size = bytes.len() as u64;
        dependency.licence.sha256 = sha256_hex(LICENCE);
    }

    catalog
}

fn fetched(catalog: &Catalog, id: &str) -> FetchedDependency {
    let dependency = catalog.dependency(id).unwrap().clone();

    FetchedDependency { bytes: body(id), licence: LICENCE.to_vec(), dependency }
}

fn ids(items: &[&str]) -> BTreeSet<String> {
    items.iter().map(|id| (*id).to_owned()).collect()
}

struct Setup {
    root: tempfile::TempDir,
    client: GameClient,
    catalog: Catalog,
}

impl Setup {
    fn new() -> Self {
        let root = tempfile::tempdir().unwrap();
        let client = lesta_client(root.path(), "1.45.0.0");

        Self { root, client, catalog: test_catalog() }
    }

    fn client_dir(&self) -> PathBuf {
        self.root.path().join("state")
    }

    fn install(&self, wanted: &[&str], fetched: &[FetchedDependency]) -> AppResult<Vec<String>> {
        let client_dir = self.client_dir();
        let context = ClientContext { client_dir: &client_dir, client: &self.client, catalog: &self.catalog };

        install(InstallDependenciesInput { context, wanted: &ids(wanted), fetched })
    }

    fn manifest(&self) -> Manifest {
        Manifest::read(&self.client_dir()).unwrap().unwrap()
    }
}

#[test]
fn resolves_the_dependencies_of_the_selected_components() {
    let catalog = test_catalog();
    let resolve_for = |components: &[&str]| {
        let components = selection(&catalog, &components.iter().map(|id| (*id).to_owned()).collect::<Vec<_>>()).unwrap();

        resolve(ResolveInput { catalog: &catalog, components: &components })
    };

    assert_eq!(resolve_for(&[]), BTreeSet::new());
    assert_eq!(resolve_for(&["marks_panel"]), ids(&[GAMEFACE]));
    assert_eq!(resolve_for(&["hit_log"]), ids(&[GAMEFACE, MODSLIST]));
}

#[test]
fn recognises_any_version_of_a_dependency_by_its_package_id() {
    let catalog = test_catalog();
    let modslist = catalog.dependency(MODSLIST).unwrap();

    assert!(is_copy_of(modslist, "me.poliroid.modslistapi_1.6.00.mtmod"));
    assert!(is_copy_of(modslist, "ME.POLIROID.MODSLISTAPI_1.6.01.WOTMOD"));
    assert!(is_copy_of(modslist, "me.poliroid.modslistapi.wotmod"));
    assert!(!is_copy_of(modslist, "me.poliroid.modslistapix_1.6.01.mtmod"));
    assert!(!is_copy_of(modslist, "me.poliroid.modslistapi_1.6.01.zip"));
}

#[test]
fn installs_a_missing_dependency_as_ours_with_its_licence() {
    let setup = Setup::new();
    let installed = setup.install(&[GAMEFACE], &[fetched(&setup.catalog, GAMEFACE)]).unwrap();
    let record = setup.manifest().dependency(GAMEFACE).cloned().unwrap();

    assert_eq!(installed, vec![GAMEFACE]);
    assert_eq!(fs::read(setup.client.mods_dir.join("net.openwg.gameface_1.2.2.mtmod")).unwrap(), body(GAMEFACE));
    assert_eq!(fs::read(notice_path(&setup.client_dir(), GAMEFACE).unwrap()).unwrap(), LICENCE);
    assert_eq!(record.owner, DependencyOwner::Ours);
    assert_eq!(record.sha256, sha256_hex(&body(GAMEFACE)));
}

#[test]
fn never_takes_over_a_dependency_the_player_installed_first() {
    let setup = Setup::new();
    let theirs = setup.client.mods_dir.join("me.poliroid.modslistapi_1.6.00.mtmod");

    fs::write(&theirs, "their build").unwrap();

    let client_dir = setup.client_dir();
    let context = ClientContext { client_dir: &client_dir, client: &setup.client, catalog: &setup.catalog };
    let downloads = to_download(DownloadPlanInput { context, wanted: &ids(&[MODSLIST]), removing: &[] }).unwrap();

    assert!(downloads.is_empty());

    setup.install(&[MODSLIST], &[fetched(&setup.catalog, MODSLIST)]).unwrap();

    let record = setup.manifest().dependency(MODSLIST).cloned().unwrap();

    assert_eq!(record.owner, DependencyOwner::User);
    assert_eq!(record.file, "me.poliroid.modslistapi_1.6.00.mtmod");
    assert!(!setup.client.mods_dir.join("me.poliroid.modslistapi_1.6.01.mtmod").exists());

    let removed = remove_owned(context).unwrap();

    assert!(removed.is_empty());
    assert_eq!(fs::read_to_string(&theirs).unwrap(), "their build");
}

#[test]
fn treats_the_same_file_found_before_the_install_as_the_players() {
    let setup = Setup::new();
    let file = setup.client.mods_dir.join("me.poliroid.modslistapi_1.6.01.mtmod");

    fs::write(&file, body(MODSLIST)).unwrap();
    setup.install(&[MODSLIST], &[]).unwrap();

    let client_dir = setup.client_dir();
    let context = ClientContext { client_dir: &client_dir, client: &setup.client, catalog: &setup.catalog };

    assert_eq!(statuses(context).unwrap().iter().find(|status| status.id == MODSLIST).unwrap().state, DependencyState::User);

    remove_our_files(context).unwrap();

    assert!(file.exists());
}

#[test]
fn downloads_a_dependency_whose_only_copy_the_player_removes() {
    let setup = Setup::new();
    let theirs = setup.client.mods_dir.join("me.poliroid.modslistapi_1.6.00.mtmod");

    fs::write(&theirs, "their build").unwrap();

    let client_dir = setup.client_dir();
    let context = ClientContext { client_dir: &client_dir, client: &setup.client, catalog: &setup.catalog };
    let downloads = to_download(DownloadPlanInput { context, wanted: &ids(&[MODSLIST]), removing: std::slice::from_ref(&theirs) }).unwrap();

    assert_eq!(downloads.iter().map(|dependency| dependency.id.as_str()).collect::<Vec<_>>(), vec![MODSLIST]);
}

#[test]
fn uninstall_removes_only_the_dependencies_we_own() {
    let setup = Setup::new();
    let theirs = setup.client.mods_dir.join("me.poliroid.modslistapi_1.6.00.mtmod");

    fs::write(&theirs, "their build").unwrap();
    setup.install(&[GAMEFACE, MODSLIST], &[fetched(&setup.catalog, GAMEFACE)]).unwrap();

    let client_dir = setup.client_dir();
    let context = ClientContext { client_dir: &client_dir, client: &setup.client, catalog: &setup.catalog };
    let removed = remove_our_files(context).unwrap();

    assert!(removed.contains(&setup.client.mods_dir.join("net.openwg.gameface_1.2.2.mtmod")));
    assert!(!setup.client.mods_dir.join("net.openwg.gameface_1.2.2.mtmod").exists());
    assert!(!notices_dir(&client_dir).join(GAMEFACE).exists());
    assert!(theirs.exists());
}

#[test]
fn keeps_a_file_the_player_put_over_ours() {
    let setup = Setup::new();
    let file = setup.client.mods_dir.join("net.openwg.gameface_1.2.2.mtmod");

    setup.install(&[GAMEFACE], &[fetched(&setup.catalog, GAMEFACE)]).unwrap();
    fs::write(&file, "their own gameface build").unwrap();

    let client_dir = setup.client_dir();
    let context = ClientContext { client_dir: &client_dir, client: &setup.client, catalog: &setup.catalog };

    assert_eq!(statuses(context).unwrap().iter().find(|status| status.id == GAMEFACE).unwrap().state, DependencyState::User);
    assert!(remove_owned(context).unwrap().is_empty());
    assert!(file.exists());
}

#[test]
fn replaces_an_outdated_dependency_we_own() {
    let setup = Setup::new();
    let mut older = setup.catalog.clone();
    let old_bytes = b"gameface 1.2.1".to_vec();

    if let Some(dependency) = older.dependencies.iter_mut().find(|dependency| dependency.id == GAMEFACE) {
        dependency.file = "net.openwg.gameface_1.2.1.mtmod".into();
        dependency.sha256 = sha256_hex(&old_bytes);
        dependency.size = old_bytes.len() as u64;
    }

    let client_dir = setup.client_dir();
    let old_context = ClientContext { client_dir: &client_dir, client: &setup.client, catalog: &older };
    let old_fetched = FetchedDependency { dependency: older.dependency(GAMEFACE).unwrap().clone(), bytes: old_bytes, licence: LICENCE.to_vec() };

    install(InstallDependenciesInput { context: old_context, wanted: &ids(&[GAMEFACE]), fetched: &[old_fetched] }).unwrap();

    let context = ClientContext { client_dir: &client_dir, client: &setup.client, catalog: &setup.catalog };

    assert_eq!(statuses(context).unwrap().iter().find(|status| status.id == GAMEFACE).unwrap().state, DependencyState::Outdated);

    setup.install(&[GAMEFACE], &[fetched(&setup.catalog, GAMEFACE)]).unwrap();

    assert!(!setup.client.mods_dir.join("net.openwg.gameface_1.2.1.mtmod").exists());
    assert!(setup.client.mods_dir.join("net.openwg.gameface_1.2.2.mtmod").exists());
    assert_eq!(setup.manifest().dependency(GAMEFACE).unwrap().file, "net.openwg.gameface_1.2.2.mtmod");
}

#[test]
fn rejects_a_dependency_whose_sha256_differs() {
    let setup = Setup::new();
    let mut tampered = fetched(&setup.catalog, GAMEFACE);

    tampered.bytes = b"tampered".to_vec();

    assert_eq!(setup.install(&[GAMEFACE], &[tampered]).unwrap_err().code(), ErrorCode::ChecksumMismatch);
    assert!(find_copies(&setup.client.mods_dir, setup.catalog.dependency(GAMEFACE).unwrap()).is_empty());

    let mut bad_licence = fetched(&setup.catalog, GAMEFACE);

    bad_licence.licence = b"not the pinned licence".to_vec();

    assert_eq!(verify(&bad_licence).unwrap_err().code(), ErrorCode::ChecksumMismatch);
    assert_eq!(setup.install(&[GAMEFACE], &[bad_licence]).unwrap_err().code(), ErrorCode::ChecksumMismatch);
    assert!(!notices_dir(&setup.client_dir()).exists());
}

#[test]
fn carries_owned_dependencies_into_the_new_mods_folder() {
    let setup = Setup::new();

    setup.install(&[GAMEFACE], &[fetched(&setup.catalog, GAMEFACE)]).unwrap();

    let old_mods_dir = setup.client.mods_dir.clone();
    let patched = patch_client(&setup.client.path, "1.46.0.0");
    let client_dir = setup.client_dir();
    let context = ClientContext { client_dir: &client_dir, client: &patched, catalog: &setup.catalog };
    let carried = carry(CarryInput { context, from_mods_dir: &old_mods_dir }).unwrap();

    assert_eq!(carried, vec!["net.openwg.gameface_1.2.2.mtmod"]);
    assert_eq!(fs::read(patched.mods_dir.join("net.openwg.gameface_1.2.2.mtmod")).unwrap(), body(GAMEFACE));
}

#[test]
fn enabling_a_component_needs_the_dependencies_of_everything_it_pulls_in() {
    let catalog = test_catalog();

    assert_eq!(needed_to_enable(&catalog, "marks_panel"), ids(&[GAMEFACE]));
    assert_eq!(needed_to_enable(&catalog, "hit_log"), ids(&[GAMEFACE, MODSLIST]));
    assert_eq!(needed_to_enable(&catalog, "core"), BTreeSet::new());
}

#[test]
fn enabling_a_component_never_pulls_in_an_optional_dependency_the_wizard_installs() {
    let mut catalog = test_catalog();

    catalog.dependencies.iter_mut().filter(|dependency| dependency.id == MODSLIST).for_each(|dependency| dependency.optional = true);

    let components = selection(&catalog, &["hit_log".to_owned()]).unwrap();

    assert_eq!(needed_to_enable(&catalog, "hit_log"), ids(&[GAMEFACE]));
    assert_eq!(resolve(ResolveInput { catalog: &catalog, components: &components }), ids(&[GAMEFACE, MODSLIST]));
}

#[test]
fn an_update_picks_the_owned_dependencies_the_catalog_pins_newer() {
    let setup = Setup::new();
    let theirs = setup.client.mods_dir.join("me.poliroid.modslistapi_1.6.00.mtmod");
    let mut older = setup.catalog.clone();
    let old_bytes = b"gameface 1.2.1".to_vec();

    fs::write(&theirs, "their build").unwrap();

    if let Some(dependency) = older.dependencies.iter_mut().find(|dependency| dependency.id == GAMEFACE) {
        dependency.file = "net.openwg.gameface_1.2.1.mtmod".into();
        dependency.sha256 = sha256_hex(&old_bytes);
    }

    let client_dir = setup.client_dir();
    let old_context = ClientContext { client_dir: &client_dir, client: &setup.client, catalog: &older };
    let old_fetched = FetchedDependency { dependency: older.dependency(GAMEFACE).unwrap().clone(), bytes: old_bytes, licence: LICENCE.to_vec() };

    install(InstallDependenciesInput { context: old_context, wanted: &ids(&[GAMEFACE, MODSLIST]), fetched: &[old_fetched] }).unwrap();

    let old_mods_dir = setup.client.mods_dir.clone();
    let patched = patch_client(&setup.client.path, "1.46.0.0");
    let context = ClientContext { client_dir: &client_dir, client: &patched, catalog: &setup.catalog };

    assert_eq!(updates(UpdatesInput { context: old_context, from_mods_dir: None }).unwrap(), BTreeSet::new());
    assert_eq!(updates(UpdatesInput { context, from_mods_dir: Some(&old_mods_dir) }).unwrap(), ids(&[GAMEFACE]));
    assert_eq!(updates(UpdatesInput { context, from_mods_dir: None }).unwrap(), BTreeSet::new());

    let downloads = to_download(DownloadPlanInput { context, wanted: &ids(&[GAMEFACE]), removing: &[] }).unwrap();

    assert_eq!(downloads.iter().map(|dependency| dependency.file.as_str()).collect::<Vec<_>>(), vec!["net.openwg.gameface_1.2.2.mtmod"]);

    carry(CarryInput { context, from_mods_dir: &old_mods_dir }).unwrap();
    install(InstallDependenciesInput { context, wanted: &ids(&[GAMEFACE]), fetched: &[fetched(&setup.catalog, GAMEFACE)] }).unwrap();

    let manifest = setup.manifest();

    assert!(!patched.mods_dir.join("net.openwg.gameface_1.2.1.mtmod").exists());
    assert_eq!(fs::read(patched.mods_dir.join("net.openwg.gameface_1.2.2.mtmod")).unwrap(), body(GAMEFACE));
    assert_eq!(manifest.dependency(GAMEFACE).unwrap().file, "net.openwg.gameface_1.2.2.mtmod");
    assert_eq!(manifest.dependency(MODSLIST).unwrap().owner, DependencyOwner::User);
    assert_eq!(fs::read_to_string(&theirs).unwrap(), "their build");
    assert_eq!(updates(UpdatesInput { context, from_mods_dir: Some(&old_mods_dir) }).unwrap(), BTreeSet::new());
}
