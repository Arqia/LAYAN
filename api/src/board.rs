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
    note: Option<String>,
    created_at: i64,
    updated_at: i64,
}

#[utoipa::path(get, path = "/api/reports", responses((status = 200)))]
pub async fn list(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Vec<Value>>, AppError> {
    if me.user.role == Role::Mahasiswa {
        return Err(AppError::Forbidden);
    }
    let rows = sqlx::query_as::<_, Row>(
        "SELECT r.id, r.room, r.title, r.category, r.urgency, r.status, r.assignee, u.name AS tech, r.reporters, r.photo, r.note, r.created_at, r.updated_at \
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
                    "photo": r.photo, "note": r.note, "time": when(r.created_at), "updated": when(r.updated_at),
                    "created_at": r.created_at, "updated_at": r.updated_at,
                })
            })
            .collect(),
    ))
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct StatusReq {
    /// baru | dikerjakan | eskalasi | selesai
    pub status: String,
    /// alasan, wajib saat eskalasi (minimal 10 huruf)
    pub note: Option<String>,
}

/// Alur kartu: baru -> dikerjakan -> selesai, atau dikerjakan -> eskalasi -> selesai.
fn allowed(from: &str, to: &str) -> bool {
    matches!((from, to), ("baru", "dikerjakan") | ("dikerjakan", "selesai") | ("dikerjakan", "eskalasi") | ("eskalasi", "selesai"))
}

/// Pindah status kartu. Status permintaan pelapor ikut berubah; saat selesai, pelapor dikabari lewat chat.
#[utoipa::path(post, path = "/api/reports/{id}/status", request_body = StatusReq, params(("id" = String, Path)), responses((status = 200)))]
pub async fn set_status(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>, Json(b): Json<StatusReq>) -> Result<Json<Value>, AppError> {
    me.require(Role::Teknisi)?;
    if !["baru", "dikerjakan", "eskalasi", "selesai"].contains(&b.status.as_str()) {
        return Err(AppError::Bad("Status tidak dikenal.".into()));
    }
    let note = b.note.as_deref().map(str::trim).filter(|n| !n.is_empty());
    if b.status == "eskalasi" && note.map_or(0, |n| n.chars().count()) < 10 {
        return Err(AppError::Bad("Alasan eskalasi wajib diisi, minimal 10 huruf.".into()));
    }
    let row: Option<(String, String, String)> = sqlx::query_as("SELECT room, title, status FROM reports WHERE id = ?1").bind(&id).fetch_optional(&s.db).await?;
    let (room, title, old) = row.ok_or(AppError::NotFound)?;
    if old == b.status {
        return Ok(Json(json!({ "ok": true })));
    }
    if !allowed(&old, &b.status) {
        return Err(AppError::Bad(format!("Laporan berstatus {old} tidak bisa dipindah ke {}.", b.status)));
    }
    let note = if b.status == "eskalasi" { note } else { None }; // note hanya untuk eskalasi; selesai setelah eskalasi tetap menyimpan alasannya
    sqlx::query("UPDATE reports SET status = ?2, note = COALESCE(?3, note), updated_at = unixepoch() WHERE id = ?1")
        .bind(&id)
        .bind(&b.status)
        .bind(note)
        .execute(&s.db)
        .await?;

    let linked: Vec<(String, String)> =
        sqlx::query_as("SELECT id, student_id FROM requests WHERE json_extract(data, '$.report_id') = ?1").bind(&id).fetch_all(&s.db).await?;
    let label = match b.status.as_str() {
        "dikerjakan" => "Diterima teknisi",
        "eskalasi" => "Dieskalasi ke bagian sarana",
        _ => "Selesai",
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
        if b.status == "eskalasi" {
            let text = format!(
                "Laporan {title} di {room} perlu penanganan lanjutan, jadi diteruskan ke bagian sarana kampus. Catatan teknisi: {}",
                note.unwrap_or_default()
            );
            insert_message(&s.db, student, "agent", Some(&text), None, None).await?;
        }
    }
    Ok(Json(json!({ "ok": true, "notified": if b.status == "selesai" || b.status == "eskalasi" { linked.len() } else { 0 } })))
}

#[cfg(test)]
mod tests {
    use super::allowed;

    #[test]
    fn alur_status() {
        assert!(allowed("baru", "dikerjakan"));
        assert!(allowed("dikerjakan", "selesai"));
        assert!(allowed("dikerjakan", "eskalasi"));
        assert!(allowed("eskalasi", "selesai"));
        assert!(!allowed("baru", "selesai"));
        assert!(!allowed("baru", "eskalasi"));
        assert!(!allowed("selesai", "baru"));
        assert!(!allowed("dikerjakan", "baru"));
    }
}
