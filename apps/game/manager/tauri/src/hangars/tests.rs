use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use serde_json::json;
use zip::write::SimpleFileOptions;

use super::client_files::{read_sources, ClientFiles, SourceKind};
use super::generate::{self, BuildInput, PlanInput};
use super::packed_xml::{decode, encode, is_packed, Document, Node, PackedXmlError, Value};
use super::recipe::{self, convert, look_guid, parse, GateInput};
use super::*;
use crate::catalog::fixtures::catalog_json;
use crate::catalog::Catalog;
use crate::components::read_installation;
use crate::conflicts::scan;
use crate::detect::fixtures::lesta_client;
use crate::detect::GameClient;
use crate::state::disabled_dir;

pub const REAL_CLIENT_ENV: &str = "OTMETKI_HANGAR_CLIENT";
pub const VERSION: &str = "1.45.0.0";
pub const SPACE: &str = "h08_mt_hangar";
pub const TD2: &str = "2F6C0AAA.490E4615.008EB7B0.9F58C206";
pub const STUDIO: &str = "821B3FB9.4D7EE112.92D35885.42FB9F00";
pub const RECIPES_PACKAGE: &str = "net.triotmetki.hangar_looks_0.1.0.mtmod";
pub const SKY_DEFERRED: &str = "maps/skyboxes/h33_comp7_sky/skydome/h33_comp7_sky_rgbm.dds";
pub const SKY_FORWARD: &str = "maps/skyboxes/h33_comp7_sky/skydome/h33_comp7_sky_forward.dds";
pub const LUT: &str = "system/maps/post_processing/cube/otmetki/night.dds";
pub const PROBE: &[u8] = b"DDS probe bytes that are copied as they are";
pub const PRIMITIVES: &[u8] = b"primitives";
pub const PATHS_XML_TEXT: &str = r#"<root>
  <Paths>
    <Path cacheSubdirs="true">./res_mods/1.45.0.0</Path>
    <Path mask="*.mtmod" mode="recursive" root="res">./mods/1.45.0.0</Path>
    <Packages>
      <Package type="sd,hd">./res/packages/shared_content-part1.pkg</Package>
      <Package type="sd,hd">./res/packages/h08_mt_hangar.pkg</Package>
      <Package type="hd">./res/packages/h33_comp7_hd.pkg</Package>
    </Packages>
    <Path>./res</Path>
  </Paths>
</root>"#;

fn text(value: &str) -> Value {
    Value::String(value.as_bytes().to_vec())
}

fn floats(values: &[f32]) -> Value {
    Value::Floats(values.to_vec())
}

fn packed(root: Node) -> Vec<u8> {
    encode(&Document::new(root)).unwrap()
}

fn root(children: Vec<Node>) -> Node {
    Node::element("", text(""), children)
}

fn write_zip(path: &Path, files: &[(&str, Vec<u8>)]) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();

    let mut writer = zip::ZipWriter::new(fs::File::create(path).unwrap());
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    for (name, bytes) in files {
        writer.start_file(*name, options).unwrap();
        writer.write_all(bytes).unwrap();
    }

    writer.finish().unwrap();
}

fn zip_entries(path: &Path) -> Vec<String> {
    let archive = zip::ZipArchive::new(fs::File::open(path).unwrap()).unwrap();

    archive.file_names().map(str::to_owned).collect()
}

fn zip_names_in_order(path: &Path) -> Vec<String> {
    let mut archive = zip::ZipArchive::new(fs::File::open(path).unwrap()).unwrap();

    (0..archive.len()).map(|index| archive.by_index(index).unwrap().name().to_owned()).collect()
}

fn zip_read(path: &Path, name: &str) -> Vec<u8> {
    let mut archive = zip::ZipArchive::new(fs::File::open(path).unwrap()).unwrap();
    let mut bytes = Vec::new();

    archive.by_name(name).unwrap().read_to_end(&mut bytes).unwrap();

    bytes
}

fn environment_xml(name: &str) -> Vec<u8> {
    packed(root(vec![
        Node::leaf("name", text(name)),
        Node::leaf("visibilityMask", Value::Int(4_294_967_295)),
        Node::element(
            "day_night_cycle",
            text(""),
            vec![
                Node::leaf("starttime", floats(&[10.0])),
                Node::leaf("isMoon", Value::Bool(false)),
                Node::leaf("sunLightColor", floats(&[1.0, 0.9, 0.8])),
            ],
        ),
        Node::element(
            "HDR",
            text(""),
            vec![
                Node::leaf("version", Value::Int(3)),
                Node::element(
                    "tonemappings",
                    Value::Int(0),
                    vec![
                        Node::leaf("active", Value::Int(1)),
                        Node::element("tonemapping", text(""), vec![Node::leaf("name", text("RexpTM")), Node::leaf("middleGray", floats(&[0.19]))]),
                        Node::element(
                            "tonemapping",
                            text(""),
                            vec![Node::leaf("name", Value::Blob(b"\x16)\xa5\x4c\xd3".to_vec())), Node::leaf("middleGray", floats(&[0.31]))],
                        ),
                    ],
                ),
                Node::element("colorCorrection", text(""), vec![Node::leaf("map", text("system/maps/post_processing/cube/h08_autumn.dds"))]),
            ],
        ),
        Node::element("SSAO", text(""), vec![Node::leaf("radius", floats(&[0.5]))]),
    ]))
}

