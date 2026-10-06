use std::collections::{BTreeMap, BTreeSet};
use std::fs::File;
use std::io::Write;
use std::path::Path;

use base64::Engine as _;
use sha2::{Digest, Sha256};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

use super::client_files::{ClientFiles, Located};
use super::packed_xml::{self, Document, Node, Value};
use super::recipe::{self, apply_set, dashed, look_guid, GateInput, Guid, Look, SkipReason, SkippedLook};
use super::GENERATED_PACKAGE_ID;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::{rename_file, sibling, PART_SUFFIX};

pub const GENERATOR_VERSION: &str = "1";
pub const MAX_XML_BYTES: u64 = 8 * 1024 * 1024;
pub const MAX_COPY_BYTES: u64 = 256 * 1024 * 1024;
pub const ENVIRONMENTS_DIR: &str = "environments";
pub const ENVIRONMENTS_XML: &str = "environments.xml";
pub const ENVIRONMENT_XML: &str = "environment.xml";
pub const ENVIRONMENT_TAG: &str = "environment";
pub const NAME_TAG: &str = "name";
pub const PROBES_DIR: &str = "probes/";
pub const SKY_DEFERRED: &str = "skydome/skybox.visual_processed";
pub const SKY_FORWARD: &str = "skydome/forward/skybox.visual_processed";
pub const PROPERTY_TAG: &str = "property";
pub const TEXTURE_TAG: &str = "Texture";
pub const DIFFUSE_MAP: &str = "diffuseMap";
pub const PACKED_EXTENSIONS: [&str; 4] = ["xml", "model", "visual_processed", "visual"];
pub const PACKAGE_RES: &str = "res/";
pub const META_XML: &str = "meta.xml";
pub const PACKAGE_NAME: &str = "Three Marks hangar looks (generated)";
pub const PACKAGE_DESCRIPTION: &str =
    "Generated on this PC by the Three Marks manager from the game's own files and the modpack's recipes. Not for distribution.";
pub const ZIP_DATE: ZipDate = ZipDate { year: 2020, month: 1, day: 1 };
pub const FILE_MODE: u32 = 0o644;
pub const DIR_MODE: u32 = 0o755;

