//! Pemantauan tim admin: siapa login dari IP mana, siapa memakai AI, dan permintaan layanan.

use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};

use crate::auth::{CurrentUser, Role};
use crate::error::AppError;
use crate::AppState;

#[utoipa::path(get, path = "/api/admin/overview", responses((status = 200, description = "{activity, users, requests}")))]
pub async fn overview(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Value>, AppError> {
    me.require(Role::Admin)?;

    let activity: Vec<(i64, String, String, String, Option<String>, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT a.at, a.ip, a.action, a.detail, u.name, u.email, u.role FROM access_log a LEFT JOIN users u ON u.id = a.user_id \
         ORDER BY a.id DESC LIMIT 300",
    )
    .fetch_all(&s.db)
    .await?;

    let users: Vec<(String, String, String, i64, i64, i64, i64, Option<String>, Option<i64>)> = sqlx::query_as(
        "SELECT u.name, u.email, u.role, \
           (SELECT COUNT(*) FROM llm_usage l WHERE l.student_id = u.id), \
           (SELECT COALESCE(SUM(l.input + l.output), 0) FROM llm_usage l WHERE l.student_id = u.id), \
           (SELECT COUNT(*) FROM access_log a WHERE a.user_id = u.id AND a.action = 'chat'), \
           (SELECT COUNT(*) FROM requests r WHERE r.student_id = u.id), \
           (SELECT group_concat(DISTINCT a.ip) FROM access_log a WHERE a.user_id = u.id), \
           (SELECT MAX(a.at) FROM access_log a WHERE a.user_id = u.id) AS last \
         FROM users u ORDER BY last IS NULL, last DESC, u.role, u.name",
    )
    .fetch_all(&s.db)
    .await?;

    let requests: Vec<(String, String, String, String, i64, String, String)> = sqlx::query_as(
        "SELECT r.id, r.worker, r.title, r.status, r.created_at, u.name, u.email FROM requests r JOIN users u ON u.id = r.student_id \
         ORDER BY r.created_at DESC LIMIT 200",
    )
    .fetch_all(&s.db)
    .await?;

    Ok(Json(json!({
        "activity": activity.into_iter().map(|(at, ip, action, detail, name, email, role)| json!({
            "at": at, "ip": ip, "action": action, "detail": detail, "name": name, "email": email, "role": role,
        })).collect::<Vec<_>>(),
        "users": users.into_iter().map(|(name, email, role, ai_calls, tokens, chats, requests, ips, last)| json!({
            "name": name, "email": email, "role": role, "ai_calls": ai_calls, "tokens": tokens, "chats": chats,
            "requests": requests, "ips": ips.map(|v| v.split(',').map(str::to_owned).collect::<Vec<_>>()).unwrap_or_default(), "last": last,
        })).collect::<Vec<_>>(),
        "requests": requests.into_iter().map(|(id, worker, title, status, at, name, email)| json!({
            "id": id, "worker": worker, "title": title, "status": status, "at": at, "name": name, "email": email,
        })).collect::<Vec<_>>(),
    })))
}
