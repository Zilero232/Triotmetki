use std::fmt::Display;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};

use crate::error::AppResult;

pub const CRASH_LOG: &str = "otmetki-manager-crash.log";
pub const TITLE: &str = "Три отметки";
pub const HEADLINE: &str = "Менеджер не запустился. The manager failed to start.";

pub fn write_crash_log(dir: &Path, message: &str) -> AppResult<PathBuf> {
    let path = dir.join(CRASH_LOG);
    let mut file = OpenOptions::new().create(true).append(true).open(&path)?;

    writeln!(file, "{} manager {}: {message}", chrono::Local::now().to_rfc3339(), env!("MANAGER_VERSION"))?;

    Ok(path)
}

pub fn fatal(error: &dyn Display) -> ! {
    let message = error.to_string();
    let text = match write_crash_log(&std::env::temp_dir(), &message) {
        Ok(log) => format!("{HEADLINE}\n\n{message}\n\n{}", log.display()),
        Err(_) => format!("{HEADLINE}\n\n{message}"),
    };

    log::error!("startup failed: {message}");
    rfd::MessageDialog::new().set_level(rfd::MessageLevel::Error).set_title(TITLE).set_description(text).set_buttons(rfd::MessageButtons::Ok).show();
    std::process::exit(1)
}

#[cfg(test)]
mod tests;