pub struct ZipDate {
    pub year: u16,
    pub month: u8,
    pub day: u8,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Content {
    Bytes(Vec<u8>),
    Copy(Located),
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlannedFile {
    pub path: String,
    pub content: Content,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlannedLook {
    pub id: String,
    pub guid: Guid,
    pub files: Vec<PlannedFile>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PlannedSpace {
    pub space: String,
    pub environments: Vec<u8>,
    pub looks: Vec<PlannedLook>,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Plan {
    pub spaces: Vec<PlannedSpace>,
    pub skipped: Vec<SkippedLook>,
    pub inputs_sha256: String,
}

impl Plan {
    pub fn looks(&self) -> Vec<String> {
        self.spaces.iter().flat_map(|space| space.looks.iter().map(|look| look.id.clone())).collect()
    }
}

pub struct PlanInput<'a> {
    pub files: &'a ClientFiles,
    pub recipes: &'a [u8],
    pub disabled: &'a [String],
    pub client_version: &'a str,
}

struct Environment {
    dashed: String,
    document: Document,
}

struct SpaceInputs {
    guids: BTreeSet<String>,
    list: Document,
    list_bytes: Vec<u8>,
    by_name: BTreeMap<String, Environment>,
}

struct Hasher(Sha256);

impl Hasher {
    fn add(&mut self, part: &[u8]) {
        self.0.update((part.len() as u64).to_le_bytes());
        self.0.update(part);
    }
}

fn environments_dir(space: &str) -> String {
    format!("spaces/{space}/{ENVIRONMENTS_DIR}/")
}

pub fn value_text(value: &Value) -> Option<String> {
    match value {
        Value::String(bytes) => std::str::from_utf8(bytes).ok().map(str::to_owned),
        Value::Blob(bytes) => Some(base64::engine::general_purpose::STANDARD.encode(bytes)),
        _ => None,
    }
}

fn read_document(files: &ClientFiles, located: &Located, hasher: &mut Hasher) -> AppResult<(Vec<u8>, Document)> {
    let bytes = files.read(located, MAX_XML_BYTES)?;

    hasher.add(files.fingerprint(located)?.as_bytes());

    let document = packed_xml::decode(&bytes).map_err(|error| AppError::coded(ErrorCode::Io, format!("{}: {error}", located.path)))?;

    Ok((bytes, document))
}

fn space_inputs(files: &ClientFiles, space: &str, hasher: &mut Hasher) -> Result<SpaceInputs, (SkipReason, String)> {
    let dir = environments_dir(space);
    let list_path = format!("{dir}{ENVIRONMENTS_XML}");
    let located = files.locate(&list_path).ok_or((SkipReason::BaseMissing, list_path.clone()))?;
    let source = files.source(&located);

    hasher.add(source.path.to_string_lossy().as_bytes());

    if source.overrides_game() {
        let name = source.path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();

        return Err((SkipReason::Shadowed, name));
    }

    let (list_bytes, list) = read_document(files, &located, hasher).map_err(|error| (SkipReason::BaseMissing, error.to_string()))?;
    let guids: Vec<String> =
        list.root.children.iter().filter(|child| child.name == ENVIRONMENT_TAG).filter_map(|child| value_text(&child.value)).collect();
    let mut by_name = BTreeMap::new();

    for guid in &guids {
        let path = format!("{dir}{}/{ENVIRONMENT_XML}", dashed(guid));
        let Some(located) = files.locate(&path) else {
            continue;
        };
        let Ok((_, document)) = read_document(files, &located, hasher) else {
            continue;
        };

        if let Some(name) = document.root.child(NAME_TAG).and_then(|node| value_text(&node.value)) {
            by_name.entry(name).or_insert(Environment { dashed: dashed(guid), document });
        }
    }

    Ok(SpaceInputs { guids: guids.iter().map(|guid| guid.trim().to_uppercase()).collect(), list, list_bytes, by_name })
}

fn rewrite_paths(root: &mut Node, from: &str, to: &str) {
    let from = from.to_lowercase();

    root.walk_mut(&mut |node| {
        if let Value::String(bytes) = &node.value {
            if bytes.len() >= from.len() && bytes[..from.len()].eq_ignore_ascii_case(from.as_bytes()) {
                let mut rewritten = to.as_bytes().to_vec();

                rewritten.extend_from_slice(&bytes[from.len()..]);
                node.value = Value::String(rewritten);
            }
        }
    });
}

fn replace_sky(root: &mut Node, texture: &str) -> usize {
    let mut replaced = 0;

    root.walk_mut(&mut |node| {
        if node.name == PROPERTY_TAG && node.value.as_text().is_some_and(|text| text.trim() == DIFFUSE_MAP) {
            if let Some(child) = node.children.iter_mut().find(|child| child.name == TEXTURE_TAG && child.children.is_empty()) {
                child.value = Value::String(texture.as_bytes().to_vec());
                replaced += 1;
            }
        }
    });

    replaced
}

fn is_packed_candidate(path: &str) -> bool {
    let lowered = path.to_lowercase();

    PACKED_EXTENSIONS.iter().any(|extension| lowered.ends_with(&format!(".{extension}")))
}

struct LookContext<'a> {
    files: &'a ClientFiles,
    look: &'a Look,
    base: &'a Environment,
    guid: &'a Guid,
    dir: String,
}

impl LookContext<'_> {
    fn base_prefix(&self) -> String {
        format!("{}{}/", self.dir, self.base.dashed)
    }

    fn look_prefix(&self) -> String {
        format!("{}{}/", self.dir, self.guid.dashed)
    }
}

enum PlanError {
    App(AppError),
    InvalidRecipe(String),
}

impl From<AppError> for PlanError {
    fn from(error: AppError) -> Self {
        Self::App(error)
    }
}

enum LookOutcome {
    Planned(PlannedLook),
    Skipped(SkippedLook),
}

struct FilePlan {
    file: PlannedFile,
    skies: Vec<&'static str>,
}

impl FilePlan {
    fn unchanged(path: String, content: Content) -> Self {
        Self { file: PlannedFile { path, content }, skies: Vec::new() }
    }
}

fn sky_textures(look: &Look) -> [(&'static str, &Option<String>); 2] {
    [(SKY_DEFERRED, &look.sky.deferred), (SKY_FORWARD, &look.sky.forward)]
}

fn transform(context: &LookContext, relative: &str, document: &mut Document) -> Result<Vec<&'static str>, String> {
    let look = context.look;
    let lowered = relative.to_lowercase();
    let mut skies = Vec::new();

    rewrite_paths(&mut document.root, &context.base_prefix(), &context.look_prefix());

    if lowered == ENVIRONMENT_XML {
        let name = document.root.nth_child_mut(NAME_TAG, 0).ok_or_else(|| format!("{relative} has no name"))?;

        name.value = Value::String(look.environment_name().into_bytes());

        for op in &look.set {
            apply_set(&mut document.root, op)?;
        }
    }

    for (file, texture) in sky_textures(look) {
        if let Some(texture) = texture.as_deref().filter(|_| lowered == file) {
            if replace_sky(&mut document.root, texture) == 0 {
                return Err(format!("{relative} has no {DIFFUSE_MAP}"));
            }

            skies.push(file);
        }
    }

    Ok(skies)
}

fn is_skipped_file(look: &Look, relative: &str) -> bool {
    let is_probe = relative.to_lowercase().starts_with(PROBES_DIR);

    relative.is_empty() || (!look.probes && is_probe)
}

fn plan_file(context: &LookContext, located: Located, hasher: &mut Hasher) -> Result<Option<FilePlan>, PlanError> {
    let prefix = context.base_prefix();
    let relative = located.path.get(prefix.len()..).unwrap_or_default().to_owned();

    if is_skipped_file(context.look, &relative) {
        return Ok(None);
    }

    hasher.add(context.files.fingerprint(&located)?.as_bytes());

    let path = format!("{PACKAGE_RES}{}{relative}", context.look_prefix());

    if !is_packed_candidate(&relative) {
        return Ok(Some(FilePlan::unchanged(path, Content::Copy(located))));
    }

    let bytes = context.files.read(&located, MAX_XML_BYTES)?;
    let Ok(original) = packed_xml::decode(&bytes) else {
        return Ok(Some(FilePlan::unchanged(path, Content::Bytes(bytes))));
    };
    let mut document = original.clone();
    let skies = transform(context, &relative, &mut document).map_err(PlanError::InvalidRecipe)?;
    let content = if document == original {
        bytes
    } else {
        packed_xml::encode(&document).map_err(|error| AppError::coded(ErrorCode::Io, format!("{relative}: {error}")))?
    };

    Ok(Some(FilePlan { file: PlannedFile { path, content: Content::Bytes(content) }, skies }))
}

fn ensure_skies(look: &Look, found: &BTreeSet<&str>) -> Result<(), PlanError> {
    let missing = sky_textures(look).into_iter().find(|(file, texture)| texture.is_some() && !found.contains(file));

    match missing {
        Some((file, _)) => Err(PlanError::InvalidRecipe(format!("the base environment has no {file}"))),
        None => Ok(()),
    }
}

fn plan_files(context: &LookContext, hasher: &mut Hasher) -> Result<Vec<PlannedFile>, PlanError> {
    let mut planned = Vec::new();
    let mut skies = BTreeSet::new();

    for located in context.files.list(&context.base_prefix()) {
        if let Some(plan) = plan_file(context, located, hasher)? {
            skies.extend(plan.skies);
            planned.push(plan.file);
        }
    }

    ensure_skies(context.look, &skies)?;

    Ok(planned)
}

fn invalid_set(look: &Look, base: &Environment) -> Option<String> {
    let mut base_check = base.document.clone();

    look.set.iter().find_map(|op| apply_set(&mut base_check.root, op).err())
}

fn missing_texture(files: &ClientFiles, look: &Look, hasher: &mut Hasher) -> Option<String> {
    for texture in look.textures() {
        let Some(located) = files.locate(&texture) else {
            return Some(texture);
        };

        hasher.add(format!("{}|{}", files.source(&located).path.display(), located.path.to_lowercase()).as_bytes());
    }

    None
}

struct LookInput<'a> {
    files: &'a ClientFiles,
    look: &'a Look,
    inputs: &'a SpaceInputs,
}

fn skipped(look: &Look, reason: SkipReason, detail: String) -> LookOutcome {
    LookOutcome::Skipped(SkippedLook::new(&look.id, reason, detail))
}

fn plan_look(input: LookInput, hasher: &mut Hasher) -> AppResult<LookOutcome> {
    let LookInput { files, look, inputs } = input;
    let Some(base) = inputs.by_name.get(&look.environment) else {
        return Ok(skipped(look, SkipReason::BaseMissing, look.environment.clone()));
    };
    let guid = look_guid(&look.id);

    if inputs.guids.contains(&guid.dotted) || inputs.by_name.contains_key(&look.environment_name()) {
        return Ok(skipped(look, SkipReason::GuidCollision, guid.dotted));
    }

    if let Some(detail) = invalid_set(look, base) {
        return Ok(skipped(look, SkipReason::InvalidRecipe, detail));
    }

    if let Some(texture) = missing_texture(files, look, hasher) {
        return Ok(skipped(look, SkipReason::MissingTexture, texture));
    }

    let context = LookContext { files, look, base, guid: &guid, dir: environments_dir(&look.space) };

    match plan_files(&context, hasher) {
        Ok(planned) => Ok(LookOutcome::Planned(PlannedLook { id: look.id.clone(), guid, files: planned })),
        Err(PlanError::InvalidRecipe(detail)) => Ok(skipped(look, SkipReason::InvalidRecipe, detail)),
        Err(PlanError::App(error)) => Err(error),
    }
}

fn insert_at(list: &Document) -> usize {
    let last_environment = list.root.children.iter().rposition(|child| child.name == ENVIRONMENT_TAG);

    last_environment.map_or(list.root.children.len(), |index| index + 1)
}

fn environments_with(inputs: &SpaceInputs, looks: &[PlannedLook]) -> AppResult<Vec<u8>> {
    if looks.is_empty() {
        return Ok(inputs.list_bytes.clone());
    }

    let mut list = inputs.list.clone();
    let position = insert_at(&list);
    let added = looks.iter().map(|look| Node::leaf(ENVIRONMENT_TAG, Value::String(look.guid.dotted.clone().into_bytes())));

    list.root.children.splice(position..position, added);

    packed_xml::encode(&list).map_err(|error| AppError::coded(ErrorCode::Io, format!("{ENVIRONMENTS_XML}: {error}")))
}

type LooksBySpace<'a> = BTreeMap<String, Vec<&'a Look>>;

fn group_by_space<'a>(looks: &'a [Look], input: &PlanInput, skipped: &mut Vec<SkippedLook>) -> LooksBySpace<'a> {
    let mut by_space = LooksBySpace::new();

    for look in looks {
        match recipe::gate(GateInput { look, client_version: input.client_version, disabled: input.disabled }) {
            Some(skip) => skipped.push(skip),
            None => by_space.entry(look.space.clone()).or_default().push(look),
        }
    }

    by_space
}

