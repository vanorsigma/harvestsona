mod auth;
mod commands;
mod overlay;
mod tray;
mod websocket;

use auth::{
    cookie_vault::CookieVault,
    session::{validate_session, ValidationResult},
};
use commands::auth::spawn_auth_window;
use serde::{Deserialize, Serialize};
use serde_json::Map;
use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, RwLock};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter as _, Manager as _, Url, Wry,
};
use tauri_plugin_store::StoreExt;
use tauri_plugin_dialog::{DialogExt as _, MessageDialogKind};
use tauri_plugin_log::{
    log::{self, info, warn},
    Target, TargetKind,
};

use tray::tray_menu_handler;
use websocket::ws_listen_to_updates;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppConfig {
    #[serde(default = "default_enduser_origin")]
    pub enduser_origin: Url,

    #[serde(default)]
    initial_completed: bool,

    #[serde(default = "default_true")]
    pub live_sync: bool,
}

fn default_true() -> bool {
    true
}

pub struct AppClient {
    pub client: reqwest::Client,
    pub cookie_vault: CookieVault,
    pub config: Arc<RwLock<AppConfig>>,
    pub sync_menu_item: MenuItem<Wry>,
    pub auth_completed: Arc<AtomicBool>,
    pub auth_in_progress: Arc<AtomicBool>,
    pub mapping: Arc<RwLock<HashMap<String, String>>>,
}

fn default_enduser_origin() -> Url {
    "http://localhost:5173"
        .to_string()
        .parse::<Url>()
        .expect("Can unwrap default end user origin")
}

fn emit_auth_complete(app: &AppHandle) {
    let store = app
        .store("config.json")
        .expect("config store must be available");
    let initial_completed = store
        .get("initial_completed")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    app.emit(
        "auth-complete",
        serde_json::json!({
            "initial_completed": initial_completed
        }),
    )
    .unwrap();
    app.state::<AppClient>()
        .auth_completed
        .store(true, std::sync::atomic::Ordering::Relaxed);
}

fn fatal_server_error(app: &AppHandle, status: u16, body: &str) {
    warn!("Validation returned server error {status}: {body}");
    let app = app.clone();
    app.dialog()
        .message(body)
        .title(format!("Server Error ({status})"))
        .kind(MessageDialogKind::Error)
        .show(move |_| {
            app.exit(1);
        });
}

pub async fn run_auth(app: AppHandle, mapping: Arc<RwLock<HashMap<String, String>>>) {
    let state = app.state::<AppClient>();
    state
        .auth_in_progress
        .store(true, std::sync::atomic::Ordering::Relaxed);

    let enduser_origin = state.config.read().unwrap().enduser_origin.clone();

    info!("Attempting to validate session...");
    match validate_session(&enduser_origin, state.clone()).await {
        Ok(ValidationResult::Ok) => {
            info!("Session validated!");
            let _ = app.state::<AppClient>().sync_menu_item.set_enabled(true);
            emit_auth_complete(&app);
            state
                .auth_in_progress
                .store(false, std::sync::atomic::Ordering::Relaxed);
            ws_listen_to_updates(app, mapping);
            return;
        }
        Ok(ValidationResult::ServerError { status, body }) => {
            fatal_server_error(&app, status, &body);
            return;
        }
        _ => {
            info!("Session not validated, we will prompt the user to login...");
        }
    }

    let _ = spawn_auth_window(app.clone()).await;

    match validate_session(&enduser_origin, state.clone()).await {
        Ok(ValidationResult::ServerError { status, body }) => {
            fatal_server_error(&app, status, &body);
        }
        Ok(ValidationResult::Ok) => {
            info!("Was able to validate the session. Will now emit complete");
            let _ = app.state::<AppClient>().sync_menu_item.set_enabled(true);
            emit_auth_complete(&app);
            app.state::<AppClient>()
                .auth_in_progress
                .store(false, std::sync::atomic::Ordering::Relaxed);
            ws_listen_to_updates(app, mapping);
        }
        _ => {
            warn!("User authentication failed!");
            app.state::<AppClient>()
                .auth_in_progress
                .store(false, std::sync::atomic::Ordering::Relaxed);
            app
              .dialog()
              .message("Encountered an error while trying to validate your credentials. If you believe this is a mistake, please let vanor know.")
              .title("Fatal Authentication Error")
              .kind(MessageDialogKind::Error)
              .show(|_| {});
        }
    }
}