fn model(folder: &str, forward: bool) -> Vec<u8> {
    let sub = if forward { "forward/" } else { "" };

    packed(root(vec![
        Node::leaf("nodelessVisual", text(&format!("spaces/{SPACE}/environments/{folder}/skyDome/{sub}skybox"))),
        Node::leaf("extent", floats(&[1000.0])),
    ]))
}

fn visual(fx: &str) -> Vec<u8> {
    let property =
        Node::element("property", text("diffuseMap"), vec![Node::leaf("Texture", text("maps/skyboxes/Photometric_sky/2017_07_10_rgbm.dds"))]);
    let other = Node::element("property", text("alphaReference"), vec![Node::leaf("Int", Value::Int(0))]);
    let material = Node::element("material", text(""), vec![Node::leaf("fx", text(fx)), property, other]);
    let group = Node::element("primitiveGroup", Value::Int(0), vec![material]);
    let geometry = Node::element("geometry", text(""), vec![Node::leaf("vertices", Value::Blob(vec![0xbe, 0x8b, 0x62])), group]);

    packed(root(vec![Node::element("renderSet", text(""), vec![geometry])]))
}

fn environment_files(guid: &str, name: &str) -> Vec<(String, Vec<u8>)> {
    let folder = recipe::dashed(guid);
    let dir = format!("spaces/{SPACE}/environments/{folder}");

    vec![
        (format!("{dir}/environment.xml"), environment_xml(name)),
        (format!("{dir}/camera_effects.xml"), packed(root(vec![Node::leaf("enabled", Value::Bool(true))]))),
        (format!("{dir}/skyDome/skybox.model"), model(&folder, false)),
        (format!("{dir}/skyDome/skybox.visual_processed"), visual("shaders/environment/sky_box_HDR.fx")),
        (format!("{dir}/skyDome/skybox.primitives_processed"), PRIMITIVES.to_vec()),
        (format!("{dir}/skyDome/forward/skybox.model"), model(&folder, true)),
        (format!("{dir}/skyDome/forward/skybox.visual_processed"), visual("shaders/environment/sky_box.fx")),
        (format!("{dir}/probes/global/pmrem.dds"), PROBE.to_vec()),
        (format!("{dir}/probes/global/rem_sh.xml"), packed(root(vec![Node::leaf("sh", floats(&[0.1, 0.2]))]))),
    ]
}

fn environments_list() -> Vec<u8> {
    packed(root(vec![
        Node::leaf("activeEnvironment", text(TD2)),
        Node::leaf("environment", text(TD2)),
        Node::leaf("environment", text(STUDIO)),
        Node::leaf("tail", Value::Bool(true)),
    ]))
}

fn night_recipe() -> serde_json::Value {
    json!({
        "id": "night",
        "clients": [VERSION],
        "base": { "space": "spaces/h08_mt_hangar", "environment": "h08_mt_hangar_Autumn_TD2" },
        "probes": true,
        "sky": { "deferred": SKY_DEFERRED, "forward": SKY_FORWARD },
        "set": [
            { "path": "day_night_cycle/starttime", "value": 23.5 },
            { "path": "day_night_cycle/isMoon", "value": true },
            { "path": "day_night_cycle/sunLightColor", "value": [0.45, 0.55, 0.75] },
            { "path": "HDR/tonemappings/tonemapping[0]/middleGray", "value": 0.16 },
            { "path": "HDR/tonemappings/active", "value": 0 },
            { "path": "HDR/colorCorrection/map", "value": LUT }
        ]
    })
}

fn studio_recipe() -> serde_json::Value {
    json!({
        "id": "studio",
        "clients": [VERSION],
        "base": { "space": "spaces/h08_mt_hangar", "environment": "Customization" },
        "set": [{ "path": "day_night_cycle/starttime", "value": 12.0 }]
    })
}

fn sunset_recipe() -> serde_json::Value {
    json!({
        "id": "sunset",
        "clients": [VERSION],
        "base": { "space": "spaces/h08_mt_hangar", "environment": "Customization" },
        "set": [{ "path": "day_night_cycle/starttime", "value": 19.0 }]
    })
}

fn recipes(looks: &[serde_json::Value]) -> Vec<u8> {
    serde_json::to_vec(&json!({ "schemaVersion": 1, "looks": looks })).unwrap()
}

struct Game {
    root: tempfile::TempDir,
    client: GameClient,
    client_dir: PathBuf,
    catalog: Catalog,
}

