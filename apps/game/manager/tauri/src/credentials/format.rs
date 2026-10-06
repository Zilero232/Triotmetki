use std::path::{Path, PathBuf};

use semver::Version;

use crate::catalog::PACKAGE_EXTENSIONS;

pub const CORE_PACKAGE_PREFIX: &str = "net.triotmetki.core_";
pub const SEALED_SINCE_CORE: Version = Version::new(0, 9, 4);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SecretFormat {
    Plaintext,
    Sealed,
}

impl SecretFormat {
    pub fn for_installed(files: &[PathBuf]) -> Self {
        let reads_sealed = files.iter().filter_map(|file| core_version(file)).any(|version| version >= SEALED_SINCE_CORE);

        if reads_sealed {
            Self::Sealed
        } else {
            Self::Plaintext
        }
    }
}

fn core_version(file: &Path) -> Option<Version> {
    let extension = file.extension()?.to_str()?.to_ascii_lowercase();

    if !PACKAGE_EXTENSIONS.contains(&extension.as_str()) {
        return None;
    }

    let stem = file.file_stem()?.to_str()?.to_ascii_lowercase();
    let version = stem.strip_prefix(CORE_PACKAGE_PREFIX)?;

    Version::parse(version).ok()
}
