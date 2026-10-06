use std::io::Write;
use std::path::{Path, PathBuf};

use tempfile::NamedTempFile;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

use crate::error::AppResult;
use crate::fsx::{parent_dir, TEMP_SUFFIX};

pub struct AtomicZip {
    writer: ZipWriter<NamedTempFile>,
    options: SimpleFileOptions,
    target: PathBuf,
}

impl AtomicZip {
    pub fn create(target: &Path) -> AppResult<Self> {
        let parent = parent_dir(target);

        std::fs::create_dir_all(parent)?;

        let temp = tempfile::Builder::new().suffix(TEMP_SUFFIX).tempfile_in(parent)?;

        Ok(Self {
            writer: ZipWriter::new(temp),
            options: SimpleFileOptions::default().compression_method(CompressionMethod::Deflated),
            target: target.to_path_buf(),
        })
    }

    pub fn add(&mut self, name: &str, bytes: &[u8]) -> AppResult<()> {
        self.writer.start_file(name, self.options)?;
        self.writer.write_all(bytes)?;

        Ok(())
    }

    pub fn finish(self) -> AppResult<PathBuf> {
        let temp = self.writer.finish()?;

        temp.as_file().sync_all()?;
        temp.persist(&self.target).map_err(|error| error.error)?;

        Ok(self.target)
    }
}

#[cfg(test)]
mod tests;
