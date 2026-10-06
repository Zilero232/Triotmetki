mod texts;

use std::time::{Duration, Instant};

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager as _};
use tauri_plugin_autostart::ManagerExt as _;
use tauri_plugin_notification::NotificationExt as _;
use tauri_plugin_window_state::StateFlags;

use crate::error::{AppError, AppResult, ErrorCode};
use crate::service::{CheckOutcome, Manager};
use crate::settings::Locale;

pub const EVENT_REPORT: &str = "patch-report";
pub const BACKGROUND_ARG: &str = "--background";
pub const MAIN_WINDOW: &str = "main";
pub const WINDOW_STATE: StateFlags = StateFlags::SIZE.union(StateFlags::POSITION).union(StateFlags::MAXIMIZED);
pub const TRAY_ID: &str = "main";
pub const TICK: Duration = Duration::from_secs(60);
pub const SECONDS_PER_MINUTE: u64 = 60;

const MENU_OPEN: &str = "open";
const MENU_CHECK: &str = "check";
const MENU_QUIT: &str = "quit";

pub fn locale(manager: &Manager) -> Locale {
    manager.settings().language.resolve(sys_locale::get_locale().as_deref())
}

pub fn started_in_background() -> bool {
    std::env::args().any(|arg| arg == BACKGROUND_ARG)
}

pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn publish(app: &AppHandle, outcome: &CheckOutcome) {
    let manager = app.state::<Manager>();

    if let Err(error) = app.emit(EVENT_REPORT, &outcome.report) {
        log::warn!("emit {EVENT_REPORT}: {error}");
    }

    if !manager.settings().notifications {
        return;
    }

    let changed = outcome.changed.then_some(&outcome.report).into_iter().chain(outcome.others.iter());

    for report in changed {
        if let Some(notice) = texts::notice(&report.status, locale(&manager)) {
            if let Err(error) = app.notification().builder().title(notice.title).body(notice.body).show() {
                log::warn!("notification: {error}");
            }
        }
    }
}

pub fn check_in_background(app: &AppHandle) {
    let app = app.clone();

    tauri::async_runtime::spawn(async move {
        let outcome = app.state::<Manager>().check().await;

        publish(&app, &outcome);
    });
}

pub fn init_tray(app: &AppHandle) -> tauri::Result<()> {
    let texts = texts::tray(locale(&app.state::<Manager>()));
    let open = MenuItem::with_id(app, MENU_OPEN, texts.open, true, None::<&str>)?;
    let check = MenuItem::with_id(app, MENU_CHECK, texts.check, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, MENU_QUIT, texts.quit, true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&open, &check, &separator, &quit])?;
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip(texts.tooltip)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            MENU_OPEN => show_main(app),
            MENU_CHECK => check_in_background(app),
            MENU_QUIT => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                show_main(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;

    Ok(())
}

pub fn spawn_scheduler(app: &AppHandle) {
    let app = app.clone();

    tauri::async_runtime::spawn(async move {
        let mut last_check: Option<Instant> = None;

        loop {
            let manager = app.state::<Manager>();
            let interval = Duration::from_secs(u64::from(manager.settings().check_interval_minutes) * SECONDS_PER_MINUTE);
            let due = last_check.is_none_or(|at| at.elapsed() >= interval);

            if due || manager.needs_check() {
                let outcome = manager.check().await;

                publish(&app, &outcome);
                last_check = Some(Instant::now());
            }

            tokio::time::sleep(TICK).await;
        }
    });
}

pub fn apply_autostart(app: &AppHandle, enabled: bool) -> AppResult<()> {
    if cfg!(debug_assertions) {
        return Ok(());
    }

    let autolaunch = app.autolaunch();
    let failed = |error: tauri_plugin_autostart::Error| AppError::coded(ErrorCode::Autostart, error.to_string());
    let current = autolaunch.is_enabled().map_err(failed)?;

    match (enabled, current) {
        (true, false) => autolaunch.enable().map_err(failed),
        (false, true) => autolaunch.disable().map_err(failed),
        _ => Ok(()),
    }
}
