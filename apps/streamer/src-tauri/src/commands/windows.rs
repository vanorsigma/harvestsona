use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn spawn_sync_window(app: AppHandle) -> Result<(), String> {
    let _window_handle = WebviewWindowBuilder::new(
        &app,
        "sync-window",
        WebviewUrl::App("popups/sync".into()),
    )
    .title("Sync")
    .inner_size(500.0, 520.0)
    .always_on_top(true)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn spawn_host_url_window(app: AppHandle) -> Result<(), String> {
    let _window_handle = WebviewWindowBuilder::new(
        &app,
        "host-url-window",
        WebviewUrl::App("popups/host".into()),
    )
    .title("Update host URL")
    .inner_size(480.0, 260.0)
    .always_on_top(true)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
