use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn push_sync_completed(app: AppHandle) -> Result<(), String> {
    let _ = app.emit("push-sync-completed", true);
    Ok(())
}
