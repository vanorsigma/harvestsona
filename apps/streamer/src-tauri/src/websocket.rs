use futures_util::{SinkExt as _, StreamExt as _};
use reqwest::header::{CONNECTION, UPGRADE};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter as _, Manager as _, Url};
use tauri_plugin_log::log::{error, info, warn};
use tokio_tungstenite::tungstenite::{protocol::Message, Bytes};

use crate::AppClient;

#[derive(Deserialize)]
struct MappingEntry {
    username: String,
    image: String,
}

const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);

const RECONNECT_BACKOFF: [Duration; 5] = [
    Duration::from_secs(10),
    Duration::from_secs(30),
    Duration::from_secs(60),
    Duration::from_secs(120),
    Duration::from_secs(300),
];

const MIN_STABLE_CONNECTION: Duration = Duration::from_secs(60);

const PING_INTERVAL: Duration = Duration::from_secs(30);

const READ_IDLE_TIMEOUT: Duration = Duration::from_secs(90);

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

    let resp = match client.get(url).timeout(REQUEST_TIMEOUT).send().await {
        Ok(resp) => resp,
        Err(e) => {
            error!("Failed to fetch mappings: {:?}", e);
            return;
        }
    };

    match resp.json::<Vec<MappingEntry>>().await {
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
    }
}

fn next_reconnect(step: usize, stable: bool) -> (Duration, usize) {
    let step = if stable {
        0
    } else {
        step.min(RECONNECT_BACKOFF.len() - 1)
    };
    (
        RECONNECT_BACKOFF[step],
        (step + 1).min(RECONNECT_BACKOFF.len() - 1),
    )
}

async fn run_connection(
    client: &reqwest::Client,
    enduser_origin: &Url,
    handle: &AppHandle,
    mapping: &Arc<RwLock<HashMap<String, String>>>,
) -> bool {
    let url = match enduser_origin.join("/api/streamer/sync") {
        Ok(u) => u,
        Err(e) => {
            error!("Invalid sync URL from {}: {:?}", enduser_origin, e);
            return false;
        }
    };
    info!("Connecting WebSocket to {}", url);

    let response = match tokio::time::timeout(
        REQUEST_TIMEOUT,
        client
            .get(url.clone())
            .version(reqwest::Version::HTTP_11) // HTTP/2 specs drops Upgrade & Connection headers
            .header(UPGRADE, "websocket")
            .header(CONNECTION, "Upgrade")
            .header("Sec-WebSocket-Version", "13")
            .header(
                "Sec-WebSocket-Key",
                tokio_tungstenite::tungstenite::handshake::client::generate_key(),
            )
            .send(),
    )
    .await
    {
        Ok(Ok(res)) => {
            info!(
                "WebSocket upgrade request succeeded (status: {})",
                res.status()
            );
            res
        }
        Ok(Err(e)) => {
            error!("Cannot request connection upgrade to {}: {:?}", url, e);
            return false;
        }
        Err(_) => {
            error!("Timed out requesting connection upgrade to {}", url);
            return false;
        }
    };

    let upgraded_stream = match tokio::time::timeout(REQUEST_TIMEOUT, response.upgrade()).await {
        Ok(Ok(res)) => {
            info!("WebSocket connection upgraded successfully to {}", url);
            res
        }
        Ok(Err(e)) => {
            error!("Cannot upgrade connection to {}: {:?}", url, e);
            return false;
        }
        Err(_) => {
            error!("Timed out completing WebSocket upgrade to {}", url);
            return false;
        }
    };

    let ws_stream = tokio_tungstenite::WebSocketStream::from_raw_socket(
        upgraded_stream,
        tokio_tungstenite::tungstenite::protocol::Role::Client,
        None,
    )
    .await;

    let (mut write, mut read) = ws_stream.split();
    let connected_at = tokio::time::Instant::now();
    const MAPPING_REFRESH_COOLDOWN: Duration = Duration::from_millis(500);

    refresh_mapping(client, enduser_origin, handle, mapping).await;
    let mut last_refresh = tokio::time::Instant::now();

    let mut ping = tokio::time::interval(PING_INTERVAL);
    ping.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    ping.tick().await;

    loop {
        tokio::select! {
            _ = ping.tick() => {
                if let Err(e) = write.send(Message::Ping(Bytes::new())).await {
                    warn!("WebSocket keepalive ping to {} failed: {:?}", url, e);
                    break;
                }
            }
            message = tokio::time::timeout(READ_IDLE_TIMEOUT, read.next()) => {
                match message {
                    Ok(Some(Ok(Message::Text(text)))) => {
                        let _ = handle.emit("sync-ws", text.as_str());
                        if last_refresh.elapsed() >= MAPPING_REFRESH_COOLDOWN {
                            refresh_mapping(client, enduser_origin, handle, mapping).await;
                            last_refresh = tokio::time::Instant::now();
                        }
                    }
                    Ok(Some(Ok(_))) => {}
                    Ok(Some(Err(e))) => {
                        error!("WebSocket read error from {}: {:?}", url, e);
                        break;
                    }
                    Ok(None) => break,
                    Err(_) => {
                        warn!(
                            "WebSocket idle for {:?} with no frames or pongs; assuming {} is dead",
                            READ_IDLE_TIMEOUT, url
                        );
                        break;
                    }
                }
            }
        }
    }

    warn!("WebSocket connection to {} lost", url);
    connected_at.elapsed() >= MIN_STABLE_CONNECTION
}

pub fn ws_listen_to_updates(handle: AppHandle, mapping: Arc<RwLock<HashMap<String, String>>>) {
    let state = handle.state::<AppClient>();
    let enduser_origin = state.config.read().unwrap().enduser_origin.clone();
    let client = state.client.clone();

    tauri::async_runtime::spawn(async move {
        info!("WebSocket endpoint origin: {}", enduser_origin);

        let mut step = 0usize;
        loop {
            let stable = run_connection(&client, &enduser_origin, &handle, &mapping).await;

            let (delay, next) = next_reconnect(step, stable);
            info!(
                "Reconnecting WebSocket to {} in {:?}",
                enduser_origin, delay
            );
            tokio::time::sleep(delay).await;
            step = next;
        }
    });
}
