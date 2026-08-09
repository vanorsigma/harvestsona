use std::{
    collections::HashMap,
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, RwLock},
};

use axum::{
    body::Body,
    extract::{
        ws::{Message, WebSocket},
        Path, State, WebSocketUpgrade,
    },
    http::header,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use tauri_plugin_log::log::{error, info, warn};
use tokio::sync::broadcast;

const OBS_HTML: &str = include_str!("../statics/obs.html");
const OBS_JS: &str = include_str!("../statics/obs.js");
const DEFAULT_HARVESTSONA: &[u8] = include_bytes!("../statics/default_harvestsona.png");
const EXPRESSION_GIF: &[u8] = include_bytes!("../statics/expression.gif");

struct OverlayState {
    sender: broadcast::Sender<Message>,
    receiver: broadcast::Receiver<Message>,
    default_image: Arc<RwLock<PathBuf>>,
    mapping: Arc<RwLock<HashMap<String, String>>>,
}

impl Clone for OverlayState {
    fn clone(&self) -> Self {
        Self {
            sender: self.sender.clone(),
            receiver: self.receiver.resubscribe(),
            default_image: self.default_image.clone(),
            mapping: self.mapping.clone(),
        }
    }
}

async fn obs_html() -> impl IntoResponse {
    Html(OBS_HTML)
}

async fn obs_js() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "application/javascript")], OBS_JS)
}

async fn default_harvestsona() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "image/png")], DEFAULT_HARVESTSONA)
}

async fn expression_gif() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "image/gif")], EXPRESSION_GIF)
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<OverlayState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: OverlayState) {
    let mut receiver = state.receiver.resubscribe();
    loop {
        tokio::select! {
            Ok(msg) = receiver.recv() => {
                if let Err(e) = socket.send(msg).await {
                    error!("Error while attempting to echo message from WS: {}", e);
                    continue;
                }
            }

            msg = socket.recv() => {
                match msg {
                    Some(Ok(data)) => {
                        match data {
                            Message::Close(_) => {
                                warn!("Remote closed, we're ignoring this and only closing on our side");
                                break;
                            },
                            other_msg => if let Err(e) = state.sender.send(other_msg) {
                                error!("Unable to send WS data through internal channel: {}", e);
                            }
                        }
                    }
                    Some(Err(e)) => {
                        error!("Error receiving message from WS: {}", e);
                    }
                    None => {
                        info!("WebSocket client disconnected");
                        break;
                    }
                }
            }
        }
    }
}

async fn get_file_if_exists(username: String, state: OverlayState) -> Option<(Vec<u8>, String)> {
    let path = {
        let mapping = state.mapping.read().unwrap();
        let default_path = state.default_image.read().unwrap().clone();
        match mapping.get(&username) {
            Some(filename) => {
                info!("mapping lookup: username={} -> resolved={}", username, filename);
                let resolved_path = PathBuf::from(filename);
                if resolved_path.exists() {
                    resolved_path
                } else {
                    warn!(
                        "Can't find the file {} associated with username {}. Falling back to default.",
                        filename, username
                    );
                    default_path
                }
            }
            None => {
                info!("mapping lookup: username={} -> not found, using default", username);
                default_path
            }
        }
    };

    let bytes = match tokio::fs::read(&path).await {
        Ok(b) => b,
        Err(e) => {
            warn!("Can't open file {:?}: {}", path, e);
            return None;
        }
    };

    let mime_type = match infer::get(&bytes[..bytes.len().min(3072)]) {
        Some(kind) => kind.mime_type().to_string(),
        None => "application/octet-stream".to_string(),
    };

    Some((bytes, mime_type))
}

async fn handle_get_harvestona(
    Path(username): Path<String>,
    State(state): State<OverlayState>,
) -> impl IntoResponse {
    let (body, mime_type) = match get_file_if_exists(username, state).await {
        Some((bytes, mime_type)) => (Body::from(bytes), mime_type),
        None => (Body::from(DEFAULT_HARVESTSONA), "image/png".into()),
    };

    (
        [
            (header::CONTENT_TYPE, mime_type),
            (header::CONTENT_DISPOSITION, "inline".to_string()),
        ],
        body,
    )
        .into_response()
}

pub fn overlay(default_image: Arc<RwLock<PathBuf>>, mapping: Arc<RwLock<HashMap<String, String>>>) {
    let (tx, rx) = broadcast::channel(100);
    let state = OverlayState {
        sender: tx,
        receiver: rx,
        default_image,
        mapping,
    };

    tauri::async_runtime::spawn(async move {
        let routes = Router::new()
            .route("/obs.html", get(obs_html))
            .route("/obs.js", get(obs_js))
            .route("/ws", get(ws_handler))
            .route("/harvestsona/{username}", get(handle_get_harvestona))
            .route("/harvestsona.png", get(default_harvestsona))
            .route("/expression.gif", get(expression_gif))
            .with_state(state);

        let addr = SocketAddr::from(([127, 0, 0, 1], 8987));
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, routes).await.unwrap();
    });
}
