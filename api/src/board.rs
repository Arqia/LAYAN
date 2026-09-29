//! Board teknisi: laporan kerusakan hasil agent (sudah digabung kalau dobel).

use axum::extract::{Path, State};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::agent::insert_message;
use crate::auth::{CurrentUser, Role};
use crate::error::AppError;
use crate::fasilitas::request_status;
use crate::util::when;
use crate::AppState;

#[derive(sqlx::FromRow)]
struct Row {
    id: String,
    room: String,
    title: String,
    category: String,
    urgency: String,
    status: String,
    assignee: String,
    tech: String,
    reporters: i64,
    photo: Option<String>,
    created_at: i64,
    updated_at: i64,
}

#[utoipa::path(get, path = "/api/reports", responses((status = 200)))]
pub async fn list(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Vec<Value>>, AppError> {
    if me.user.role == Role::Mahasiswa {
        return Err(AppError::Forbidden);
    }
    let rows = sqlx::query_as::<_, Row>(
        "SELECT r.id, r.room, r.title, r.category, r.urgency, r.status, r.assignee, u.name AS tech, r.reporters, r.photo, r.created_at, r.updated_at \
         FROM reports r JOIN users u ON u.id = r.assignee ORDER BY r.created_at DESC",
    )
    .fetch_all(&s.db)
    .await?;
    Ok(Json(
        rows.into_iter()
            .map(|r| {
                json!({
                    "id": r.id, "room": r.room, "title": r.title, "category": r.category, "urgency": r.urgency,
                    "status": r.status, "assignee": r.assignee, "tech": r.tech, "reporters": r.reporters,
                    "photo": r.photo, "time": when(r.created_at), "updated": when(r.updated_at),
                })
            })
            .collect(),
    ))
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct StatusReq {
    /// baru | dikerjakan | selesai
    pub status: String,
}

/// Pindah status kartu. Status permintaan pelapor ikut berubah; saat selesai, pelapor dikabari lewat chat.
#[utoipa::path(post, path = "/api/reports/{id}/status", request_body = StatusReq, params(("id" = String, Path)), responses((status = 200)))]
pub async fn set_status(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>, Json(b): Json<StatusReq>) -> Result<Json<Value>, AppError> {
    me.require(Role::Teknisi)?;
    if !["baru", "dikerjakan", "selesai"].contains(&b.status.as_str()) {
        return Err(AppError::Bad("Status tidak dikenal.".into()));
    }
    let row: Option<(String, String, String)> = sqlx::query_as("SELECT room, title, status FROM reports WHERE id = ?1").bind(&id).fetch_optional(&s.db).await?;
    let (room, title, old) = row.ok_or(AppError::NotFound)?;
    if old == b.status {
        return Ok(Json(json!({ "ok": true })));
    }
    sqlx::query("UPDATE reports SET status = ?2, updated_at = unixepoch() WHERE id = ?1").bind(&id).bind(&b.status).execute(&s.db).await?;

    let linked: Vec<(String, String)> =
        sqlx::query_as("SELECT id, student_id FROM requests WHERE json_extract(data, '$.report_id') = ?1").bind(&id).fetch_all(&s.db).await?;
    let label = match b.status.as_str() {
        "dikerjakan" => "Mulai dikerjakan",
        "selesai" => "Selesai",
        _ => "Dikembalikan ke antrean",
    };
    for (req, student) in &linked {
        sqlx::query("UPDATE requests SET status = ?2, updated_at = unixepoch() WHERE id = ?1").bind(req).bind(request_status(&b.status)).execute(&s.db).await?;
        sqlx::query("INSERT INTO audit_log (student_id, request_id, actor, tool, result) VALUES (?1, ?2, 'teknisi', 'updateReport', ?3)")
            .bind(student).bind(req).bind(format!("{label} oleh {}", me.user.name))
            .execute(&s.db)
            .await?;
        if b.status == "selesai" {
            let text = format!("Laporan {title} di {room} sudah selesai dikerjakan {}. Makasih sudah melapor!", me.user.name);
            insert_message(&s.db, student, "agent", Some(&text), None, None).await?;
        }
    }
    Ok(Json(json!({ "ok": true, "notified": if b.status == "selesai" { linked.len() } else { 0 } })))
}
