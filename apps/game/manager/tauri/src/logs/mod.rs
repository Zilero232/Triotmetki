use std::fs;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Local};

use crate::archive::AtomicZip;
use crate::detect::GameClient;
use crate::error::AppResult;
use crate::fsx::list_files;
use crate::paths::{configs_dir, Layout};
use crate::report::Redactor;
use crate::state::{client_key, disabled_dir, CLIENT_INI, MANIFEST_INI};
use crate::text::{decode_text, Fallback};

pub const ZIP_PREFIX: &str = "otmetki-logs-";
pub const STAMP_FORMAT: &str = "%Y%m%d-%H%M%S";
pub const CLIENT_FILES: [&str; 3] = ["python.log", "version.xml", "paths.xml"];
pub const CONFIG_FILES: [&str; 3] = ["config.json", "components.json", "profiles.json"];
pub const MAX_LOG_BYTES: u64 = 16 * 1024 * 1024;
pub const REDACTED_KEYS: [&str; 1] = ["bind_code"];
pub const REDACTED: &str = "<redacted>";
pub const UTF8_BOM: [u8; 3] = [0xEF, 0xBB, 0xBF];

pub fn redact_config(bytes: &[u8]) -> Vec<u8> {
    let Ok(mut value) = serde_json::from_slice::<serde_json::Value>(bytes.strip_prefix(&UTF8_BOM).unwrap_or(bytes)) else {
        return bytes.to_vec();
    };

    if let Some(object) = value.as_object_mut() {
        for key in REDACTED_KEYS {
            if object.get(key).and_then(serde_json::Value::as_str).is_some_and(|text| !text.is_empty()) {
                object.insert(key.to_owned(), serde_json::Value::from(REDACTED));
            }
        }
    }

    serde_json::to_vec_pretty(&value).unwrap_or_else(|_| bytes.to_vec())
}

pub struct CollectInput<'a> {
    pub layout: &'a Layout,
    pub clients: &'a [GameClient],
    pub output_dir: &'a Path,
    pub now: DateTime<Local>,
    pub redactor: &'a Redactor,
}

struct Bundle<'a> {
    zip: AtomicZip,
    redactor: &'a Redactor,
}

impl Bundle<'_> {
    fn add_bytes(&mut self, name: &str, bytes: &[u8]) -> AppResult<()> {
        let (redacted, _) = self.redactor.redact(&decode_text(bytes, Fallback::Windows1251));

        self.zip.add(name, redacted.as_bytes())
    }

    fn add_config_files(&mut self, prefix: &str, client: &GameClient) -> AppResult<()> {
        for name in CONFIG_FILES {
            let path = configs_dir(&client.path).join(name);
            let small_enough = fs::metadata(&path).is_ok_and(|metadata| metadata.is_file() && metadata.len() <= MAX_LOG_BYTES);

            if small_enough {
                self.add_bytes(&format!("{prefix}/configs/{name}"), &redact_config(&fs::read(&path)?))?;
            }
        }

        Ok(())
    }

    fn add_client(&mut self, layout: &Layout, client: &GameClient) -> AppResult<()> {
        let state_dir = layout.client_dir(&client.path);
        let prefix = format!("clients/{}", client_key(&client.path));
        let dirs = [("mods", client.mods_dir.clone()), ("res_mods", client.res_mods_dir.clone()), ("disabled", disabled_dir(&state_dir))];

        self.add_bytes(&format!("{prefix}/client.txt"), format!("{}\n{}\n", client.path.display(), client.version).as_bytes())?;
        self.add_bytes(&format!("{prefix}/listing.txt"), listing(&dirs).as_bytes())?;

        for name in CLIENT_FILES {
            self.add_file(&format!("{prefix}/{name}"), &client.path.join(name))?;
        }

        self.add_config_files(&prefix, client)?;

        for name in [MANIFEST_INI, CLIENT_INI] {
            self.add_file(&format!("{prefix}/state/{name}"), &state_dir.join(name))?;
        }

        Ok(())
    }

    fn add_file(&mut self, name: &str, path: &Path) -> AppResult<()> {
        let small_enough = fs::metadata(path).is_ok_and(|metadata| metadata.is_file() && metadata.len() <= MAX_LOG_BYTES);

        if small_enough {
            self.add_bytes(name, &fs::read(path)?)?;
        }

        Ok(())
    }
}

fn listing(dirs: &[(&str, PathBuf)]) -> String {
    dirs.iter()
        .map(|(label, dir)| {
            let files: Vec<String> = list_files(dir)
                .iter()
                .map(|path| {
                    let size = fs::metadata(path).map(|metadata| metadata.len()).unwrap_or_default();

                    format!("  {} ({size} B)", path.file_name().unwrap_or_default().to_string_lossy())
                })
                .collect();

            format!("{label}: {}\n{}\n", dir.display(), files.join("\n"))
        })
        .collect()
}

pub fn collect(input: CollectInput) -> AppResult<PathBuf> {
    let zip_path = input.output_dir.join(format!("{ZIP_PREFIX}{}.zip", input.now.format(STAMP_FORMAT)));

    let mut bundle = Bundle { zip: AtomicZip::create(&zip_path)?, redactor: input.redactor };

    for log in list_files(&input.layout.logs_dir()) {
        let name = log.file_name().unwrap_or_default().to_string_lossy().into_owned();

        bundle.add_file(&format!("manager/{name}"), &log)?;
    }

    bundle.add_file("manager/settings.json", &input.layout.settings_file())?;

    for client in input.clients {
        bundle.add_client(input.layout, client)?;
    }

    bundle.zip.finish()
}

#[cfg(test)]
mod tests;
