use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::packed_xml::{Node, Value};

pub const SCHEMA_VERSION: u64 = 1;
pub const ENVIRONMENT_PREFIX: &str = "otm_";
pub const MAX_ID_LENGTH: usize = 32;
pub const MAX_PATH_DEPTH: usize = 6;
pub const SPACE_PREFIX: &str = "spaces/";
pub const FORBIDDEN_SEGMENT: &str = "name";
pub const GUID_SEED: &str = "otmetki/hangar_looks/";
pub const GUID_BYTES: usize = 16;
pub const GUID_GROUP: usize = 8;
pub const TEXTURE_EXTENSION: &str = ".dds";
pub const ALLOWED_BLOCKS: [&str; 9] = ["day_night_cycle", "HDR", "Fog", "GodRays", "LensFlare", "DOF", "cloudsShadow", "SkyDome", "Weather"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SkipReason {
    UnsupportedSchema,
    InvalidRecipe,
    Disabled,
    UntestedClient,
    BaseMissing,
    MissingTexture,
    Shadowed,
    GuidCollision,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedLook {
    pub id: String,
    pub reason: SkipReason,
    #[serde(default)]
    pub detail: String,
}

impl SkippedLook {
    pub fn new(id: &str, reason: SkipReason, detail: impl Into<String>) -> Self {
        Self { id: id.to_owned(), reason, detail: detail.into() }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Segment {
    pub name: String,
    pub index: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SetOp {
    pub path: String,
    pub segments: Vec<Segment>,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Sky {
    pub deferred: Option<String>,
    pub forward: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Look {
    pub id: String,
    pub clients: Vec<String>,
    pub space: String,
    pub environment: String,
    pub probes: bool,
    pub sky: Sky,
    pub set: Vec<SetOp>,
}

impl Look {
    pub fn environment_name(&self) -> String {
        format!("{ENVIRONMENT_PREFIX}{}", self.id)
    }

    pub fn textures(&self) -> Vec<String> {
        let set = self.set.iter().filter_map(|op| op.value.as_str().map(str::to_owned));

        self.sky.deferred.iter().chain(self.sky.forward.iter()).cloned().chain(set).collect()
    }
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Recipes {
    pub looks: Vec<Look>,
    pub skipped: Vec<SkippedLook>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Guid {
    pub dotted: String,
    pub dashed: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawFile {
    schema_version: u64,
    #[serde(default)]
    looks: Vec<serde_json::Value>,
}

#[derive(Deserialize)]
struct RawBase {
    space: String,
    environment: String,
}

#[derive(Deserialize)]
struct RawSky {
    #[serde(default)]
    deferred: Option<String>,
    #[serde(default)]
    forward: Option<String>,
}

#[derive(Deserialize)]
struct RawSet {
    path: String,
    value: serde_json::Value,
}

#[derive(Deserialize)]
struct RawLook {
    id: String,
    clients: Vec<String>,
    base: RawBase,
    #[serde(default)]
    probes: bool,
    #[serde(default)]
    sky: Option<RawSky>,
    #[serde(default)]
    set: Vec<RawSet>,
}

pub fn is_valid_id(id: &str) -> bool {
    let mut chars = id.chars();

    id.len() <= MAX_ID_LENGTH
        && chars.next().is_some_and(|first| first.is_ascii_lowercase())
        && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

pub fn space_folder(space: &str) -> Option<&str> {
    let folder = space.strip_prefix(SPACE_PREFIX)?;

    (!folder.is_empty() && folder.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')).then_some(folder)
}

pub fn is_texture_path(path: &str) -> bool {
    let lowered = path.to_lowercase();

    lowered.len() > TEXTURE_EXTENSION.len()
        && lowered.ends_with(TEXTURE_EXTENSION)
        && !lowered.contains("..")
        && !lowered.starts_with('/')
        && lowered.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || matches!(c, '_' | '.' | '/' | '-'))
}

fn parse_segment(text: &str) -> Option<Segment> {
    let (name, index) = match text.strip_suffix(']').and_then(|rest| rest.split_once('[')) {
        Some((name, digits)) if !digits.is_empty() && digits.chars().all(|c| c.is_ascii_digit()) => (name, digits.parse().ok()?),
        Some(_) => return None,
        None => (text, 0),
    };
    let mut chars = name.chars();
    let valid = chars.next().is_some_and(|first| first.is_ascii_alphabetic()) && chars.all(|c| c.is_ascii_alphanumeric() || c == '_');

    valid.then(|| Segment { name: name.to_owned(), index })
}

pub fn parse_path(path: &str) -> Result<Vec<Segment>, String> {
    let segments: Vec<Segment> = path.split('/').map(parse_segment).collect::<Option<_>>().ok_or_else(|| format!("bad path {path}"))?;

    if segments.is_empty() || segments.len() > MAX_PATH_DEPTH {
        return Err(format!("path {path} is deeper than {MAX_PATH_DEPTH}"));
    }

    if !ALLOWED_BLOCKS.contains(&segments[0].name.as_str()) {
        return Err(format!("path {path} is outside the allowed blocks"));
    }

    if segments.iter().any(|segment| segment.name.eq_ignore_ascii_case(FORBIDDEN_SEGMENT)) {
        return Err(format!("path {path} sets a name"));
    }

    Ok(segments)
}

fn look_from(raw: RawLook) -> Result<Look, String> {
    let space = space_folder(&raw.base.space).ok_or_else(|| format!("bad space {}", raw.base.space))?.to_owned();

    if raw.base.environment.trim().is_empty() {
        return Err("no base environment".to_owned());
    }

    let sky = raw.sky.map(|sky| Sky { deferred: sky.deferred, forward: sky.forward }).unwrap_or_default();

    if let Some(bad) = sky.deferred.iter().chain(sky.forward.iter()).find(|path| !is_texture_path(path)) {
        return Err(format!("bad sky texture {bad}"));
    }

    let mut set = Vec::new();

    for op in raw.set {
        let segments = parse_path(&op.path)?;

        if let Some(text) = op.value.as_str() {
            if !is_texture_path(text) {
                return Err(format!("{}: {text} is not a texture path", op.path));
            }
        }

        set.push(SetOp { path: op.path, segments, value: op.value });
    }

    Ok(Look { id: raw.id, clients: raw.clients, space, environment: raw.base.environment, probes: raw.probes, sky, set })
}

fn raw_id(entry: &serde_json::Value) -> String {
    entry.get("id").and_then(serde_json::Value::as_str).unwrap_or_default().to_owned()
}

pub fn parse(bytes: &[u8]) -> Recipes {
    let file: RawFile = match serde_json::from_slice(bytes.strip_prefix("\u{feff}".as_bytes()).unwrap_or(bytes)) {
        Ok(file) => file,
        Err(error) => return Recipes { looks: Vec::new(), skipped: vec![SkippedLook::new("", SkipReason::InvalidRecipe, error.to_string())] },
    };

    if file.schema_version != SCHEMA_VERSION {
        let detail = format!("schemaVersion {}", file.schema_version);
        let mut skipped: Vec<SkippedLook> =
            file.looks.iter().map(|entry| SkippedLook::new(&raw_id(entry), SkipReason::UnsupportedSchema, detail.clone())).collect();

        if skipped.is_empty() {
            skipped.push(SkippedLook::new("", SkipReason::UnsupportedSchema, detail));
        }

        return Recipes { looks: Vec::new(), skipped };
    }

    let mut recipes = Recipes::default();
    let mut seen = BTreeSet::new();

    for entry in file.looks {
        let id = raw_id(&entry);

        if !is_valid_id(&id) {
            recipes.skipped.push(SkippedLook::new(&id, SkipReason::InvalidRecipe, "bad id"));
            continue;
        }

        if !seen.insert(id.clone()) {
            recipes.skipped.push(SkippedLook::new(&id, SkipReason::InvalidRecipe, "duplicate id"));
            continue;
        }

        match serde_json::from_value::<RawLook>(entry).map_err(|error| error.to_string()).and_then(look_from) {
            Ok(look) => recipes.looks.push(look),
            Err(detail) => recipes.skipped.push(SkippedLook::new(&id, SkipReason::InvalidRecipe, detail)),
        }
    }

    recipes
}

pub struct GateInput<'a> {
    pub look: &'a Look,
    pub client_version: &'a str,
    pub disabled: &'a [String],
}

pub fn gate(input: GateInput) -> Option<SkippedLook> {
    let look = input.look;

    if input.disabled.iter().any(|id| id == &look.id) {
        return Some(SkippedLook::new(&look.id, SkipReason::Disabled, "disabledLooks"));
    }

    if !look.clients.iter().any(|client| client.trim() == input.client_version) {
        return Some(SkippedLook::new(&look.id, SkipReason::UntestedClient, input.client_version));
    }

    None
}

pub fn look_guid(id: &str) -> Guid {
    let digest = Sha256::digest(format!("{GUID_SEED}{id}").as_bytes());
    let hex = hex::encode_upper(&digest[..GUID_BYTES]);
    let groups: Vec<&str> = (0..GUID_BYTES * 2 / GUID_GROUP).map(|index| &hex[index * GUID_GROUP..(index + 1) * GUID_GROUP]).collect();

    Guid { dotted: groups.join("."), dashed: groups.join("-") }
}

pub fn dashed(dotted: &str) -> String {
    dotted.trim().replace('.', "-")
}

fn as_f32(value: &serde_json::Value) -> Option<f32> {
    value.as_f64().filter(|number| number.is_finite() && number.abs() <= f64::from(f32::MAX)).map(|number| number as f32)
}

pub fn convert(stock: &Value, wanted: &serde_json::Value) -> Result<Value, String> {
    let mismatch = || format!("{wanted} does not fit the stock value");

    match stock {
        Value::Floats(values) => {
            let numbers: Vec<f32> = match wanted {
                serde_json::Value::Array(items) => items.iter().map(as_f32).collect::<Option<_>>().ok_or_else(mismatch)?,
                single => vec![as_f32(single).ok_or_else(mismatch)?],
            };

            (numbers.len() == values.len() && (wanted.is_array() || values.len() == 1)).then_some(Value::Floats(numbers)).ok_or_else(mismatch)
        }
        Value::Int(_) => wanted.as_i64().map(Value::Int).ok_or_else(mismatch),
        Value::Bool(_) => wanted.as_bool().map(Value::Bool).ok_or_else(mismatch),
        Value::String(_) => {
            wanted.as_str().filter(|text| is_texture_path(text)).map(|text| Value::String(text.as_bytes().to_vec())).ok_or_else(mismatch)
        }
        Value::Blob(_) => Err("a blob value cannot be set".to_owned()),
    }
}

pub fn apply_set(root: &mut Node, op: &SetOp) -> Result<(), String> {
    let mut node = root;

    for segment in &op.segments {
        node = node.nth_child_mut(&segment.name, segment.index).ok_or_else(|| format!("{} is not in the base environment", op.path))?;
    }

    if !node.children.is_empty() {
        return Err(format!("{} is not a leaf", op.path));
    }

    node.value = convert(&node.value, &op.value).map_err(|detail| format!("{}: {detail}", op.path))?;

    Ok(())
}