struct SpaceInput<'a> {
    files: &'a ClientFiles,
    space: String,
    looks: Vec<&'a Look>,
}

#[derive(Default)]
struct SpaceOutcome {
    planned: Option<PlannedSpace>,
    skipped: Vec<SkippedLook>,
}

fn plan_space(input: SpaceInput, hasher: &mut Hasher) -> AppResult<SpaceOutcome> {
    let SpaceInput { files, space, looks } = input;

    hasher.add(space.as_bytes());

    let inputs = match space_inputs(files, &space, hasher) {
        Ok(inputs) => inputs,
        Err((reason, detail)) => {
            return Ok(SpaceOutcome {
                planned: None,
                skipped: looks.iter().map(|look| SkippedLook::new(&look.id, reason, detail.clone())).collect(),
            });
        }
    };
    let mut outcome = SpaceOutcome::default();
    let mut planned = Vec::new();

    for look in looks {
        match plan_look(LookInput { files, look, inputs: &inputs }, hasher)? {
            LookOutcome::Planned(look) => planned.push(look),
            LookOutcome::Skipped(skip) => outcome.skipped.push(skip),
        }
    }

    if !planned.is_empty() {
        outcome.planned = Some(PlannedSpace { environments: environments_with(&inputs, &planned)?, space, looks: planned });
    }

    Ok(outcome)
}

