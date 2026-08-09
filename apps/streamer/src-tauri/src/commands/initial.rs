use serde::Serialize;
use tauri_plugin_log::log::info;

#[derive(Serialize)]
pub struct ImageEntry {
    pub username: String,
    pub local_path: String,
}

#[tauri::command]
pub async fn scan_directory_for_images(dir_path: String) -> Result<Vec<ImageEntry>, String> {
    let mut entries = Vec::new();
    let valid_extensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];

    let mut read_dir = tokio::fs::read_dir(&dir_path)
        .await
        .map_err(|e| format!("Failed to read directory {}: {}", dir_path, e))?;

    while let Some(entry) = read_dir
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read directory entry: {}", e))?
    {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if valid_extensions.contains(&ext.to_lowercase().as_str()) {
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        info!(
                            "scan_directory: mapping username={} -> file={}",
                            stem,
                            path.display()
                        );
                        entries.push(ImageEntry {
                            username: stem.to_string(),
                            local_path: path.to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
    }

    Ok(entries)
}
