use reqwest::StatusCode;
use tauri::{State, Url};
use tauri_plugin_log::log::debug;

use crate::AppClient;

#[derive(Debug)]
pub enum ValidationResult {
    Ok,
    Unauthorized,
    ServerError { status: u16, body: String },
}

impl std::fmt::Display for ValidationResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationResult::Ok => write!(f, "valid"),
            ValidationResult::Unauthorized => write!(f, "unauthorized"),
            ValidationResult::ServerError { status, body } => {
                write!(f, "server error {status}: {body}")
            }
        }
    }
}

pub async fn validate_session(
    enduser_origin: &Url,
    state: State<'_, AppClient>,
) -> anyhow::Result<ValidationResult> {
    let url = enduser_origin.join("/api/streamer/initial")?;
    let result = state.client.get(url).send().await?;
    let status = result.status();
    debug!("When validating the session, we got: {}", status);

    if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
        return Ok(ValidationResult::Unauthorized);
    }

    if status == StatusCode::OK || status == StatusCode::NO_CONTENT {
        return Ok(ValidationResult::Ok);
    }

    let body = result.text().await.unwrap_or_default();
    Ok(ValidationResult::ServerError {
        status: status.as_u16(),
        body,
    })
}
