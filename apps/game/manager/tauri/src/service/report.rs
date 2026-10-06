use std::path::{Path, PathBuf};

use chrono::{DateTime, Local, NaiveDateTime};

use super::Manager;
use crate::components::{read_installation, ComponentState};
use crate::detect::GameClient;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::health::{merge_failures, scan_file, HealthReport, LogSource};
use crate::paths::configs_dir;
use crate::report::{
    item, newest_file, read_tail, upload, write_zip, RedactContext, Redactor, ReportItem, ReportPart, ReportPreview, ReportReceipt, ENVIRONMENT_FILE,
    MANAGER_LOG_FILE, MANAGER_TAIL_BYTES, OTMETKI_LOG, OTMETKI_TAIL_BYTES, PYTHON_LOG, PYTHON_TAIL_BYTES, REPORTS_PATH,
};
use crate::state::Manifest;

pub const MANIFEST_DATE_FORMAT: &str = "%Y-%m-%d %H:%M:%S";

fn user_name() -> Option<String> {
    std::env::var("USERNAME").ok().or_else(|| dirs::home_dir().and_then(|home| home.file_name().map(|name| name.to_string_lossy().into_owned())))
}

fn expired() -> AppError {
    AppError::coded(ErrorCode::ReportExpired, "the report preview is gone, collect it again")
}

fn modified(path: &Path) -> Option<DateTime<Local>> {
    std::fs::metadata(path).and_then(|metadata| metadata.modified()).ok().map(DateTime::<Local>::from)
}

impl Manager {
    pub fn redactor(&self) -> Redactor {
        let accounts = self.credential_store().load();
        let account_ids = accounts.iter().map(|credentials| credentials.account_id).collect();
        let secrets = accounts.into_iter().map(|credentials| credentials.secret).collect();

        Redactor::new(&RedactContext { user_name: user_name(), account_ids, secrets })
    }

    fn catalog_ids(&self) -> Option<Vec<String>> {
        self.catalog().map(|loaded| loaded.catalog.components.iter().map(|component| component.id.clone()).collect())
    }

    fn environment(&self, client: Option<&GameClient>, modpack: Option<&str>) -> String {
        let mut lines = vec![
            format!("manager: {}", env!("MANAGER_VERSION")),
            format!("modpack: {}", modpack.unwrap_or("-")),
            format!("windows: {}", sysinfo::System::long_os_version().unwrap_or_default()),
        ];

        if let Some(client) = client {
            lines.push(format!("game: {} {:?} {}", client.version, client.branch, client.realm.as_deref().unwrap_or("-")));
            lines.push(format!("client problem: {:?}", client.problem));
        }

        if let Some(installation) =
            client.and_then(|client| self.scope(Some(&client.path)).ok()).and_then(|scope| read_installation(scope.context()).ok())
        {
            for state in [ComponentState::Enabled, ComponentState::Disabled, ComponentState::Missing] {
                let ids: Vec<&str> =
                    installation.components.iter().filter(|component| component.state == state).map(|component| component.id.as_str()).collect();

                lines.push(format!("components {state:?}: {}", ids.join(", ")).to_lowercase());
            }
        }

        format!("{}\n", lines.join("\n"))
    }

    pub fn prepare_report(&self, client_path: Option<&Path>) -> ReportPreview {
        let redactor = self.redactor();
        let client = self.client(client_path).ok();
        let modpack = self.installed_modpack(client_path);
        let mut items: Vec<ReportItem> =
            vec![item(ReportPart::Environment, ENVIRONMENT_FILE, &self.environment(client.as_ref(), modpack.as_deref()), false, &redactor)];
        let mut add = |part: ReportPart, name: &str, path: Option<PathBuf>, max_bytes: u64| {
            if let Some((text, truncated)) = path.and_then(|path| read_tail(&path, max_bytes)).filter(|(text, _)| !text.trim().is_empty()) {
                items.push(item(part, name, &text, truncated, &redactor));
            }
        };

        add(ReportPart::ManagerLog, MANAGER_LOG_FILE, newest_file(&self.layout.logs_dir()), MANAGER_TAIL_BYTES);

        if let Some(client) = &client {
            add(ReportPart::PythonLog, PYTHON_LOG, Some(client.path.join(PYTHON_LOG)), PYTHON_TAIL_BYTES);
            add(ReportPart::OtmetkiLog, OTMETKI_LOG, Some(configs_dir(&client.path).join(OTMETKI_LOG)), OTMETKI_TAIL_BYTES);
        }

        let preview = ReportPreview {
            id: crate::site::new_nonce(),
            manager_version: env!("MANAGER_VERSION").to_owned(),
            modpack_version: modpack,
            game_version: client.map(|client| client.version.to_string()),
            items,
        };

        self.keep_report_preview(&preview);

        preview
    }

    pub async fn send_report(&self, preview_id: &str, parts: &[ReportPart], message: &str) -> AppResult<ReportReceipt> {
        let preview = self.report_preview(preview_id).ok_or_else(expired)?;
        let receipt: ReportReceipt = self.site.post(REPORTS_PATH, &upload(&preview, parts, message)).await?;

        log::info!("problem report {} sent", receipt.id);

        Ok(receipt)
    }

    pub fn save_report(&self, preview_id: &str, parts: &[ReportPart], message: &str, target: &Path) -> AppResult<PathBuf> {
        let preview = self.report_preview(preview_id).ok_or_else(expired)?;

        write_zip(target, &preview, parts, message)
    }

    pub fn game_health(&self, client_path: Option<&Path>) -> AppResult<HealthReport> {
        let client = self.client(client_path)?;
        let redactor = self.redactor();
        let python_log = client.path.join(PYTHON_LOG);
        let log_time = modified(&python_log);
        let installed_at = Manifest::read(&self.layout.client_dir(&client.path))
            .ok()
            .flatten()
            .and_then(|manifest| NaiveDateTime::parse_from_str(&manifest.date, MANIFEST_DATE_FORMAT).ok())
            .and_then(|date| date.and_local_timezone(Local).earliest());
        let known = self.catalog_ids();
        let failures = merge_failures(
            vec![
                scan_file(&configs_dir(&client.path).join(OTMETKI_LOG), LogSource::OtmetkiLog, &redactor),
                scan_file(&python_log, LogSource::PythonLog, &redactor),
            ],
            known.as_deref(),
        );

        Ok(HealthReport {
            stale: matches!((log_time, installed_at), (Some(log), Some(installed)) if log < installed),
            log_time: log_time.map(|time| time.to_rfc3339()),
            failures,
        })
    }
}
