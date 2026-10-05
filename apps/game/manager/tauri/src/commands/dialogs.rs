use std::path::PathBuf;

use serde::Deserialize;
use tauri::{AppHandle, Manager as _};
use tauri_plugin_dialog::{DialogExt as _, FileDialogBuilder, FilePath};

use super::run_blocking;
use crate::background::MAIN_WINDOW;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::paths::safe_file_name;

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DialogText {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub filter: Option<String>,
    #[serde(default)]
    pub file_name: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DialogKind {
    Folder,
    Open,
    Save,
}

pub struct FileDialog {
    pub kind: DialogKind,
    pub text: DialogText,
    pub extensions: &'static [&'static str],
    pub fallback_name: &'static str,
}

fn builder(app: &AppHandle, dialog: &FileDialog) -> FileDialogBuilder<tauri::Wry> {
    let mut builder = app.dialog().file();

    if let Some(title) = &dialog.text.title {
        builder = builder.set_title(title);
    }

    if !dialog.extensions.is_empty() {
        builder = builder.add_filter(dialog.text.filter.clone().unwrap_or_default(), dialog.extensions);
    }

    if dialog.kind == DialogKind::Save {
        builder = builder.set_file_name(safe_file_name(dialog.text.file_name.as_deref().unwrap_or_default(), dialog.fallback_name));
    }

    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        builder = builder.set_parent(&window);
    }

    builder
}

fn chosen(path: Option<FilePath>) -> AppResult<Option<PathBuf>> {
    path.map(|path| path.into_path().map_err(|error| AppError::coded(ErrorCode::InvalidPath, error.to_string()))).transpose()
}

pub async fn ask_path(app: &AppHandle, dialog: FileDialog) -> AppResult<Option<PathBuf>> {
    let app = app.clone();

    run_blocking(move || {
        let builder = builder(&app, &dialog);

        chosen(match dialog.kind {
            DialogKind::Folder => builder.blocking_pick_folder(),
            DialogKind::Open => builder.blocking_pick_file(),
            DialogKind::Save => builder.blocking_save_file(),
        })
    })
    .await
}