pub fn plan(input: PlanInput) -> AppResult<Plan> {
    let mut hasher = Hasher(Sha256::new());

    hasher.add(GENERATOR_VERSION.as_bytes());
    hasher.add(input.client_version.as_bytes());
    hasher.add(input.recipes);
    hasher.add(input.disabled.join("\n").as_bytes());

    let recipes = recipe::parse(input.recipes);
    let mut skipped = recipes.skipped;
    let by_space = group_by_space(&recipes.looks, &input, &mut skipped);
    let mut spaces = Vec::new();

    for (space, looks) in by_space {
        let outcome = plan_space(SpaceInput { files: input.files, space, looks }, &mut hasher)?;

        skipped.extend(outcome.skipped);
        spaces.extend(outcome.planned);
    }

    Ok(Plan { spaces, skipped, inputs_sha256: hex::encode(hasher.0.finalize()) })
}

pub fn meta_xml(client_version: &str) -> String {
    format!(
        "<root>\n    <id>{GENERATED_PACKAGE_ID}</id>\n    <version>{client_version}</version>\n    <name>{PACKAGE_NAME}</name>\n    <description>{PACKAGE_DESCRIPTION}</description>\n</root>\n"
    )
}

fn parent_dirs(path: &str) -> Vec<String> {
    let parts: Vec<&str> = path.split('/').collect();

    (1..parts.len()).map(|count| format!("{}/", parts[..count].join("/"))).collect()
}

