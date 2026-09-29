//! Permintaan layanan: riwayat mahasiswa, detail (juga untuk cetak surat), dan antrean staf.

use axum::extract::{Path, State};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::SqlitePool;

use crate::agent::insert_message;
use crate::auth::{CurrentUser, Role};
use crate::error::AppError;
use crate::tools::{courses, merge_data};
use crate::util::{clock, now, when};
use crate::AppState;

#[derive(sqlx::FromRow)]
struct Req {
    id: String,
    student_id: String,
    worker: String,
    title: String,
    status: String,
    summary: String,
    data: String,
    created_at: i64,
    name: String,
    nim: Option<String>,
    prodi: Option<String>,
}

const SELECT: &str = "SELECT r.id, r.student_id, r.worker, r.title, r.status, r.summary, r.data, r.created_at, u.name, u.nim, u.prodi \
                      FROM requests r JOIN users u ON u.id = r.student_id";

impl Req {
    fn data(&self) -> Value {
        serde_json::from_str(&self.data).unwrap_or(json!({}))
    }

    fn first_name(&self) -> &str {
        self.name.split(' ').next().unwrap_or(&self.name)
    }

    /// Ringkasan satu baris untuk list.
    fn line(&self, d: &Value) -> String {
        match self.worker.as_str() {
            "surat" => {
                let n = courses(d).len();
                [d["activity"].as_str().unwrap_or(""), d["dates"].as_str().unwrap_or(""), &format!("{n} mata kuliah")]
                    .into_iter()
                    .filter(|s| !s.is_empty())
                    .collect::<Vec<_>>()
                    .join(", ")
            }
            _ => d["question"].as_str().unwrap_or("").to_owned(),
        }
    }

    fn fields(&self, d: &Value) -> Vec<[String; 2]> {
        let s = |k: &str| d[k].as_str().unwrap_or("-").to_owned();
        match self.worker.as_str() {
            "surat" => vec![
                ["Kegiatan".into(), s("activity")],
                ["Tanggal".into(), s("dates")],
                ["Mata kuliah".into(), courses(d).join(", ")],
            ],
            _ => vec![["Kategori".into(), s("category")], ["Unit tujuan".into(), s("unit")], ["Pertanyaan".into(), s("question")]],
        }
    }
}

async fn load(db: &SqlitePool, id: &str) -> Result<Req, AppError> {
    sqlx::query_as::<_, Req>(&format!("{SELECT} WHERE r.id = ?1")).bind(id).fetch_optional(db).await?.ok_or(AppError::NotFound)
}

async fn timeline(db: &SqlitePool, id: &str) -> Result<Vec<(i64, String, String, String)>, AppError> {
    Ok(sqlx::query_as("SELECT at, actor, tool, result FROM audit_log WHERE request_id = ?1 ORDER BY id").bind(id).fetch_all(db).await?)
}

async fn audit_staf(db: &SqlitePool, r: &Req, tool: &str, result: &str) -> Result<(), AppError> {
    sqlx::query("INSERT INTO audit_log (student_id, request_id, actor, tool, result) VALUES (?1, ?2, 'staf', ?3, ?4)")
        .bind(&r.student_id).bind(&r.id).bind(tool).bind(result)
        .execute(db)
        .await?;
    Ok(())
}

/* ---------- mahasiswa ---------- */

