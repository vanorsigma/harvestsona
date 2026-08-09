use std::sync::{atomic::AtomicBool, Arc};

use tauri::{AppHandle, Manager as _, Url, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_log::log::{debug, error, info};
use tauri_plugin_store::StoreExt;
use tokio::sync::watch;

use crate::AppClient;

#[tauri::command]
pub async fn is_auth_complete(app: AppHandle) -> Result<bool, ()> {
    Ok(app
        .state::<AppClient>()
        .auth_completed
        .load(std::sync::atomic::Ordering::Relaxed))
}

#[tauri::command]
pub async fn is_auth_in_progress(app: AppHandle) -> Result<bool, ()> {
    Ok(app
        .state::<AppClient>()
        .auth_in_progress
        .load(std::sync::atomic::Ordering::Relaxed))
}

#[tauri::command]
pub async fn begin_auth(app: AppHandle) -> Result<(), String> {
    let state = app.state::<crate::AppClient>();
    if state
        .auth_in_progress
        .load(std::sync::atomic::Ordering::Relaxed)
    {
        info!("Auth already in progress, skipping begin_auth");
        return Ok(());
    }

    let mapping = state.mapping.clone();
    crate::run_auth(app, mapping).await;
    Ok(())
}

#[tauri::command]
pub async fn clear_cookies(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AppClient>();
    state
        .cookie_vault
        .clear_cookies()
        .map_err(|e| e.to_string())?;
    let cookie_file_path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("cookies.json");
    state
        .cookie_vault
        .save_into(&cookie_file_path.to_string_lossy())
        .map_err(|e| e.to_string())?;
    state
        .auth_completed
        .store(false, std::sync::atomic::Ordering::Relaxed);
    info!("Cookies cleared and persisted to disk");
    Ok(())
}

#[tauri::command]
pub async fn set_enduser_origin(app: AppHandle, origin: String) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    store.set(
        "enduser_origin",
        serde_json::Value::String(origin.clone()),
    );
    store.save().map_err(|e| e.to_string())?;

    let parsed: Url = origin.parse().map_err(|_| "Invalid enduser origin URL".to_string())?;
    {
        let state = app.state::<AppClient>();
        state.config.write().unwrap().enduser_origin = parsed;
    }

    let updated_url = {
        let state = app.state::<AppClient>();
        let url = state.config.read().unwrap().enduser_origin.clone();
        url
    };
    info!("Enduser origin updated to {}", updated_url);
    Ok(())
}

#[tauri::command]
pub async fn spawn_auth_window(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AppClient>();
    let enduser_origin = state.config.read().unwrap().enduser_origin.clone();
    let cookie_vault = state.cookie_vault.clone();
    let url = enduser_origin
        .join("/login/streamer")
        .map_err(|_| "Can't create the login path")?;
    let (auth_tx, mut auth_rx) = watch::channel(false);
    let normal_close = Arc::new(AtomicBool::new(false));

    let window_handle = WebviewWindowBuilder::new(
        &app,
        "auth-window",
        WebviewUrl::External(url.clone()),
    )
    .title("Authenticate...")
    .inner_size(800.0, 600.0)
    .always_on_top(true)
    .on_navigation(move |nav_url| {
        let is_enduser = nav_url.origin() == enduser_origin.origin();
        let is_twitch = nav_url
            .host_str()
            .is_some_and(|h| h.ends_with("twitch.tv"));

        if is_enduser && nav_url.path() == "/profile" {
            let _ = auth_tx.send(true);
        }

        is_enduser || is_twitch
    })
    .build()
    .unwrap();

    let app_clone = app.clone();
    let normal_close_cloned = normal_close.clone();
    let window_handle_cloned = window_handle.clone();
    window_handle.on_window_event(move |event| if let WindowEvent::CloseRequested { .. } = event {
        if let Err(e) = window_handle_cloned.clear_all_browsing_data() {
            error!("Unable to clear all browsing data from the window handle. Continuing anyway...");
            error!("{e}");
        }

        if normal_close_cloned.load(std::sync::atomic::Ordering::Relaxed) {
            info!("Allowing the close");
            return;
        }

        error!("Cannot continue! No authentication found.");
        app_clone.exit(1);
    });

    auth_rx
        .wait_for(|&completed| completed)
        .await
        .map_err(|_| "Auth window was dropped")?;

    info!("Authentication window completed its flow");
    let cookies = window_handle.cookies().unwrap();
    normal_close.store(true, std::sync::atomic::Ordering::Release);
    let _ = window_handle.close();

    {
        let mut store = cookie_vault.lock().unwrap();

        let cookie_url = url.origin().ascii_serialization().parse::<Url>().unwrap();
        debug!("Will only save cookies for {cookie_url}");
        store.store_response_cookies(cookies.into_iter(), &cookie_url);
    }

    let cookie_file_path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("cookies.json");
    if let Err(e) = cookie_vault.save_into(&cookie_file_path.to_string_lossy()) {
        error!("Failed to persist cookies to disk: {e}");
    }
    info!("Cookies saved immediately to disk");

    Ok(())
}
