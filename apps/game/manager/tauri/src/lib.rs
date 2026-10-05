mod background;
mod cache;
mod catalog;
mod changelog;
mod commands;
mod components;
mod conflicts;
mod crash;
mod credentials;
mod deep_link;
mod dependencies;
mod detect;
mod durable;
mod error;
mod fsx;
mod gameface;
mod health;
mod ini_file;
mod install;
mod logs;
mod patch;
mod paths;
mod previews;
mod process;
mod profiles;
mod releases;
mod report;
mod service;
mod sets;
mod settings;
mod site;
mod state;
mod sync;

#[cfg(test)]
mod contract;

use tauri::{AppHandle, Emitter, Manager as _, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_deep_link::DeepLinkExt as _;
use tauri_plugin_log::{Target, TargetKind};

use crate::background::{BACKGROUND_ARG, MAIN_WINDOW};
use crate::deep_link::DeepLink;
use crate::paths::Layout;
use crate::releases::{api_url, ReleasesClient};
use crate::service::Manager;

pub const UNINSTALL_ARG: &str = "--uninstall-mods";
pub const LOG_FILE: &str = "manager";

fn deliver_link(app: &AppHandle, link: DeepLink) {
    app.state::<Manager>().set_pending_link(link.clone());

    if let Err(error) = app.emit(deep_link::EVENT, &link) {
        log::warn!("emit {}: {error}", deep_link::EVENT);
    }

    background::show_main(app);
}

fn uninstall_mods(layout: &Layout) {
    let loaded = catalog::load(&layout.catalog_cache());
    let owned = install::owned_patterns_catalog(loaded.map(|loaded| loaded.catalog));

    for client in install::uninstall_everywhere(&layout.clients_dir(), &owned) {
        log::info!("removed the modpack from {}", client.display());
    }
}

pub fn run() {
    let layout = Layout::from_env().unwrap_or_else(|error| crash::fatal(&error));

    if std::env::args().any(|arg| arg == UNINSTALL_ARG) {
        uninstall_mods(&layout);

        return;
    }

    let log_dir = layout.logs_dir();

    let started = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| match deep_link::first_arg_link(args.iter().map(String::as_str)) {
            Some(link) => deliver_link(app, link),
            None => background::show_main(app),
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([Target::new(TargetKind::Stdout), Target::new(TargetKind::Folder { path: log_dir, file_name: Some(LOG_FILE.to_owned()) })])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![BACKGROUND_ARG])))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(move |app| {
            let manager = Manager::new(layout, ReleasesClient::new(api_url())?)?;
            let settings = manager.settings();

            for client_dir in manager.recover_commits() {
                log::warn!("rolled back an unfinished commit in {}", client_dir.display());
            }
            let handle = app.handle().clone();

            if let Err(error) = app.asset_protocol_scope().allow_directory(manager.layout.manager_dir().join(previews::DIR), true) {
                log::warn!("previews scope: {error}");
            }

            app.manage(manager);
            background::init_tray(&handle)?;

            if cfg!(debug_assertions) {
                if let Err(error) = app.deep_link().register_all() {
                    log::warn!("deep link registration: {error}");
                }
            }

            let link_handle = handle.clone();

            app.deep_link().on_open_url(move |event| {
                if let Some(link) = deep_link::first_link(&event.urls()) {
                    deliver_link(&link_handle, link);
                }
            });

            if let Some(link) = app.deep_link().get_current().ok().flatten().and_then(|urls| deep_link::first_link(&urls)) {
                handle.state::<Manager>().set_pending_link(link);
            }

            if settings.autostart_asked {
                if let Err(error) = background::apply_autostart(&handle, settings.autostart) {
                    log::warn!("autostart: {error}");
                }
            }

            if !background::started_in_background() {
                background::show_main(&handle);
            }

            background::spawn_scheduler(&handle);
            log::info!("manager {} started", env!("MANAGER_VERSION"));

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == MAIN_WINDOW {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::list_clients,
            commands::add_client,
            commands::select_client,
            commands::get_catalog,
            commands::get_installation,
            commands::set_component_enabled,
            commands::list_profiles,
            commands::save_profile,
            commands::activate_profile,
            commands::rename_profile,
            commands::delete_profile,
            commands::import_profile,
            commands::export_profile,
            commands::import_profile_file,
            commands::get_settings,
            commands::update_settings,
            commands::get_patch_report,
            commands::check_now,
            commands::update_modpack,
            commands::migrate_modpack,
            commands::collect_logs,
            commands::reveal_path,
            commands::prepare_install,
            commands::install_modpack,
            commands::uninstall_modpack,
            commands::read_installer_profile,
            commands::get_gameface_status,
            commands::take_deep_link,
            commands::get_conflicts,
            commands::restore_missing,
            commands::scan_cache,
            commands::clear_cache,
            commands::get_account_link,
            commands::link_account,
            commands::select_sync_account,
            commands::get_sync_status,
            commands::sync_now,
            commands::get_whats_new,
            commands::mark_release_seen,
            commands::prepare_report,
            commands::send_report,
            commands::save_report,
            commands::get_game_health,
        ])
        .run(tauri::generate_context!());

    if let Err(error) = started {
        crash::fatal(&error);
    }
}