fn app_setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error + 'static>> {
    let store = app.store("config.json")?;

    let mut config_map = Map::new();
    for key in store.keys() {
        if let Some(value) = store.get(&key) {
            config_map.insert(key.to_string(), value.clone());
        }
    }

    let is_first_boot = store.get("enduser_origin").is_none();

    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let cookie_file_path = config_dir.join("cookies.json");

    let config: AppConfig = serde_json::from_value(serde_json::Value::Object(config_map))?;
    let cookie_vault = CookieVault::try_from_filename(
        &cookie_file_path
            .into_string()
            .map_err(|e| e.to_string_lossy().to_string())?,
    );

    let client = reqwest::Client::builder()
        .cookie_provider((*cookie_vault).clone())
        .http1_only() // NOTE: https://github.com/seanmonstar/reqwest/issues/2343
        .build()
        .expect("Should be able to build reqwest with offline cookie store");

    let logout_i = MenuItem::with_id(app, "logout", "Logout", true, None::<&str>)?;
    let sync_i = MenuItem::with_id(
        app,
        "sync_popup",
        "Sync...",
        false,
        None::<&str>,
    )?;
    let update_host_url_i = MenuItem::with_id(
        app,
        "update_host_url",
        "Update host URL...",
        true,
        None::<&str>,
    )?;
    let open_logs_i =
        MenuItem::with_id(app, "open_logs", "Open Logs Folder", true, None::<&str>)?;
    let clear_app_data_i = MenuItem::with_id(
        app,
        "clear_app_data",
        "Clear App Data...",
        true,
        None::<&str>,
    )?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let app_data_dir = app.path().app_data_dir().expect("Need app data dir");
    let default_image_path = Arc::new(RwLock::new(
        app_data_dir.join("harvestsonas").join("default.png"),
    ));
    let mapping: Arc<RwLock<HashMap<String, String>>> = Arc::new(RwLock::new(HashMap::new()));

    app.manage(AppClient {
        client,
        cookie_vault,
        config: Arc::new(RwLock::new(config)),
        sync_menu_item: sync_i.clone(),
        auth_completed: Default::default(),
        auth_in_progress: Default::default(),
        mapping: mapping.clone(),
    });

    let menu = Menu::with_items(
        app,
        &[
            &logout_i,
            &sync_i,
            &update_host_url_i,
            &clear_app_data_i,
            &PredefinedMenuItem::separator(app)?,
            &open_logs_i,
            &quit_i,
        ],
    )?;
    let _ = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(tray_menu_handler)
        .show_menu_on_left_click(true)
        .icon(app.default_window_icon().cloned().unwrap())
        .build(app)?;

    overlay::overlay(default_image_path, mapping.clone());

    if is_first_boot {
        info!("First boot detected — showing onboarding window");
        return Ok(());
    }

    let app_handle = app.handle().clone();
    let mapping_for_auth = mapping.clone();

    tauri::async_runtime::spawn(async move { run_auth(app_handle, mapping_for_auth).await });

    Ok(())
}

pub fn app_quit(handle: &AppHandle) {
    info!("Saving current in-memory cookie store into disk");
    let client = handle.state::<AppClient>();
    let cookie_vault = client.cookie_vault.clone();
    let config_dir = handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())
        .unwrap();
    let cookie_file_path = config_dir.join("cookies.json");
    let _ = cookie_vault.save_into(&cookie_file_path.to_string_lossy());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("app".to_string()),
                    }),
                ])
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .setup(app_setup)
        .invoke_handler(tauri::generate_handler![
            spawn_auth_window,
            commands::auth::is_auth_complete,
            commands::auth::is_auth_in_progress,
            commands::auth::begin_auth,
            commands::auth::clear_cookies,
            commands::auth::set_enduser_origin,
            commands::http::streamer_get,
            commands::http::streamer_get_changes,
            commands::http::streamer_initial_sync_post,
            commands::initial::scan_directory_for_images,
            commands::sync::push_sync_completed,
            commands::windows::spawn_sync_window,
            commands::windows::spawn_host_url_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|handle, event| if let tauri::RunEvent::Exit = event { app_quit(handle) });
}
