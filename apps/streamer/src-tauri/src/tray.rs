use tauri::{menu::MenuEvent, AppHandle, Emitter, Manager as _};
use tauri_plugin_dialog::{DialogExt as _, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_log::log::{error, info};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::StoreExt;

use crate::commands::windows;

pub fn tray_menu_handler(app: &AppHandle, event: MenuEvent) {
    match event.id.as_ref() {
        "logout" => {
            info!("Logout button was clicked, clearing all cookies and re-authenticating...");
            let state = app.state::<crate::AppClient>();
            if let Err(e) = state.cookie_vault.clear_cookies() {
                error!("Can't clear cookies from the cookie jar due to {}", e);
                error!("Continuing anyway, but something very wrong is happening...");
            }

            let cookie_file_path = match app.path().app_config_dir() {
                Ok(dir) => dir.join("cookies.json"),
                Err(e) => {
                    error!("Could not get app_config_dir: {}", e);
                    return;
                }
            };
            if let Err(e) = state
                .cookie_vault
                .save_into(&cookie_file_path.to_string_lossy())
            {
                error!("Failed to persist cleared cookies: {}", e);
            }

            let webviews = app.webview_windows();
            for (label, webview) in webviews {
                if let Err(e) = webview.clear_all_browsing_data() {
                    error!(
                        "Unable to clear all browsing data for {} due to {}. Continuing anyway",
                        label, e
                    );
                }
            }

            let _ = app.emit("logged-out", ());

            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                let mapping = app_handle
                    .state::<crate::AppClient>()
                    .mapping
                    .clone();
                crate::run_auth(app_handle, mapping).await;
            });
        }
        "sync_popup" => {
            info!("Sync popup triggered from the tray menu");
            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = windows::spawn_sync_window(app_handle).await {
                    error!("Failed to spawn sync window: {}", e);
                }
            });
        }
        "update_host_url" => {
            info!("Update host URL popup triggered from the tray menu");
            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = windows::spawn_host_url_window(app_handle).await {
                    error!("Failed to spawn host URL window: {}", e);
                }
            });
        }
        "clear_app_data" => {
            let app_handle = app.clone();
            app.dialog()
                .message(
                    "Are you sure? This will erase all locally stored data and sign you out.",
                )
                .title("Clear App Data")
                .kind(MessageDialogKind::Warning)
                .buttons(MessageDialogButtons::OkCancel)
                .show(move |ok| {
                    if !ok {
                        return;
                    }

                    tauri::async_runtime::spawn(async move {
                        let state = app_handle.state::<crate::AppClient>();
                        if let Err(e) = state.cookie_vault.clear_cookies() {
                            error!("Failed to clear cookies: {}", e);
                        }
                        let cookie_file_path = match app_handle.path().app_config_dir() {
                            Ok(dir) => dir.join("cookies.json"),
                            Err(e) => {
                                error!("Could not get app_config_dir: {}", e);
                                return;
                            }
                        };
                        if let Err(e) = state
                            .cookie_vault
                            .save_into(&cookie_file_path.to_string_lossy())
                        {
                            error!("Failed to persist cleared cookies: {}", e);
                        }

                        let webviews = app_handle.webview_windows();
                        for (label, webview) in webviews {
                            if let Err(e) = webview.clear_all_browsing_data() {
                                error!(
                                    "Unable to clear browsing data for {}: {}. Continuing anyway",
                                    label, e
                                );
                            }
                        }

                        if let Ok(store) = app_handle.store("config.json") {
                            let keys = store.keys();
                            for key in keys {
                                let _ = store.delete(key);
                            }
                            if let Err(e) = store.save() {
                                error!("Failed to save cleared config store: {}", e);
                            }
                        }

                        let _ = app_handle.emit("app-data-cleared", ());
                    });
                });
        }
        "open_logs" => {
            info!("Opening logs folder");
            let log_dir = match app.path().app_log_dir() {
                Ok(dir) => dir,
                Err(e) => {
                    error!("Cannot get logs directory: {:?}", e);
                    return;
                }
            };
            if let Err(e) = app
                .opener()
                .open_path(log_dir.to_string_lossy().to_string(), None::<&str>)
            {
                error!("Failed to open logs directory: {:?}", e);
            }
        }
        "quit" => {
            info!("Quitting...");
            app.exit(0);
        }
        _ => {}
    }
}