impl Game {
    fn new(looks: &[serde_json::Value]) -> Self {
        let root = tempfile::Builder::new().prefix("ангар").tempdir().unwrap();
        let client = lesta_client(root.path(), VERSION);
        let packages = client.path.join("res").join("packages");
        let mut h08: Vec<(String, Vec<u8>)> = vec![(format!("spaces/{SPACE}/environments/environments.xml"), environments_list())];

        fs::write(client.path.join("paths.xml"), PATHS_XML_TEXT).unwrap();
        fs::create_dir_all(&client.res_mods_dir).unwrap();
        h08.extend(environment_files(TD2, "h08_mt_hangar_Autumn_TD2"));
        h08.extend(environment_files(STUDIO, "Customization"));
        write_zip(&packages.join("shared_content-part1.pkg"), &[("gui/other.xml", b"x".to_vec())]);
        write_zip(&packages.join("h08_mt_hangar.pkg"), &h08.iter().map(|(name, bytes)| (name.as_str(), bytes.clone())).collect::<Vec<_>>());
        write_zip(&packages.join("h33_comp7_hd.pkg"), &[(SKY_DEFERRED, b"sky".to_vec()), (SKY_FORWARD, b"sky forward".to_vec())]);

        let mut catalog = catalog_json();

        catalog["components"].as_array_mut().unwrap().push(json!({
            "id": "hangar_looks",
            "packageId": "net.triotmetki.hangar_looks",
            "version": "0.1.0",
            "file": RECIPES_PACKAGE,
            "category": "base",
            "title": { "ru": "Виды ангара", "en": "Hangar looks" },
            "dependencies": [],
            "generator": "hangar_looks"
        }));

        let game = Self { client_dir: root.path().join("state"), root, client, catalog: serde_json::from_value(catalog).unwrap() };

        game.write_recipes(&recipes(looks));
        game
    }

    fn write_recipes(&self, bytes: &[u8]) {
        write_zip(
            &self.client.mods_dir.join(RECIPES_PACKAGE),
            &[
                ("meta.xml", b"<root><id>net.triotmetki.hangar_looks</id><version>0.1.0</version></root>".to_vec()),
                (RECIPES_ENTRY, bytes.to_vec()),
                (&format!("res/{LUT}"), b"lut".to_vec()),
            ],
        );
    }

    fn context(&self) -> ClientContext<'_> {
        ClientContext { client_dir: &self.client_dir, client: &self.client, catalog: &self.catalog }
    }

    fn sync(&self) -> SyncOutcome {
        sync(self.context()).unwrap()
    }

    fn target(&self) -> PathBuf {
        self.client.mods_dir.join(generated_file_name(VERSION))
    }

    fn record(&self) -> HangarLooksRecord {
        read_state(&self.client_dir).hangar_looks.unwrap()
    }

    fn entry(&self, name: &str) -> Document {
        decode(&zip_read(&self.target(), name)).unwrap()
    }
}

fn our_dir(id: &str) -> String {
    format!("res/spaces/{SPACE}/environments/{}/", look_guid(id).dashed)
}

fn leaf<'a>(node: &'a Node, path: &[(&str, usize)]) -> &'a Value {
    let mut current = node;

    for (name, index) in path {
        current = current.children.iter().filter(|child| child.name == *name).nth(*index).unwrap();
    }

    &current.value
}

#[test]
fn round_trips_every_value_type_and_nested_own_values() {
    let tree = root(vec![
        Node::leaf("string", text("spaces/h08_mt_hangar")),
        Node::leaf("empty", text("")),
        Node::leaf("zero", Value::Int(0)),
        Node::leaf("small", Value::Int(-5)),
        Node::leaf("short", Value::Int(300)),
        Node::leaf("int", Value::Int(-70_000)),
        Node::leaf("long", Value::Int(4_294_967_295)),
        Node::leaf("floats", floats(&[1.5, -2.25, 0.0])),
        Node::leaf("yes", Value::Bool(true)),
        Node::leaf("no", Value::Bool(false)),
        Node::leaf("blob", Value::Blob(b"FilmicTM".to_vec())),
        Node::element("property", text("diffuseMap"), vec![Node::leaf("Texture", text("a.dds"))]),
        Node::element("group", Value::Int(0), vec![Node::element("deep", text("own"), vec![Node::leaf("string", text("again"))])]),
    ]);
    let bytes = packed(tree.clone());
    let decoded = decode(&bytes).unwrap();

    assert!(is_packed(&bytes));
    assert_eq!(decoded.root, tree);
    assert_eq!(encode(&decoded).unwrap(), bytes);
}

#[test]
fn writes_ints_in_the_smallest_width_and_false_as_nothing() {
    let width = |value: Value| packed(root(vec![Node::leaf("v", value)])).len() - packed(root(vec![Node::leaf("v", Value::Int(0))])).len();

    assert_eq!(width(Value::Int(127)), 1);
    assert_eq!(width(Value::Int(-129)), 2);
    assert_eq!(width(Value::Int(40_000)), 4);
    assert_eq!(width(Value::Int(4_294_967_295)), 8);
    assert_eq!(width(Value::Bool(false)), 0);
    assert_eq!(width(Value::Bool(true)), 1);
}

