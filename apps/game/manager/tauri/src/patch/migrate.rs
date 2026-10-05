use std::fs;
use std::path::Path;

use super::stage::{commit_journal, stage, StagedFile};
use crate::components::{is_owned, sync_manifest, ClientContext};
use crate::dependencies::{carry, CarryInput};
use crate::error::{AppError, AppResult, ErrorCode};
use crate::fsx::{list_files, same_content};
use crate::releases::sha256_hex;
use crate::state::save_client_state;

pub struct MigrateInput<'a> {
    pub context: ClientContext<'a>,
    pub from_mods_dir: &'a Path,
}

struct Carried {
    name: String,
    bytes: Vec<u8>,
    sha256: String,
}

fn packages_to_carry(input: &MigrateInput) -> AppResult<Vec<Carried>> {
    let target = &input.context.client.mods_dir;

    list_files(input.from_mods_dir)
        .into_iter()
        .filter_map(|file| file.file_name().map(|name| (name.to_string_lossy().into_owned(), file.clone())))
        .filter(|(name, file)| is_owned(input.context.catalog, name) && !same_content(file, &target.join(name)))
        .map(|(name, file)| {
            let bytes = fs::read(&file)?;
            let sha256 = sha256_hex(&bytes);

            Ok(Carried { name, bytes, sha256 })
        })
        .collect()
}

fn holds_owned(dir: &Path, input: &MigrateInput) -> bool {
    list_files(dir).iter().filter_map(|file| file.file_name()).any(|name| is_owned(input.context.catalog, &name.to_string_lossy()))
}

fn ensure_source(input: &MigrateInput) -> AppResult<()> {
    let carried = input.from_mods_dir.is_absolute() && holds_owned(input.from_mods_dir, input);

    if !carried && !holds_owned(&input.context.client.mods_dir, input) {
        return Err(AppError::coded(ErrorCode::NotInstalled, format!("no modpack files in {} to carry", input.from_mods_dir.display())));
    }

    Ok(())
}

pub fn migrate(input: MigrateInput) -> AppResult<Vec<String>> {
    ensure_source(&input)?;

    let target = &input.context.client.mods_dir;
    let packages = packages_to_carry(&input)?;
    let files: Vec<StagedFile> =
        packages.iter().map(|package| StagedFile { dir: target, name: &package.name, bytes: &package.bytes, sha256: &package.sha256 }).collect();

    fs::create_dir_all(target)?;

    let staging = stage(&files)?;

    if let Err(error) = carry(CarryInput { context: input.context, from_mods_dir: input.from_mods_dir }) {
        staging.discard();

        return Err(error);
    }

    staging.commit(&commit_journal(input.context.client_dir), &[])?;
    sync_manifest(input.context)?;
    save_client_state(input.context.client_dir, input.context.client)?;

    Ok(packages.into_iter().map(|package| package.name).collect())
}
