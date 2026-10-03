//! Rilis App Android di luar Play Store. `deploy/release-android.sh` menaruh `layan.apk` + `latest.json` di APP_DIR.

use axum::body::Body;
use axum::extract::State;
use axum::http::header;
use axum::response::Response;

use crate::error::AppError;
use crate::AppState;

/// `{versionCode, versionName, notes, sha256, minVersionCode, url}`, apa adanya dari latest.json.
#[utoipa::path(get, path = "/api/app/latest", responses((status = 200, body = Object), (status = 404, description = "Belum ada rilis")))]
pub async fn latest(State(s): State<AppState>) -> Result<Response, AppError> {
    file(&s, "latest.json", "application/json").await
}

#[utoipa::path(get, path = "/api/app/layan.apk", responses((status = 200, content_type = "application/vnd.android.package-archive"), (status = 404)))]
pub async fn apk(State(s): State<AppState>) -> Result<Response, AppError> {
    let mut res = file(&s, "layan.apk", "application/vnd.android.package-archive").await?;
    res.headers_mut().insert(header::CONTENT_DISPOSITION, header::HeaderValue::from_static("attachment; filename=\"layan.apk\""));
    Ok(res)
}

// Catatan: APK (~10 MB) dibaca utuh ke memori, sama seperti lampiran; ganti ke stream kalau ukurannya membengkak.
async fn file(s: &AppState, name: &str, mime: &'static str) -> Result<Response, AppError> {
    let bytes = tokio::fs::read(std::path::Path::new(&s.app_dir).join(name)).await.map_err(|_| AppError::NotFound)?;
    Ok(Response::builder()
        .header(header::CONTENT_TYPE, mime)
        // Cloudflare meng-cache .apk secara default; no-store supaya rilis baru langsung terlihat
        .header(header::CACHE_CONTROL, "no-store")
        .body(Body::from(bytes))
        .map_err(anyhow::Error::from)?)
}
