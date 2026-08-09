use crate::AppClient;
use base64::engine::general_purpose;
use base64::Engine;
use bytes::Bytes;
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::Value;
use tauri::ipc::Channel;
use tauri::ipc::Response;
use tauri::AppHandle;
use tauri::Manager;
use tauri::Url;
use tauri_plugin_log::log::debug;
use tauri_plugin_log::log::error;
use tauri_plugin_log::log::info;

#[derive(Deserialize, Clone)]
pub struct UploadEntry {
    pub username: String,
    pub local_path: String,
}

fn enduser_origin(app: &AppHandle) -> String {
    let origin = app
        .state::<AppClient>()
        .config
        .read()
        .unwrap()
        .enduser_origin
        .clone();
    origin.as_str().trim_end_matches('/').to_string()
}

fn jsonerr(e: impl std::fmt::Display) -> Value {
    serde_json::json!(e.to_string())
}

#[tauri::command]
pub async fn streamer_get(
    app: AppHandle,
    channel: Channel<Response>,
    path: String,
) -> Result<(), Value> {
    debug!("Get called for the path {path}");
    let client = app.state::<AppClient>().client.clone();
    let url = Url::parse(&enduser_origin(&app))
        .unwrap()
        .join("/api/harvestsonas/")
        .unwrap()
        .join(path.as_str())
        .unwrap();
    let resp = client.get(url).send().await.map_err(jsonerr)?;
    let mut status = resp.status().as_u16();
    if status == 200 {
        let mut stream = resp.bytes_stream();
        while let Some(result) = stream.next().await {
            match result {
                Ok(chunk) => {
                    let mut tagged = vec![0u8];
                    tagged.extend_from_slice(&chunk);
                    if channel.send(Response::new(tagged)).is_err() {
                        break;
                    }
                }
                Err(e) => {
                    error!("Error reading chunk for {path}: {e}");
                    status = 502;
                    break;
                }
            }
        }
    }
    let status_bytes = status.to_le_bytes();
    let _ = channel.send(Response::new([1u8, status_bytes[0], status_bytes[1]].to_vec()));
    Ok(())
}

#[tauri::command]
pub async fn streamer_get_changes(app: AppHandle, after: i64) -> Result<Value, Value> {
    debug!("Get changes called, with after parameter: {after}");
    let client = app.state::<AppClient>().client.clone();
    let mut url = Url::parse(&enduser_origin(&app))
        .unwrap()
        .join("/api/streamer/sync/changes")
        .unwrap();
    url.query_pairs_mut()
        .append_pair("after", &after.to_string());
    let resp = client.get(url).send().await.map_err(jsonerr)?;
    let value: Value = resp
        .error_for_status()
        .map_err(jsonerr)?
        .json()
        .await
        .map_err(jsonerr)?;
    debug!("Get Changes Response: {value}");
    Ok(value)
}

async fn do_initial_sync(
    app: &AppHandle,
    channel: Channel<Response>,
    entries: &[UploadEntry],
) -> Result<(), Value> {
    info!("do_initial_sync: starting with {} entries", entries.len());
    let client = app.state::<AppClient>().client.clone();
    let url = Url::parse(&enduser_origin(app))
        .unwrap()
        .join("/api/streamer/initial")
        .unwrap();

    let owned_entries = entries.to_vec();

    let body_stream = async_stream::stream! {
        for (i, entry) in owned_entries.iter().enumerate() {
            debug!("Reading file {}/{}: {} at {}", i + 1, owned_entries.len(), entry.username, entry.local_path);
            match tokio::fs::read(&entry.local_path).await {
                Ok(bytes) => {
                    debug!("Read {} bytes for {}", bytes.len(), entry.username);
                    let b64 = general_purpose::STANDARD.encode(&bytes);
                    debug!("Base64-encoded length: {} bytes for {}", b64.len(), entry.username);
                    info!(
                        "do_initial_sync: mapping username={} -> b64Len={} -> localPath={}",
                        entry.username,
                        b64.len(),
                        entry.local_path
                    );
                    let line = serde_json::json!({"username": entry.username, "bodyAsBase64": b64})
                        .to_string() + "\n";
                    yield Ok(Bytes::from(line));
                }
                Err(e) => {
                    error!("Failed to read file {} for user {}: {}", entry.local_path, entry.username, e);
                    yield Err(e.to_string());
                    break;
                }
            }
        }
        debug!("All {} entries streamed as ndjson body", owned_entries.len());
    };

    let body = reqwest::Body::wrap_stream(body_stream);

    info!("POSTing initial sync to {}", url);
    let resp = client
        .post(url)
        .header("Content-Type", "application/x-ndjson")
        .body(body)
        .send()
        .await
        .map_err(jsonerr)?
        .error_for_status()
        .map_err(jsonerr)?;

    info!("Initial sync POST response status: {}", resp.status());

    let mut buf = Vec::new();
    let mut stream = resp.bytes_stream();
    let mut line_count = 0u32;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(jsonerr)?;
        buf.extend_from_slice(&chunk);
        while let Some(pos) = buf.iter().position(|&b| b == b'\n') {
            let line = buf[..pos].to_vec();
            buf.drain(..=pos);
            if !line.is_empty() {
                line_count += 1;
                debug!("Forwarding progress line {} to channel ({} bytes)", line_count, line.len());
                let _ = channel.send(Response::new(line));
            }
        }
    }

    info!(
        "Initial sync done. {} progress lines forwarded to frontend.",
        line_count
    );
    Ok(())
}

#[tauri::command]
pub async fn streamer_initial_sync_post(
    app: AppHandle,
    channel: Channel<Response>,
    entries: Vec<UploadEntry>,
) -> Result<(), Value> {
    info!(
        "streamer_initial_sync_post invoked with {} entries",
        entries.len()
    );
    do_initial_sync(&app, channel, &entries)
        .await
        .inspect_err(|e| error!("POST initial sync returned {e}"))
}