#[test]
fn keeps_the_string_table_of_the_original() {
    let document = Document {
        names: vec!["zeta".into(), "unused".into(), "alpha".into()],
        root: root(vec![Node::leaf("alpha", text("a")), Node::leaf("zeta", text("z"))]),
    };
    let bytes = encode(&document).unwrap();
    let decoded = decode(&bytes).unwrap();

    assert_eq!(decoded.names, ["zeta", "unused", "alpha"]);
    assert_eq!(encode(&decoded).unwrap(), bytes);
}

#[test]
fn refuses_what_is_not_a_plain_packed_xml() {
    let mut encrypted = packed(root(vec![Node::leaf("v", text("x"))]));
    let descriptor_at = encrypted.len() - 1 - 4;

    encrypted[descriptor_at + 3] = (encrypted[descriptor_at + 3] & 0x0F) | 0x60;

    assert_eq!(decode(b"<root/>"), Err(PackedXmlError::NotPacked));
    assert_eq!(decode(&encrypted), Err(PackedXmlError::Encrypted));
    assert_eq!(decode(&packed(root(vec![Node::leaf("v", text("x"))]))[..12]), Err(PackedXmlError::Truncated));
}

#[test]
#[ignore = "reads a real client: set OTMETKI_HANGAR_CLIENT to the game folder"]
fn round_trips_the_stock_environment_files_byte_for_byte() {
    let game = PathBuf::from(std::env::var(REAL_CLIENT_ENV).expect(REAL_CLIENT_ENV));
    let mut archive = zip::ZipArchive::new(fs::File::open(game.join("res/packages/h08_mt_hangar.pkg")).unwrap()).unwrap();
    let names: Vec<String> = archive.file_names().filter(|name| name.contains("/environments/")).map(str::to_owned).collect();
    let mut checked = 0;

    for name in names {
        let mut bytes = Vec::new();

        archive.by_name(&name).unwrap().read_to_end(&mut bytes).unwrap();

        if is_packed(&bytes) {
            assert_eq!(encode(&decode(&bytes).unwrap()).unwrap(), bytes, "{name}");
            checked += 1;
        }
    }

    assert!(checked > 0);
}

#[test]
fn resolves_files_in_the_order_of_paths_xml() {
    let game = Game::new(&[]);
    let mods = &game.client.mods_dir;
    let packages = game.client.path.join("res").join("packages");
    let shared = "gui/shared.txt";

    fs::create_dir_all(game.client.path.join("res").join("gui")).unwrap();
    fs::write(game.client.path.join("res").join(shared), b"res").unwrap();
    write_zip(&packages.join("shared_content-part1.pkg"), &[(shared, b"package one".to_vec())]);
    write_zip(&packages.join("h33_comp7_hd.pkg"), &[(shared, b"package three".to_vec()), ("gui/only_hd.txt", b"hd".to_vec())]);

    let files = ClientFiles::open(&game.client);
    let read = |path: &str| files.locate(path).map(|located| files.read(&located, 1024).unwrap());

    assert_eq!(read(shared).unwrap(), b"package one");
    assert_eq!(read("GUI/Only_HD.txt").unwrap(), b"hd");

    write_zip(&mods.join("other.mod_1.0.mtmod"), &[("res/gui/shared.txt", b"mtmod".to_vec())]);
    write_zip(&mods.join(generated_file_name(VERSION)), &[("res/gui/shared.txt", b"ours, generated".to_vec())]);

    let files = ClientFiles::open(&game.client);

    assert_eq!(files.locate(shared).map(|located| files.read(&located, 1024).unwrap()).unwrap(), b"mtmod");
    assert!(files.locate(shared).is_some_and(|located| files.source(&located).overrides_game()));

    fs::create_dir_all(game.client.res_mods_dir.join("gui")).unwrap();
    fs::write(game.client.res_mods_dir.join(shared), b"loose").unwrap();

    let files = ClientFiles::open(&game.client);

    assert_eq!(files.locate(shared).map(|located| files.read(&located, 1024).unwrap()).unwrap(), b"loose");

    let kinds: Vec<SourceKind> = read_sources(&game.client.path).iter().map(|source| source.kind).collect();

    assert_eq!(
        kinds,
        [SourceKind::Loose, SourceKind::Mtmod, SourceKind::Mtmod, SourceKind::Package, SourceKind::Package, SourceKind::Package, SourceKind::GameRes]
    );
    assert!(read_sources(&game.client.path).iter().all(|source| !source.path.to_string_lossy().contains(GENERATED_PREFIX)));
}

#[test]
fn lists_a_folder_across_sources_with_the_first_copy_winning() {
    let game = Game::new(&[]);
    let folder = format!("spaces/{SPACE}/environments/{}/", recipe::dashed(TD2));

    write_zip(&game.client.mods_dir.join("other.mod_1.0.mtmod"), &[(&format!("res/{folder}camera_effects.xml"), b"mod".to_vec())]);

    let files = ClientFiles::open(&game.client);
    let listed = files.list(&folder.to_uppercase());
    let effects = listed.iter().find(|located| located.path.ends_with("camera_effects.xml")).unwrap();

    assert_eq!(listed.len(), environment_files(TD2, "x").len());
    assert_eq!(files.read(effects, 1024).unwrap(), b"mod");
}

