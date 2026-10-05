use std::fs;
use std::path::Path;

use super::stage::{stage, StagedFile};
use crate::components::{is_owned, sync_manifest, ClientContext};
use crate::dependencies::{carry, CarryInput};
use crate::error::AppResult;
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

pub fn migrate(input: MigrateInput) -> AppResult<Vec<String>> {
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

    staging.commit(&[])?;
    sync_manifest(input.context)?;
    save_client_state(input.context.client_dir, input.context.client)?;

    Ok(packages.into_iter().map(|package| package.name).collect())
}
