use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

pub enum AppError {
    BadLogin,
    Unauthorized,
    Internal(anyhow::Error),
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        Self::Internal(e.into())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, msg) = match self {
            Self::BadLogin => (StatusCode::UNAUTHORIZED, "NIM/email atau password salah."),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Sesi berakhir. Silakan masuk lagi."),
            Self::Internal(e) => {
                eprintln!("internal error: {e:#}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Terjadi kesalahan di server. Coba lagi.")
            }
        };
        (status, Json(json!({ "error": msg }))).into_response()
    }
}