/// Riwayat permintaan milik mahasiswa yang login.
#[utoipa::path(get, path = "/api/requests", responses((status = 200)))]
pub async fn mine(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Vec<Value>>, AppError> {
    me.require(Role::Mahasiswa)?;
    let rows = sqlx::query_as::<_, Req>(&format!("{SELECT} WHERE r.student_id = ?1 ORDER BY r.created_at DESC"))
        .bind(&me.user.id)
        .fetch_all(&s.db)
        .await?;
    Ok(Json(
        rows.iter()
            .map(|r| {
                let d = r.data();
                let meta = match (r.worker.as_str(), r.status.as_str()) {
                    ("surat", "approved" | "done") => format!("{} · disetujui {}", d["letter_no"].as_str().unwrap_or(""), d["approved_by"].as_str().unwrap_or("staf")),
                    (_, "rejected") => d["reject_reason"].as_str().unwrap_or("Ditolak staf").to_owned(),
                    ("surat", "pending_approval") => format!("{} · menunggu staf", d["activity"].as_str().unwrap_or("")),
                    ("surat", "needs_info") => "Menunggu data dari kamu".into(),
                    ("surat", _) => "Sedang diproses agent".into(),
                    _ => format!("{} · {}", d["category"].as_str().unwrap_or(""), d["unit"].as_str().unwrap_or("")),
                };
                json!({
                    "id": r.id,
                    "worker": r.worker,
                    "title": if r.worker == "helpdesk" { format!("Tiket {}", r.id) } else { r.title.clone() },
                    "status": r.status,
                    "time": when(r.created_at),
                    "meta": meta,
                    "active": !matches!(r.status.as_str(), "approved" | "rejected" | "done"),
                })
            })
            .collect(),
    ))
}

/// Detail permintaan: pemiliknya atau staf. Dipakai halaman riwayat dan cetak surat.
#[utoipa::path(get, path = "/api/requests/{id}", params(("id" = String, Path)), responses((status = 200), (status = 404)))]
pub async fn detail(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>) -> Result<Json<Value>, AppError> {
    let r = load(&s.db, &id).await?;
    if r.student_id != me.user.id && me.user.role != Role::Staf {
        return Err(AppError::NotFound);
    }
    let d = r.data();

    // Waktu tiap status versi mahasiswa (tanpa nama tool).
    let mut steps = serde_json::Map::new();
    steps.insert("submitted".into(), json!(clock(r.created_at)));
    for (at, _, tool, _) in timeline(&s.db, &r.id).await? {
        let status = match tool.as_str() {
            "requestLetterDetails" => "needs_info",
            "generateLetterDraft" => "processing",
            "submitForApproval" => "pending_approval",
            "approveRequest" => "approved",
            "rejectRequest" => "rejected",
            _ => continue,
        };
        steps.insert(status.into(), json!(clock(at)));
    }

    Ok(Json(json!({
        "id": r.id,
        "worker": r.worker,
        "title": if r.worker == "helpdesk" { format!("Tiket {}", r.id) } else { r.title.clone() },
        "status": r.status,
        "fields": r.fields(&d),
        "steps": steps,
        "letter": d["letter"],
        "letter_no": d["letter_no"],
        "approved_by": d["approved_by"],
        "approved_at": d["approved_at"],
        "reject_reason": d["reject_reason"],
        "student": { "name": r.name, "nim": r.nim, "prodi": r.prodi },
    })))
}

/* ---------- staf ---------- */

fn in_queue(r: &Req) -> bool {
    r.status == "pending_approval" || (r.worker == "helpdesk" && r.status == "submitted")
}

/// Antrean yang menunggu keputusan staf, lengkap dengan audit log agent.
#[utoipa::path(get, path = "/api/staff/queue", responses((status = 200)))]
pub async fn queue(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Vec<Value>>, AppError> {
    me.require(Role::Staf)?;
    let rows = sqlx::query_as::<_, Req>(&format!(
        "{SELECT} WHERE r.status = 'pending_approval' OR (r.worker = 'helpdesk' AND r.status = 'submitted') ORDER BY r.created_at DESC"
    ))
    .fetch_all(&s.db)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        let d = r.data();
        let files: Vec<(String, String, String, i64)> =
            sqlx::query_as("SELECT id, name, mime, size FROM attachments WHERE request_id = ?1").bind(&r.id).fetch_all(&s.db).await?;
        let attachments: Vec<Value> = files
            .into_iter()
            .map(|(id, name, mime, size)| {
                let kind = mime.rsplit('/').next().unwrap_or("file").to_uppercase().replace("JPEG", "JPG");
                json!({ "id": id, "name": name, "meta": format!("{kind} · {} KB", size / 1024) })
            })
            .collect();
        let tl: Vec<Value> = timeline(&s.db, &r.id)
            .await?
            .into_iter()
            .map(|(at, actor, tool, result)| json!({ "time": clock(at), "actor": actor, "tool": tool, "result": result }))
            .collect();
        out.push(json!({
            "id": r.id,
            "worker": r.worker,
            "tab": match r.worker.as_str() { "helpdesk" => "tiket", "fasilitas" => "booking", _ => "surat" },
            "type": r.title,
            "name": r.name,
            "nim": r.nim,
            "prodi": r.prodi,
            "time": when(r.created_at),
            "mins": (now() - r.created_at) / 60,
            "line": r.line(&d),
            "summary": if r.summary.is_empty() { r.line(&d) } else { r.summary.clone() },
            "checks": d["checks"].as_array().cloned().unwrap_or_default(),
            "attachments": attachments,
            "letter": d["letter"],
            "timeline": tl,
        }));
    }
    Ok(Json(out))
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct DecideReq {
    pub approve: bool,
    pub reason: Option<String>,
}

/// Approve / reject. Hasilnya langsung dikirim ke chat mahasiswa.
#[utoipa::path(post, path = "/api/staff/requests/{id}/decide", request_body = DecideReq, params(("id" = String, Path)), responses((status = 200)))]
pub async fn decide(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>, Json(b): Json<DecideReq>) -> Result<Json<Value>, AppError> {
    me.require(Role::Staf)?;
    let r = load(&s.db, &id).await?;
    if !in_queue(&r) {
        return Err(AppError::Bad("Permintaan ini sudah diputuskan.".into()));
    }
    let d = r.data();
    let first = r.first_name().to_owned();
    let staf = me.user.name.clone();

    let (status, text, card, patch, title, sub) = if b.approve {
        if r.worker == "surat" {
            let (ym, n): (String, i64) = sqlx::query_as(
                "SELECT strftime('%Y/%m', 'now', '+7 hours'), (SELECT COUNT(*) FROM requests WHERE json_extract(data, '$.letter_no') IS NOT NULL)",
            )
            .fetch_one(&s.db)
            .await?;
            let no = format!("SD/{ym}/{:04}", 142 + n);
            let at = clock(now());
            (
                "approved",
                format!("{} kamu sudah disetujui. Semangat lombanya!", r.title),
                Some(json!({ "kind": "done", "state": "active", "data": { "letter_no": no, "title": r.title, "approved_by": staf, "approved_at": at, "request_id": r.id } })),
                json!({ "letter_no": no, "approved_by": staf, "approved_at": at }),
                format!("{} {first} disetujui", r.title),
                format!("Nomor {no} terbit. {first} sudah diberi tahu lewat chat."),
            )
        } else {
            (
                "approved",
                format!("Tiket {} sudah ditindaklanjuti {}. Jawaban lengkapnya menyusul dari unit terkait.", r.id, d["unit"].as_str().unwrap_or("unit terkait")),
                None,
                json!({ "approved_by": staf }),
                format!("{} {first} diteruskan", r.title),
                format!("Tiket diteruskan. {first} sudah diberi tahu lewat chat."),
            )
        }
    } else {
        let reason = b.reason.as_deref().map(str::trim).filter(|x| !x.is_empty()).ok_or_else(|| AppError::Bad("Alasan penolakan wajib diisi.".into()))?;
        (
            "rejected",
            format!("{} kamu belum disetujui staf. Alasannya: {reason}", r.title),
            None,
            json!({ "reject_reason": reason }),
            format!("{} {first} ditolak", r.title),
            format!("Alasan sudah dikirim ke {first} lewat chat."),
        )
    };

    let msg = insert_message(&s.db, &r.student_id, "agent", Some(&text), None, card.as_ref()).await?;
    let mut patch = patch;
    patch["decision_msg"] = json!(msg.id);
    patch["decided_at"] = json!(now());
    merge_data(&s.db, &r.id, patch).await?;
    sqlx::query("UPDATE requests SET status = ?2, updated_at = unixepoch() WHERE id = ?1").bind(&r.id).bind(status).execute(&s.db).await?;
    let (tool, result) = if b.approve { ("approveRequest", format!("Disetujui {staf}")) } else { ("rejectRequest", format!("Ditolak {staf}")) };
    audit_staf(&s.db, &r, tool, &result).await?;
    Ok(Json(json!({ "title": title, "sub": sub })))
}

/// Batalkan keputusan (tombol "Batalkan" di toast). Hanya dalam 2 menit.
#[utoipa::path(post, path = "/api/staff/requests/{id}/undo", params(("id" = String, Path)), responses((status = 200)))]
pub async fn undo(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>) -> Result<Json<Value>, AppError> {
    me.require(Role::Staf)?;
    let r = load(&s.db, &id).await?;
    let d = r.data();
    let fresh = d["decided_at"].as_i64().is_some_and(|t| now() - t <= 120);
    if !matches!(r.status.as_str(), "approved" | "rejected") || !fresh {
        return Err(AppError::Bad("Keputusan ini sudah tidak bisa dibatalkan.".into()));
    }
    if let Some(mid) = d["decision_msg"].as_i64() {
        sqlx::query("DELETE FROM chat_messages WHERE id = ?1").bind(mid).execute(&s.db).await?;
    }
    let back = if r.worker == "helpdesk" { "submitted" } else { "pending_approval" };
    sqlx::query(
        "UPDATE requests SET status = ?2, updated_at = unixepoch(), \
         data = json_remove(data, '$.letter_no', '$.approved_by', '$.approved_at', '$.reject_reason', '$.decision_msg', '$.decided_at') WHERE id = ?1",
    )
    .bind(&r.id)
    .bind(back)
    .execute(&s.db)
    .await?;
    audit_staf(&s.db, &r, "undoDecision", &format!("Keputusan dibatalkan {}", me.user.name)).await?;
    Ok(Json(json!({ "ok": true })))
}