fn zip_options() -> AppResult<SimpleFileOptions> {
    let date = zip::DateTime::from_date_and_time(ZIP_DATE.year, ZIP_DATE.month, ZIP_DATE.day, 0, 0, 0)
        .map_err(|error| AppError::coded(ErrorCode::Io, error.to_string()))?;

    Ok(SimpleFileOptions::default().compression_method(CompressionMethod::Stored).last_modified_time(date))
}

enum ZipContent<'a> {
    Bytes(&'a [u8]),
    Copy(&'a Located),
}

impl<'a> From<&'a Content> for ZipContent<'a> {
    fn from(content: &'a Content) -> Self {
        match content {
            Content::Bytes(bytes) => Self::Bytes(bytes),
            Content::Copy(located) => Self::Copy(located),
        }
    }
}

fn package_entries(plan: &Plan) -> Vec<(String, ZipContent<'_>)> {
    let mut entries = Vec::new();

    for space in &plan.spaces {
        let list_path = format!("{PACKAGE_RES}{}{ENVIRONMENTS_XML}", environments_dir(&space.space));
        let look_files = space.looks.iter().flat_map(|look| &look.files);

        entries.extend(look_files.map(|file| (file.path.clone(), ZipContent::from(&file.content))));
        entries.push((list_path, ZipContent::Bytes(&space.environments)));
    }

    entries.sort_by(|left, right| left.0.cmp(&right.0));
    entries
}

struct WriteEntriesInput<'a> {
    files: &'a ClientFiles,
    plan: &'a Plan,
    client_version: &'a str,
    out: File,
}

fn write_entries(input: WriteEntriesInput) -> AppResult<File> {
    let options = zip_options()?;
    let mut writer = ZipWriter::new(input.out);
    let mut written_dirs = BTreeSet::new();

    writer.start_file(META_XML, options.unix_permissions(FILE_MODE))?;
    writer.write_all(meta_xml(input.client_version).as_bytes())?;

    for (path, content) in package_entries(input.plan) {
        for dir in parent_dirs(&path) {
            if written_dirs.insert(dir.clone()) {
                writer.add_directory(dir, options.unix_permissions(DIR_MODE))?;
            }
        }

        writer.start_file(path, options.unix_permissions(FILE_MODE))?;

        match content {
            ZipContent::Bytes(bytes) => writer.write_all(bytes)?,
            ZipContent::Copy(located) => {
                input.files.copy(located, &mut writer, MAX_COPY_BYTES)?;
            }
        }
    }

    Ok(writer.finish()?)
}

pub struct BuildInput<'a> {
    pub files: &'a ClientFiles,
    pub plan: &'a Plan,
    pub client_version: &'a str,
    pub target: &'a Path,
}

pub fn build(input: BuildInput) -> AppResult<()> {
    let part = sibling(input.target, PART_SUFFIX);

    if let Some(parent) = input.target.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let written = File::create(&part)
        .map_err(AppError::from)
        .and_then(|out| write_entries(WriteEntriesInput { files: input.files, plan: input.plan, client_version: input.client_version, out }))
        .and_then(|file| Ok(file.sync_all()?))
        .and_then(|()| rename_file(&part, input.target));

    if written.is_err() {
        let _ = std::fs::remove_file(&part);
    }

    written
}
