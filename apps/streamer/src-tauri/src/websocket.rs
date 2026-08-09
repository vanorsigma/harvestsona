use futures_util::StreamExt as _;
use reqwest::header::{CONNECTION, UPGRADE};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter as _, Manager as _, Url};
use tauri_plugin_log::log::{error, info};
use tokio_tungstenite::tungstenite::protocol::Message;

use crate::AppClient;

#[derive(Deserialize)]
struct MappingEntry {
    username: String,
    image: String,
}

async fn refresh_mapping(
    client: &reqwest::Client,
    enduser_origin: &Url,
    handle: &AppHandle,
    mapping: &Arc<RwLock<HashMap<String, String>>>,
) {
    let url = match enduser_origin.join("/api/streamer/sync/mappings") {
        Ok(u) => u,
        Err(e) => {
            error!("Invalid mapping URL: {:?}", e);
            return;
        }
    };

    let harvestsonas_dir = match handle.path().app_data_dir() {
        Ok(dir) => dir.join("harvestsonas"),
        Err(e) => {
            error!("Cannot get app data dir: {:?}", e);
            return;
        }
    };

    match client.get(url).send().await {
        Ok(resp) => match resp.json::<Vec<MappingEntry>>().await {
            Ok(entries) => {
                let mut map = mapping.write().unwrap();
                map.clear();
                for entry in entries {
                    let image_path = harvestsonas_dir.join(&entry.image);
                    info!(
                        "mapping: username={} -> file={}",
                        entry.username,
                        image_path.display()
                    );
                    map.insert(entry.username, image_path.to_string_lossy().to_string());
                }
                info!("Updated mapping with {} entries", map.len());
            }
            Err(e) => {
                error!("Failed to parse mapping response: {:?}", e);
            }
        },
        Err(e) => {
            error!("Failed to fetch mappings: {:?}", e);
        }
    }
}

pub fn ws_listen_to_updates(handle: AppHandle, mapping: Arc<RwLock<HashMap<String, String>>>) {
    // TODO: implement a backoff with GUI indicators...
    let state = handle.state::<AppClient>();
    let enduser_origin = state.config.read().unwrap().enduser_origin.clone();
    let client = state.client.clone();

    tauri::async_runtime::spawn(async move {
        info!("WebSocket endpoint origin: {}", enduser_origin);
        refresh_mapping(&client, &enduser_origin, &handle, &mapping).await;

        let url = enduser_origin.join("/api/streamer/sync").unwrap();
        info!("Connecting WebSocket to {}", url);

        let response = match client
            .get(url.clone())
            .version(reqwest::Version::HTTP_11) // HTTP/2 specs drops Upgrade & Connection headers
            .header(UPGRADE, "websocket")
            .header(CONNECTION, "Upgrade")
            .header("Sec-WebSocket-Version", "13")
            .header(
                "Sec-WebSocket-Key",
                tokio_tungstenite::tungstenite::handshake::client::generate_key(),
            )
            .send()
            .await
        {
            Ok(res) => {
                info!("WebSocket upgrade request succeeded (status: {})", res.status());
                res
            }
            Err(e) => {
                error!("Cannot request connection upgrade to {}: {:?}", url, e);
                return;
            }
        };

        let upgraded_stream = match response.upgrade().await {
            Ok(res) => {
                info!("WebSocket connection upgraded successfully to {}", url);
                res
            }
            Err(e) => {
                error!("Cannot upgrade connection to {}: {:?}", url, e);
                return;
            }
        };

        let ws_stream = tokio_tungstenite::WebSocketStream::from_raw_socket(
            upgraded_stream,
            tokio_tungstenite::tungstenite::protocol::Role::Client,
            None,
        )
        .await;

        let (_, mut read) = ws_stream.split();
        let mut last_refresh = tokio::time::Instant::now();
        const MAPPING_REFRESH_COOLDOWN: Duration = Duration::from_millis(500);

        while let Some(message) = read.next().await {
            if let Ok(Message::Text(text)) = message {
                let _ = handle.emit("sync-ws", text.as_str());
                if last_refresh.elapsed() >= MAPPING_REFRESH_COOLDOWN {
                    refresh_mapping(&client, &enduser_origin, &handle, &mapping).await;
                    last_refresh = tokio::time::Instant::now();
                }
            }
        }

        error!("WebSocket read loop exited - connection to {} was lost", url);
    });
}