#[test]
fn rejects_recipes_that_break_the_rules() {
    let look = |change: &dyn Fn(&mut serde_json::Value)| {
        let mut look = night_recipe();

        change(&mut look);
        look
    };
    let cases: Vec<(serde_json::Value, &str)> = vec![
        (look(&|look| look["id"] = json!("Night")), "bad id"),
        (look(&|look| look["base"]["space"] = json!("spaces/../h08")), "bad space"),
        (look(&|look| look["set"] = json!([{ "path": "space/bounds", "value": 1 }])), "allowed blocks"),
        (look(&|look| look["set"] = json!([{ "path": "HDR/a/b/c/d/e/f", "value": 1 }])), "deeper"),
        (look(&|look| look["set"] = json!([{ "path": "HDR/tonemappings/tonemapping[1]/name", "value": "x.dds" }])), "sets a name"),
        (look(&|look| look["set"] = json!([{ "path": "HDR/x[a]", "value": 1 }])), "bad path"),
        (look(&|look| look["set"] = json!([{ "path": "HDR/colorCorrection/map", "value": "../../evil.dds" }])), "not a texture"),
        (look(&|look| look["sky"]["deferred"] = json!("/abs.dds")), "bad sky"),
        (look(&|look| look["sky"]["forward"] = json!("maps/sky.png")), "bad sky"),
    ];

    for (raw, expected) in cases {
        let parsed = parse(&recipes(&[raw]));

        assert!(parsed.looks.is_empty(), "{expected}");
        assert_eq!(parsed.skipped[0].reason, SkipReason::InvalidRecipe, "{expected}");
        assert!(parsed.skipped[0].detail.contains(expected), "{expected}: {}", parsed.skipped[0].detail);
    }

    let duplicate = parse(&recipes(&[night_recipe(), night_recipe()]));

    assert_eq!(duplicate.looks.len(), 1);
    assert_eq!(duplicate.skipped[0].detail, "duplicate id");

    let future = parse(br#"{"schemaVersion": 2, "looks": [{"id": "night"}]}"#);

    assert_eq!(future.skipped, [SkippedLook::new("night", SkipReason::UnsupportedSchema, "schemaVersion 2")]);
    assert_eq!(parse(b"not json").skipped[0].reason, SkipReason::InvalidRecipe);
}

#[test]
fn gates_looks_by_client_and_kill_switch() {
    let parsed = parse(&recipes(&[night_recipe()]));
    let look = &parsed.looks[0];
    let disabled = vec!["night".to_owned()];

    assert_eq!(recipe::gate(GateInput { look, client_version: VERSION, disabled: &[] }), None);
    assert_eq!(recipe::gate(GateInput { look, client_version: "1.46.0.0", disabled: &[] }).unwrap().reason, SkipReason::UntestedClient);
    assert_eq!(recipe::gate(GateInput { look, client_version: VERSION, disabled: &disabled }).unwrap().reason, SkipReason::Disabled);
}

#[test]
fn converts_values_only_into_the_stock_type() {
    assert_eq!(convert(&floats(&[1.0]), &json!(2)), Ok(floats(&[2.0])));
    assert_eq!(convert(&floats(&[1.0, 2.0]), &json!([3, 4])), Ok(floats(&[3.0, 4.0])));
    assert!(convert(&floats(&[1.0, 2.0]), &json!(3)).is_err());
    assert!(convert(&floats(&[1.0, 2.0]), &json!([3, 4, 5])).is_err());
    assert_eq!(convert(&Value::Int(1), &json!(0)), Ok(Value::Int(0)));
    assert!(convert(&Value::Int(1), &json!(0.5)).is_err());
    assert_eq!(convert(&Value::Bool(false), &json!(true)), Ok(Value::Bool(true)));
    assert!(convert(&Value::Bool(false), &json!(1)).is_err());
    assert_eq!(convert(&text("a.dds"), &json!("maps/b.dds")), Ok(text("maps/b.dds")));
    assert!(convert(&text("a.dds"), &json!("maps/b.png")).is_err());
    assert!(convert(&Value::Blob(b"x".to_vec()), &json!("x.dds")).is_err());
}

#[test]
fn derives_a_stable_guid_from_the_look_id() {
    let guid = look_guid("night");

    assert_eq!(guid, look_guid("night"));
    assert_ne!(guid, look_guid("sunset"));
    assert_eq!(guid.dotted.len(), 35);
    assert_eq!(guid.dashed, guid.dotted.replace('.', "-"));
    assert!(guid.dotted.chars().all(|c| c == '.' || c.is_ascii_digit() || c.is_ascii_uppercase()));
}

#[test]
fn generates_the_package_from_the_clients_own_files() {
    let game = Game::new(&[night_recipe(), studio_recipe()]);

    assert_eq!(game.sync(), SyncOutcome::Written);

    let target = game.target();
    let names = zip_names_in_order(&target);
    let night = our_dir("night");
    let studio = our_dir("studio");

    assert_eq!(names[0], "meta.xml");
    assert!(String::from_utf8(zip_read(&target, "meta.xml")).unwrap().contains("<id>net.triotmetki.hangar_looks.gen</id>"));
    assert!(names.contains(&"res/".to_owned()) && names.contains(&night.clone()));
    assert!(names.iter().skip(1).zip(names.iter().skip(2)).all(|(left, right)| left < right));
    assert!(names.contains(&format!("{night}probes/global/pmrem.dds")));
    assert!(!names.iter().any(|name| name.starts_with(&studio) && name.contains("probes/")));
    assert!(names.contains(&format!("{studio}skyDome/skybox.model")));
    assert!(names.contains(&format!("{studio}camera_effects.xml")));

    let list = game.entry(&format!("res/spaces/{SPACE}/environments/environments.xml")).root;
    let listed: Vec<String> =
        list.children.iter().filter(|child| child.name == "environment").map(|child| child.value.as_text().unwrap().to_owned()).collect();

    assert_eq!(listed, [TD2.to_owned(), STUDIO.to_owned(), look_guid("night").dotted, look_guid("studio").dotted]);
    assert_eq!(list.child("activeEnvironment").unwrap().value, text(TD2));
    assert_eq!(list.children.last().unwrap().name, "tail");

    let environment = game.entry(&format!("{night}environment.xml")).root;

    assert_eq!(environment.child("name").unwrap().value, text("otm_night"));
    assert_eq!(leaf(&environment, &[("visibilityMask", 0)]), &Value::Int(4_294_967_295));
    assert_eq!(leaf(&environment, &[("day_night_cycle", 0), ("starttime", 0)]), &floats(&[23.5]));
    assert_eq!(leaf(&environment, &[("day_night_cycle", 0), ("isMoon", 0)]), &Value::Bool(true));
    assert_eq!(leaf(&environment, &[("day_night_cycle", 0), ("sunLightColor", 0)]), &floats(&[0.45, 0.55, 0.75]));
    assert_eq!(leaf(&environment, &[("HDR", 0), ("tonemappings", 0), ("tonemapping", 0), ("middleGray", 0)]), &floats(&[0.16]));
    assert_eq!(leaf(&environment, &[("HDR", 0), ("tonemappings", 0), ("tonemapping", 1), ("middleGray", 0)]), &floats(&[0.31]));
    assert_eq!(leaf(&environment, &[("HDR", 0), ("tonemappings", 0), ("active", 0)]), &Value::Int(0));
    assert_eq!(leaf(&environment, &[("HDR", 0), ("tonemappings", 0)]), &Value::Int(0));
    assert_eq!(leaf(&environment, &[("HDR", 0), ("colorCorrection", 0), ("map", 0)]), &text(LUT));

    let dashed = look_guid("night").dashed;
    let deferred = game.entry(&format!("{night}skyDome/skybox.model")).root;
    let forward = game.entry(&format!("{night}skyDome/forward/skybox.model")).root;

    assert_eq!(deferred.child("nodelessVisual").unwrap().value, text(&format!("spaces/{SPACE}/environments/{dashed}/skyDome/skybox")));
    assert_eq!(forward.child("nodelessVisual").unwrap().value, text(&format!("spaces/{SPACE}/environments/{dashed}/skyDome/forward/skybox")));

    let texture = |path: &str| {
        let visual = game.entry(&format!("{night}{path}")).root;

        leaf(&visual, &[("renderSet", 0), ("geometry", 0), ("primitiveGroup", 0), ("material", 0), ("property", 0), ("Texture", 0)]).clone()
    };

    assert_eq!(texture("skyDome/skybox.visual_processed"), text(SKY_DEFERRED));
    assert_eq!(texture("skyDome/forward/skybox.visual_processed"), text(SKY_FORWARD));
    assert_eq!(zip_read(&target, &format!("{night}skyDome/skybox.primitives_processed")), PRIMITIVES);
    assert_eq!(zip_read(&target, &format!("{night}probes/global/pmrem.dds")), PROBE);
    assert_eq!(game.entry(&format!("{studio}environment.xml")).root.child("name").unwrap().value, text("otm_studio"));

    let record = game.record();

    assert_eq!(record.looks, ["night", "studio"]);
    assert_eq!(record.file.as_deref(), Some(generated_file_name(VERSION).as_str()));
    assert_eq!(record.client_version, VERSION);
    assert!(record.skipped.is_empty());
    assert_eq!(game.sync(), SyncOutcome::Unchanged);

    let status = status(&game.client_dir, false, VERSION);

    assert_eq!(status.state, HangarLooksState::Generated);
    assert_eq!(status.looks, ["night", "studio"]);
}

#[test]
fn builds_the_same_bytes_every_time() {
    let game = Game::new(&[night_recipe(), studio_recipe()]);
    let files = ClientFiles::open(&game.client);
    let recipes = recipes(&[night_recipe(), studio_recipe()]);
    let plan = generate::plan(PlanInput { files: &files, recipes: &recipes, disabled: &[], client_version: VERSION }).unwrap();
    let first = game.root.path().join("first.mtmod");
    let second = game.root.path().join("second.mtmod");

    generate::build(BuildInput { files: &files, plan: &plan, client_version: VERSION, target: &first }).unwrap();
    generate::build(BuildInput { files: &files, plan: &plan, client_version: VERSION, target: &second }).unwrap();

    assert_eq!(fs::read(&first).unwrap(), fs::read(&second).unwrap());
    assert!(!sibling_part(&first).exists());
}

fn sibling_part(path: &Path) -> PathBuf {
    crate::fsx::sibling(path, crate::fsx::PART_SUFFIX)
}

#[test]
fn skips_looks_with_a_reason_and_never_half_applies_one() {
    let mut untested = sunset_recipe();
    let mut missing_base = sunset_recipe();
    let mut missing_texture = night_recipe();
    let mut missing_path = studio_recipe();
    let mut wrong_type = studio_recipe();

    untested["id"] = json!("untested");
    untested["clients"] = json!(["1.44.0.0"]);
    missing_base["id"] = json!("winter");
    missing_base["base"]["environment"] = json!("h08_mt_hangar_Winter");
    missing_texture["id"] = json!("dusk");
    missing_texture["sky"]["deferred"] = json!("maps/skyboxes/nowhere.dds");
    missing_path["id"] = json!("broken");
    missing_path["set"] = json!([{ "path": "Fog/density", "value": 1.0 }]);
    wrong_type["id"] = json!("typed");
    wrong_type["set"] = json!([{ "path": "day_night_cycle/sunLightColor", "value": 1.0 }]);

    let mut game = Game::new(&[sunset_recipe(), untested, missing_base, missing_texture, missing_path, wrong_type]);

    game.catalog.disabled_looks = vec!["sunset".to_owned()];

    assert_eq!(game.sync(), SyncOutcome::Empty);
    assert!(!game.target().exists());

    let reasons: Vec<(String, SkipReason)> = game.record().skipped.into_iter().map(|skipped| (skipped.id, skipped.reason)).collect();

    assert_eq!(
        reasons,
        [
            ("sunset".to_owned(), SkipReason::Disabled),
            ("untested".to_owned(), SkipReason::UntestedClient),
            ("winter".to_owned(), SkipReason::BaseMissing),
            ("dusk".to_owned(), SkipReason::MissingTexture),
            ("broken".to_owned(), SkipReason::InvalidRecipe),
            ("typed".to_owned(), SkipReason::InvalidRecipe),
        ]
    );

    let status = status(&game.client_dir, false, VERSION);

    assert_eq!(status.state, HangarLooksState::Skipped);
    assert_eq!(status.skipped.len(), 6);
    assert_eq!(game.sync(), SyncOutcome::Unchanged);

    game.catalog.disabled_looks.clear();

    assert_eq!(game.sync(), SyncOutcome::Written);
    assert_eq!(game.record().looks, ["sunset"]);
}

#[test]
fn skips_a_space_whose_environment_list_another_mod_overrides() {
    let game = Game::new(&[night_recipe()]);

    assert_eq!(game.sync(), SyncOutcome::Written);

    write_zip(
        &game.client.mods_dir.join("hangar.mod_1.0.mtmod"),
        &[(&format!("res/spaces/{SPACE}/environments/environments.xml"), environments_list())],
    );

    assert_eq!(game.sync(), SyncOutcome::Empty);
    assert!(!game.target().exists());
    assert_eq!(game.record().skipped[0].reason, SkipReason::Shadowed);
    assert_eq!(game.record().skipped[0].detail, "hangar.mod_1.0.mtmod");

    fs::remove_file(game.client.mods_dir.join("hangar.mod_1.0.mtmod")).unwrap();

    let loose = game.client.res_mods_dir.join("spaces").join(SPACE).join("environments");

    fs::create_dir_all(&loose).unwrap();
    fs::write(loose.join("environments.xml"), environments_list()).unwrap();

    assert_eq!(game.sync(), SyncOutcome::Empty);
    assert_eq!(game.record().skipped[0].reason, SkipReason::Shadowed);
}

#[test]
fn regenerates_when_the_output_was_altered_or_removed() {
    let game = Game::new(&[night_recipe()]);

    assert_eq!(game.sync(), SyncOutcome::Written);

    let original = fs::read(game.target()).unwrap();

    fs::write(game.target(), b"tampered").unwrap();

    assert_eq!(game.sync(), SyncOutcome::Written);
    assert_eq!(fs::read(game.target()).unwrap(), original);

    fs::remove_file(game.target()).unwrap();

    assert_eq!(game.sync(), SyncOutcome::Written);

    game.write_recipes(&recipes(&[night_recipe(), studio_recipe()]));

    assert_eq!(game.sync(), SyncOutcome::Written);
    assert_eq!(game.record().looks, ["night", "studio"]);
}

#[test]
fn removes_the_package_and_its_state_when_the_component_is_off() {
    let game = Game::new(&[night_recipe()]);
    let stale = game.client.mods_dir.join(generated_file_name("1.44.0.0"));

    fs::write(&stale, b"stale").unwrap();

    assert_eq!(game.sync(), SyncOutcome::Written);
    assert!(!stale.exists());

    let parked = disabled_dir(&game.client_dir);

    fs::create_dir_all(&parked).unwrap();
    fs::rename(game.client.mods_dir.join(RECIPES_PACKAGE), parked.join(RECIPES_PACKAGE)).unwrap();

    assert_eq!(game.sync(), SyncOutcome::Off);
    assert!(!game.target().exists());
    assert!(!state_path(&game.client_dir).exists());
    assert_eq!(status(&game.client_dir, false, VERSION).state, HangarLooksState::None);
    assert_eq!(status(&game.client_dir, true, VERSION).state, HangarLooksState::Failed);
}

#[test]
fn the_generated_package_is_ours_but_no_components_file() {
    let game = Game::new(&[night_recipe()]);

    assert_eq!(game.sync(), SyncOutcome::Written);

    let name = generated_file_name(VERSION);
    let installation = read_installation(game.context()).unwrap();
    let report = scan(game.context()).unwrap();
    let looks = installation.components.iter().find(|component| component.id == "hangar_looks").unwrap();

    assert!(game.catalog.component_for_file(&name).is_none());
    assert!(crate::components::is_owned(&game.catalog, &name));
    assert!(is_generated_file(&name));
    assert!(!is_generated_file(RECIPES_PACKAGE));
    assert_eq!(looks.file.as_deref(), Some(RECIPES_PACKAGE));
    assert!(report.duplicates.is_empty(), "{:?}", report.duplicates);
    assert!(zip_entries(&game.target()).iter().all(|entry| ["meta.xml", "res/"].contains(&entry.as_str()) || entry.starts_with("res/spaces/")));
}

#[test]
#[ignore = "reads a real client: set OTMETKI_HANGAR_CLIENT to the game folder"]
fn plans_a_look_on_the_real_client() {
    let game = PathBuf::from(std::env::var(REAL_CLIENT_ENV).expect(REAL_CLIENT_ENV));
    let client = crate::detect::inspect(&game, crate::detect::ClientSource::Manual).unwrap();
    let mut night = night_recipe();

    night["clients"] = json!([client.version.to_string()]);
    night["set"].as_array_mut().unwrap().pop();

    let files = ClientFiles::open(&client);
    let recipes = recipes(&[night]);
    let plan = generate::plan(PlanInput { files: &files, recipes: &recipes, disabled: &[], client_version: &client.version.to_string() }).unwrap();
    let out = tempfile::tempdir().unwrap();
    let target = out.path().join(generated_file_name(&client.version.to_string()));

    assert_eq!(plan.skipped, []);
    assert_eq!(plan.looks(), ["night"]);

    generate::build(BuildInput { files: &files, plan: &plan, client_version: &client.version.to_string(), target: &target }).unwrap();

    assert!(zip_entries(&target).iter().any(|entry| entry.ends_with("skyDome/skybox.model")));
}

#[test]
fn a_migration_leaves_the_generated_package_behind() {
    let game = Game::new(&[night_recipe()]);

    assert_eq!(game.sync(), SyncOutcome::Written);

    let next = "1.46.0.0";
    let mut client = game.client.clone();

    client.version = crate::detect::GameVersion::parse(next).unwrap();
    client.mods_dir = game.client.path.join("mods").join(next);
    fs::write(game.client.path.join("paths.xml"), PATHS_XML_TEXT.replace(VERSION, next)).unwrap();

    let context = ClientContext { client_dir: &game.client_dir, client: &client, catalog: &game.catalog };
    let carried = crate::patch::migrate(crate::patch::MigrateInput { context, from_mods_dir: &game.client.mods_dir }).unwrap();

    assert_eq!(carried, [RECIPES_PACKAGE]);
    assert_eq!(sync(context).unwrap(), SyncOutcome::Empty);
    assert!(!client.mods_dir.join(generated_file_name(next)).exists());
    assert_eq!(read_state(&game.client_dir).hangar_looks.unwrap().skipped[0].reason, SkipReason::UntestedClient);
}

#[test]
#[ignore = "reads a real client: set OTMETKI_HANGAR_CLIENT to the game folder"]
fn plans_the_modpack_recipes_on_the_real_client() {
    let game = PathBuf::from(std::env::var(REAL_CLIENT_ENV).expect(REAL_CLIENT_ENV));
    let client = crate::detect::inspect(&game, crate::detect::ClientSource::Manual).unwrap();
    let bundle = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../modpack/hangars/recipes.json");
    let mut parsed: serde_json::Value = serde_json::from_slice(&fs::read(bundle).unwrap()).unwrap();

    for look in parsed["looks"].as_array_mut().unwrap() {
        look["set"].as_array_mut().unwrap().retain(|op| op["path"] != "HDR/colorCorrection/map");
    }

    let files = ClientFiles::open(&client);
    let recipes = recipes(parsed["looks"].as_array().unwrap());
    let plan = generate::plan(PlanInput { files: &files, recipes: &recipes, disabled: &[], client_version: &client.version.to_string() }).unwrap();

    assert_eq!(plan.skipped, []);
    assert_eq!(plan.looks(), ["night", "steel", "studio", "sunset"]);
}
