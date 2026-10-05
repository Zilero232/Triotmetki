use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use zip::write::SimpleFileOptions;

use super::*;
use crate::detect::{ClientSource, GameVersion};

pub const REAL_CLIENT_ENV: &str = "OTMETKI_GAMEFACE_CLIENT";
pub const GAME_VERSION: &str = "1.45.0.0";
pub const GAME_RES_MAP: &[u8] = include_bytes!("fixtures/game_res_map.golden");
pub const UI_CONFIG: &[u8] = include_bytes!("fixtures/configs/net.triotmetki.ui.json");
pub const EXPECTED_RES_MAP: &str = include_str!("fixtures/expected_res_map.golden");
pub const PATHS_XML_TEXT: &str = r#"<root>
  <Paths>
    <Path cacheSubdirs="true">./res_mods/1.45.0.0</Path>
    <Path mask="*.mtmod" mode="recursive" root="res">./mods/1.45.0.0</Path>
    <Packages>
      <Package type="sd,hd">./res/packages/gui-part1.pkg</Package>
    </Packages>
    <Path>./res</Path>
  </Paths>
</root>"#;

fn merged(configs: &[&[u8]], written: Option<&str>) -> Result<String, MergeError> {
    merge(&MergeInputs {
        game: GAME_RES_MAP.to_vec(),
        configs: configs.iter().map(|config| config.to_vec()).collect(),
        written: written.map(|text| text.as_bytes().to_vec()),
    })
}

fn merged_base(game: &str, configs: &[&str], written: Option<&str>) -> Result<String, MergeError> {
    merge(&MergeInputs {
        game: game.as_bytes().to_vec(),
        configs: configs.iter().map(|config| config.as_bytes().to_vec()).collect(),
        written: written.map(|text| text.as_bytes().to_vec()),
    })
}

fn write_zip(path: &Path, files: &[(&str, &[u8])]) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();

    let mut writer = zip::ZipWriter::new(fs::File::create(path).unwrap());
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for (name, bytes) in files {
        writer.start_file(*name, options).unwrap();
        writer.write_all(bytes).unwrap();
    }

    writer.finish().unwrap();
}

fn gameface_meta(version: &str) -> String {
    format!("<root><id>net.openwg.gameface</id><version>{version}</version><name>net.openwg.gameface</name></root>")
}

struct Game {
    _dir: tempfile::TempDir,
    client: GameClient,
}

impl Game {
    fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().join("Мир танков");

        fs::create_dir_all(root.join("res_mods").join(GAME_VERSION)).unwrap();
        fs::write(root.join(PATHS_XML), PATHS_XML_TEXT).unwrap();
        write_zip(&root.join(GAME_PACKAGES_DIR).join("gui-part1.pkg"), &[("gui/unbound/gen/res_map.json", GAME_RES_MAP)]);

        let client = GameClient {
            mods_dir: root.join("mods").join(GAME_VERSION),
            res_mods_dir: root.join("res_mods").join(GAME_VERSION),
            path: root,
            version: GameVersion::parse(GAME_VERSION).unwrap(),
            branch: Branch::Release,
            realm: None,
            package_mask: "*.mtmod".into(),
            problem: None,
            source: ClientSource::Manual,
            preferred: true,
        };

        Self { _dir: dir, client }
    }

    fn with_gameface(self, version: &str) -> Self {
        let meta = gameface_meta(version);

        write_zip(&self.package(&format!("net.openwg.gameface_{version}.mtmod")), &[("meta.xml", meta.as_bytes())]);
        self
    }

    fn with_ui(self, file: &str, config: &[u8]) -> Self {
        self.with_config(file, "net.triotmetki.ui.json", config)
    }

    fn with_config(self, file: &str, name: &str, config: &[u8]) -> Self {
        let entry = format!("{PACKAGE_CONFIGS_DIR}{name}");

        write_zip(&self.package(file), &[("meta.xml", b"<root><id>mod</id></root>"), (&entry, config)]);
        self
    }

    fn package(&self, file: &str) -> PathBuf {
        self.client.mods_dir.join(file)
    }

    fn res_map(&self) -> PathBuf {
        self.client.res_mods_dir.join(RES_MAP_FILE)
    }
}

#[test]
fn the_known_key_orders_parse() {
    assert!(KeyOrders::known() != KeyOrders::default());
}

#[test]
fn merges_the_config_into_the_game_res_map_byte_for_byte_like_gameface() {
    assert_eq!(merged(&[UI_CONFIG], None).unwrap(), EXPECTED_RES_MAP);
}

#[test]
fn drops_trailing_commas_of_the_game_file_and_keeps_its_items_with_no_config_items() {
    let expected = EXPECTED_RES_MAP.split(",\"7\":").next().unwrap().to_owned() + "}";

    assert_eq!(merged(&[b"[]"], None).unwrap(), expected);
}

