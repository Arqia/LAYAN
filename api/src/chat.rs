//! Endpoint loket chat mahasiswa + lampiran.

use std::convert::Infallible;

use axum::body::Body;
use axum::extract::{Multipart, Path, State};
use axum::http::header;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};
use tokio_stream::{wrappers::ReceiverStream, StreamExt};

use crate::agent::{self, ChatMessage, Ev, Input, Nope};
use crate::auth::{CurrentUser, Role, User};
use crate::error::AppError;
use crate::AppState;

const MAX_UPLOAD: usize = 5 * 1024 * 1024;
const MIME_OK: [&str; 3] = ["application/pdf", "image/jpeg", "image/png"];

#[utoipa::path(get, path = "/api/chat", responses((status = 200, body = Vec<ChatMessage>)))]
pub async fn list(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Vec<ChatMessage>>, AppError> {
    me.require(Role::Mahasiswa)?;
    Ok(Json(agent::list_messages(&s.db, &me.user.id).await?))
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct SendReq {
    pub text: String,
}

/// Kirim pesan. Respons berupa SSE: status, message, update, error, done.
#[utoipa::path(post, path = "/api/chat", request_body = SendReq, responses((status = 200, description = "text/event-stream")))]
pub async fn send(
    State(s): State<AppState>,
    me: CurrentUser,
    Json(r): Json<SendReq>,
) -> Result<impl IntoResponse, AppError> {
    me.require(Role::Mahasiswa)?;
    let text = r.text.trim();
    if text.is_empty() || text.chars().count() > 2000 {
        return Err(AppError::Bad("Pesan kosong atau terlalu panjang.".into()));
    }
    Ok(stream(s, me.user, Input::Text(text.to_owned())))
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct ActionReq {
    pub message_id: i64,
    /// submit | upload | ticket
    pub action: String,
    #[serde(default)]
    pub payload: Value,
}

/// Aksi pada action card (isi form, upload, buat tiket). Respons SSE seperti /api/chat.
#[utoipa::path(post, path = "/api/chat/action", request_body = ActionReq, responses((status = 200, description = "text/event-stream")))]
pub async fn action(
    State(s): State<AppState>,
    me: CurrentUser,
    Json(r): Json<ActionReq>,
) -> Result<impl IntoResponse, AppError> {
    me.require(Role::Mahasiswa)?;
    Ok(stream(s, me.user, Input::Action { message_id: r.message_id, action: r.action, payload: r.payload }))
}

fn stream(s: AppState, me: User, input: Input) -> impl IntoResponse {
    let (tx, rx) = tokio::sync::mpsc::channel::<Ev>(32);
    tokio::spawn(async move {
        let lock = s.agent_locks.lock().expect("agent_locks").entry(me.id.clone()).or_default().clone();
        let _guard = lock.lock().await;
        if let Err(e) = agent::run(&s, &me, input, &tx).await {
            let message = match e.downcast_ref::<Nope>() {
                Some(n) => n.0.clone(),
                None => {
                    eprintln!("agent error: {e:#}");
                    "Agent sedang tidak bisa dihubungi. Progres kamu aman, coba kirim lagi sebentar lagi.".into()
                }
            };
            let _ = tx.send(Ev::Error { message }).await;
        }
        let _ = tx.send(Ev::Done).await;
    });
    let events = ReceiverStream::new(rx).map(|e| Ok::<_, Infallible>(Event::default().event(e.name()).data(json!(e).to_string())));
    // no-transform: proxy (rewrite Next.js, nginx) jangan mengompres/menahan stream
    let headers = [(header::CACHE_CONTROL, "no-cache, no-transform"), (header::HeaderName::from_static("x-accel-buffering"), "no")];
    (headers, Sse::new(events).keep_alive(KeepAlive::default()))
}

/* ---------- lampiran ---------- */

#[utoipa::path(post, path = "/api/attachments", responses((status = 200, description = "{id, name, size}")))]
pub async fn upload(State(s): State<AppState>, me: CurrentUser, mut mp: Multipart) -> Result<Json<Value>, AppError> {
    me.require(Role::Mahasiswa)?;
    let too_big = || AppError::Bad("File lebih dari 5 MB. Kecilkan dulu atau foto ulang.".into());
    let field = mp.next_field().await.map_err(|_| too_big())?.ok_or_else(|| AppError::Bad("File belum dipilih.".into()))?;
    let name = field.file_name().unwrap_or("lampiran").rsplit(['/', '\\']).next().unwrap_or("lampiran").chars().take(120).collect::<String>();
    let mime = field.content_type().unwrap_or("").to_owned();
    if !MIME_OK.contains(&mime.as_str()) {
        return Err(AppError::Bad("Format belum didukung. Pakai PDF, JPG, atau PNG.".into()));
    }
    let bytes = field.bytes().await.map_err(|_| too_big())?;
    if bytes.len() > MAX_UPLOAD {
        return Err(too_big());
    }

    let id = crate::util::random_hex(16);
    let path = std::path::Path::new(&s.upload_dir).join(&id);
    tokio::fs::create_dir_all(&s.upload_dir).await.map_err(anyhow::Error::from)?;
    tokio::fs::write(&path, &bytes).await.map_err(anyhow::Error::from)?;
    sqlx::query("INSERT INTO attachments (id, owner_id, name, mime, size, path) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
        .bind(&id).bind(&me.user.id).bind(&name).bind(&mime).bind(bytes.len() as i64).bind(path.to_string_lossy())
        .execute(&s.db)
        .await?;
    Ok(Json(json!({ "id": id, "name": name, "size": bytes.len() })))
}

/// Unduh lampiran. Hanya pemilik, staf, dan teknisi (foto kerusakan).
pub async fn download(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>) -> Result<Response, AppError> {
    let row: Option<(String, String, String, String)> =
        sqlx::query_as("SELECT owner_id, name, mime, path FROM attachments WHERE id = ?1").bind(&id).fetch_optional(&s.db).await?;
    let (owner, name, mime, path) = row.ok_or(AppError::NotFound)?;
    if owner != me.user.id && me.user.role == Role::Mahasiswa {
        return Err(AppError::Forbidden);
    }
    let bytes = tokio::fs::read(&path).await.map_err(|_| AppError::NotFound)?;
    let safe_name: String = name.chars().filter(|c| !matches!(c, '"' | '\\' | '\r' | '\n')).collect();
    Ok(Response::builder()
        .header(header::CONTENT_TYPE, mime)
        .header(header::CONTENT_DISPOSITION, format!("inline; filename=\"{safe_name}\""))
        .body(Body::from(bytes))
        .map_err(anyhow::Error::from)?)
}