#[test]
fn skips_items_without_an_item_id_and_repeated_item_ids() {
    let repeated = r#"[{"itemID":"otmetki/ui/settings","type":"Layout","path":"x"},{"type":"Layout","path":"y"}]"#;

    assert_eq!(merged(&[UI_CONFIG, repeated.as_bytes()], None).unwrap(), EXPECTED_RES_MAP);
}

#[test]
fn numbers_new_items_after_every_game_item() {
    let game = r#"{"0":{"type":"Undefined","parameters":{}},"1":{"type":"Undefined","parameters":{}},}"#;
    let config = r#"[{"itemID":"a","type":"Layout","path":"p","parameters":{}}]"#;

    assert_eq!(
        merged_base(game, &[config], None).unwrap(),
        r#"{"0":{"type":"Undefined","parameters":{}},"1":{"type":"Undefined","parameters":{}},"2":{"path":"p","type":"Layout","parameters":{}}}"#
    );
}

#[test]
fn refuses_what_it_cannot_reproduce() {
    let game = r#"{"0":{"type":"Undefined","parameters":{}}}"#;

    assert_eq!(merged_base(game, &[r#"[{"itemID":"a","type":"Layout","size":1.5}]"#], None), Err(MergeError::Float));
    assert_eq!(merged_base(game, &[r#"[{"itemID":"a","type":"Слой"}]"#], None), Err(MergeError::NonAscii));
    assert_eq!(merged_base(game, &[r#"{"itemID":"a"}"#], None), Err(MergeError::ConfigShape));
    assert_eq!(merged_base(r#"{"x":{}}"#, &["[]"], None), Err(MergeError::BaseKey("x".into())));
    assert!(matches!(merged_base(game, &[r#"[{"itemID":"a","type":"Layout","size":"1"}]"#], None), Err(MergeError::UnknownOrder(_))));
    assert!(matches!(merged_base(game, &["[{]"], None), Err(MergeError::Syntax(_))));
}

#[test]
fn learns_key_orders_from_the_res_map_gameface_wrote() {
    let game = r#"{"0":{"zeta":"1","alpha":"2"}}"#;
    let written = r#"{"0":{"alpha":"2","zeta":"1"}}"#;

    assert!(matches!(merged_base(game, &["[]"], None), Err(MergeError::UnknownOrder(_))));
    assert_eq!(merged_base(game, &["[]"], Some(written)).unwrap(), written);
}

#[test]
fn stops_when_the_written_res_map_contradicts_a_known_order() {
    let written =
        EXPECTED_RES_MAP.replace(r#""1":{"type":"Entry","path":"gui/flash/battle.swf""#, r#""1":{"path":"gui/flash/battle.swf","type":"Entry""#);

    assert!(matches!(merged(&[UI_CONFIG], Some(&written)), Err(MergeError::OrderConflict(_))));
    assert_eq!(merged(&[UI_CONFIG], Some(EXPECTED_RES_MAP)).unwrap(), EXPECTED_RES_MAP);
}

#[test]
fn escapes_strings_like_python_json() {
    let game = r#"{"0":{"type":"Undefined","parameters":{"x":"a\"b\\c\/d\u0001\n"}}}"#;

    assert_eq!(merged_base(game, &["[]"], None).unwrap(), r#"{"0":{"type":"Undefined","parameters":{"x":"a\"b\\c/d\u0001\n"}}}"#);
}

#[test]
fn writes_the_merged_res_map_so_gameface_finds_nothing_to_change() {
    let game = Game::new().with_gameface("1.2.2").with_ui("net.triotmetki.ui_0.2.0.mtmod", UI_CONFIG);

    assert_eq!(premerge(&game.client), Ok(ResMapOutcome::Written));
    assert_eq!(fs::read_to_string(game.res_map()).unwrap(), EXPECTED_RES_MAP);
    assert_eq!(premerge(&game.client), Ok(ResMapOutcome::Unchanged));
    assert_eq!(sync(&game.client), ResMapOutcome::Unchanged);
}

#[test]
fn removes_the_res_map_when_no_config_is_left() {
    let game = Game::new().with_gameface("1.2.2").with_ui("net.triotmetki.ui_0.2.0.mtmod", UI_CONFIG);

    premerge(&game.client).unwrap();
    fs::remove_file(game.package("net.triotmetki.ui_0.2.0.mtmod")).unwrap();

    assert_eq!(premerge(&game.client), Ok(ResMapOutcome::Removed));
    assert!(!game.res_map().exists());
    assert_eq!(premerge(&game.client), Ok(ResMapOutcome::Unchanged));
}

#[test]
fn leaves_the_res_map_alone_without_gameface() {
    let game = Game::new().with_ui("net.triotmetki.ui_0.2.0.mtmod", UI_CONFIG);

    assert_eq!(premerge(&game.client), Ok(ResMapOutcome::NoGameface));
    assert!(!game.res_map().exists());
}

#[test]
fn falls_back_to_the_gameface_restart_when_unsure() {
    let unknown = Game::new().with_gameface("1.3.0").with_ui("net.triotmetki.ui_0.2.0.mtmod", UI_CONFIG);
    let copied = Game::new().with_gameface("1.2.2").with_ui("net.triotmetki.ui_0.2.0.mtmod", UI_CONFIG).with_ui("copy/ui_copy_1.0.mtmod", UI_CONFIG);
    let several =
        Game::new().with_gameface("1.2.2").with_ui("net.triotmetki.ui_0.2.0.mtmod", UI_CONFIG).with_config("other_1.0.mtmod", "other.json", b"[]");
    let mut test_client = Game::new().with_gameface("1.2.2").with_ui("net.triotmetki.ui_0.2.0.mtmod", UI_CONFIG);

    test_client.client.branch = Branch::CommonTest;

    assert_eq!(premerge(&unknown.client), Err(SkipReason::UnknownVersion("1.3.0".into())));
    assert_eq!(premerge(&test_client.client), Err(SkipReason::NotLesta));
    assert_eq!(sync(&unknown.client), ResMapOutcome::Skipped);
    assert!(ResMapOutcome::Skipped.restart_expected());
    assert!(!ResMapOutcome::Written.restart_expected());
    assert!(!unknown.res_map().exists());
    assert_eq!(premerge(&copied.client), Ok(ResMapOutcome::Written));
    assert_eq!(premerge(&several.client), Err(SkipReason::AmbiguousOrder));
}

#[test]
fn refuses_two_packages_with_different_configs() {
    let game = Game::new()
        .with_gameface("1.2.2")
        .with_ui("net.triotmetki.ui_0.2.0.mtmod", UI_CONFIG)
        .with_ui("net.triotmetki.ui_0.1.0.mtmod", br#"[{"itemID":"otmetki/ui/hud","type":"Layout","path":"x","parameters":{}}]"#);

    assert_eq!(premerge(&game.client), Err(SkipReason::AmbiguousOrder));
}

#[test]
fn reads_loose_configs_of_the_game_folder_first() {
    let game = Game::new().with_gameface("1.2.2");
    let loose = game.client.path.join(CONFIGS_DIR);

    fs::create_dir_all(&loose).unwrap();
    fs::write(loose.join("net.triotmetki.ui.json"), UI_CONFIG).unwrap();
    fs::write(loose.join("notes.txt"), "not a config").unwrap();

    assert_eq!(premerge(&game.client), Ok(ResMapOutcome::Written));
    assert_eq!(fs::read_to_string(game.res_map()).unwrap(), EXPECTED_RES_MAP);
}

#[test]
fn finds_the_res_mods_folder_like_gameface() {
    let game = Game::new();

    assert_eq!(res_map_dir(&game.client.path), Some(game.client.res_mods_dir.clone()));

    fs::remove_dir_all(&game.client.res_mods_dir).unwrap();
    fs::create_dir_all(&game.client.mods_dir).unwrap();

    assert_eq!(res_map_dir(&game.client.path), Some(game.client.mods_dir.clone()));
}

#[test]
#[ignore = "needs an installed Lesta client whose res_map.json OpenWG Gameface wrote"]
fn reproduces_the_res_map_gameface_wrote() {
    let game_dir = PathBuf::from(std::env::var(REAL_CLIENT_ENV).unwrap());
    let client = crate::detect::inspect(&game_dir, ClientSource::Manual).unwrap();
    let sources =
        ConfigSources { game_dir: &client.path, res_mods_dir: &client.res_mods_dir, mods_dir: &client.mods_dir, package_mask: &client.package_mask };
    let game = game_res_map(&client.path).unwrap();
    let written = fs::read_to_string(res_map_dir(&client.path).unwrap().join(RES_MAP_FILE)).unwrap();
    let merged = merge(&MergeInputs { game, configs: configs(sources).unwrap(), written: None }).unwrap();

    assert!(merged == written, "the merged res_map differs from the one OpenWG Gameface wrote");
}

#[test]
fn an_oversized_packaged_config_is_unreadable_instead_of_read_whole() {
    let root = tempfile::tempdir().unwrap();
    let package = root.path().join("big.mtmod");
    let huge = vec![b' '; usize::try_from(MAX_CONFIG_BYTES).unwrap() + 1];

    write_zip(&package, &[("res/mods/configs/res_map/big.json", &huge)]);

    let result = read_zip_entry(&package, |name| config_name(name).is_some());

    assert!(matches!(result, Err(SkipReason::Unreadable(_))));
}
