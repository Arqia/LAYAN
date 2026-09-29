//! Loop agent: LLM memilih tool, tool dijalankan di server, hasilnya dikembalikan ke LLM
//! sampai selesai atau sampai agent menunggu isian card dari mahasiswa.

use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use tokio::sync::mpsc::Sender;

use crate::auth::User;
use crate::tools::{self, Outcome, DRAFT_STEPS};
use crate::{llm, util, AppState};

/// Error yang pesannya aman ditampilkan ke mahasiswa.
#[derive(Debug)]
pub struct Nope(pub String);
impl std::fmt::Display for Nope {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for Nope {}

/// Event yang di-stream ke client lewat SSE.
#[derive(Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Ev {
    Status { label: Option<String>, steps: Option<Vec<String>>, step: Option<usize> },
    Message { message: ChatMessage },
    Update { id: i64, state: String },
    Error { message: String },
    Done,
}

impl Ev {
    pub fn name(&self) -> &'static str {
        match self {
            Self::Status { .. } => "status",
            Self::Message { .. } => "message",
            Self::Update { .. } => "update",
            Self::Error { .. } => "error",
            Self::Done => "done",
        }
    }
}

/* ---------- pesan chat (tampilan) ---------- */

#[derive(Serialize, Clone, utoipa::ToSchema)]
pub struct ChatMessage {
    pub id: i64,
    /// user | agent
    pub sender: String,
    pub text: Option<String>,
    /// {name, size}
    pub file: Option<Value>,
    /// {kind, state, data}
    pub card: Option<Value>,
    pub time: String,
}

#[derive(sqlx::FromRow)]
struct Row {
    id: i64,
    sender: String,
    text: Option<String>,
    file: Option<String>,
    card: Option<String>,
    created_at: i64,
}

impl From<Row> for ChatMessage {
    fn from(r: Row) -> Self {
        let parse = |s: Option<String>| s.and_then(|s| serde_json::from_str(&s).ok());
        Self { id: r.id, sender: r.sender, text: r.text, file: parse(r.file), card: parse(r.card), time: util::clock(r.created_at) }
    }
}

const COLS: &str = "id, sender, text, file, card, created_at";

pub async fn list_messages(db: &SqlitePool, student: &str) -> anyhow::Result<Vec<ChatMessage>> {
    let rows = sqlx::query_as::<_, Row>(&format!("SELECT {COLS} FROM chat_messages WHERE student_id = ?1 ORDER BY id"))
        .bind(student)
        .fetch_all(db)
        .await?;
    Ok(rows.into_iter().map(Into::into).collect())
}

pub async fn insert_message(
    db: &SqlitePool,
    student: &str,
    sender: &str,
    text: Option<&str>,
    file: Option<&Value>,
    card: Option<&Value>,
) -> anyhow::Result<ChatMessage> {
    let row = sqlx::query_as::<_, Row>(&format!(
        "INSERT INTO chat_messages (student_id, sender, text, file, card) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING {COLS}"
    ))
    .bind(student)
    .bind(sender)
    .bind(text)
    .bind(file.map(Value::to_string))
    .bind(card.map(Value::to_string))
    .fetch_one(db)
    .await?;
    Ok(row.into())
}

/* ---------- thread LLM ---------- */

#[derive(Serialize, Deserialize, Clone)]
pub struct Pending {
    pub call_id: String,
    pub tool: String,
    pub message_id: i64,
}

pub struct Thread {
    pub transcript: Vec<Value>,
    pub pending: Option<Pending>,
    pub request_id: Option<String>,
}

const KEEP: usize = 30;

impl Thread {
    async fn load(db: &SqlitePool, student: &str) -> anyhow::Result<Self> {
        let row: Option<(String, Option<String>, Option<String>)> =
            sqlx::query_as("SELECT transcript, pending, request_id FROM threads WHERE student_id = ?1").bind(student).fetch_optional(db).await?;
        let Some((t, p, r)) = row else {
            return Ok(Self { transcript: vec![], pending: None, request_id: None });
        };
        Ok(Self { transcript: serde_json::from_str(&t)?, pending: p.and_then(|p| serde_json::from_str(&p).ok()), request_id: r })
    }

    async fn save(&mut self, db: &SqlitePool, student: &str) -> anyhow::Result<()> {
        // Potong transcript lama, mulai dari pesan user supaya pasangan tool call tetap utuh.
        if self.transcript.len() > KEEP {
            let from = self.transcript.len() - KEEP;
            if let Some(i) = self.transcript[from..].iter().position(|m| m["role"] == "user") {
                self.transcript.drain(..from + i);
            }
        }
        sqlx::query(
            "INSERT INTO threads (student_id, transcript, pending, request_id) VALUES (?1, ?2, ?3, ?4) \
             ON CONFLICT(student_id) DO UPDATE SET transcript = ?2, pending = ?3, request_id = ?4",
        )
        .bind(student)
        .bind(Value::from(self.transcript.clone()).to_string())
        .bind(self.pending.as_ref().map(|p| json!(p).to_string()))
        .bind(&self.request_id)
        .execute(db)
        .await?;
        Ok(())
    }
}

/* ---------- konteks tool ---------- */

pub struct Cx<'a> {
    pub s: &'a AppState,
    pub me: &'a User,
    pub th: Thread,
    tx: &'a Sender<Ev>,
}

impl Cx<'_> {
    pub async fn emit(&self, e: Ev) {
        let _ = self.tx.send(e).await; // client boleh putus, pekerjaan tetap jalan
    }

    async fn status(&self, label: &str, step: Option<usize>) {
        let steps = step.map(|_| DRAFT_STEPS.iter().map(|s| s.to_string()).collect());
        self.emit(Ev::Status { label: Some(label.into()), steps, step }).await;
    }

    pub async fn say(&self, text: Option<&str>, card: Option<Value>) -> anyhow::Result<i64> {
        let m = insert_message(&self.s.db, &self.me.id, "agent", text, None, card.as_ref()).await?;
        let id = m.id;
        self.emit(Ev::Message { message: m }).await;
        Ok(id)
    }

    pub async fn say_user(&self, text: Option<&str>, file: Option<Value>) -> anyhow::Result<i64> {
        let m = insert_message(&self.s.db, &self.me.id, "user", text, file.as_ref(), None).await?;
        let id = m.id;
        self.emit(Ev::Message { message: m }).await;
        Ok(id)
    }

    pub async fn set_card_state(&self, id: i64, state: &str) -> anyhow::Result<()> {
        sqlx::query("UPDATE chat_messages SET card = json_set(card, '$.state', ?1) WHERE id = ?2 AND student_id = ?3 AND card IS NOT NULL")
            .bind(state).bind(id).bind(&self.me.id)
            .execute(&self.s.db)
            .await?;
        self.emit(Ev::Update { id, state: state.into() }).await;
        Ok(())
    }

    pub async fn audit(&self, tool: &str, result: &str) -> anyhow::Result<()> {
        let req = self.th.request_id.clone();
        self.audit_as("agent", req.as_deref(), tool, result).await
    }

    pub async fn audit_as(&self, actor: &str, request_id: Option<&str>, tool: &str, result: &str) -> anyhow::Result<()> {
        sqlx::query("INSERT INTO audit_log (student_id, request_id, actor, tool, result) VALUES (?1, ?2, ?3, ?4, ?5)")
            .bind(&self.me.id).bind(request_id).bind(actor).bind(tool).bind(result)
            .execute(&self.s.db)
            .await?;
        Ok(())
    }

    pub fn req(&self) -> anyhow::Result<String> {
        self.th.request_id.clone().ok_or_else(|| anyhow!("Belum ada permintaan aktif. Mulai dari requestLetterDetails."))
    }
}

/* ---------- loop ---------- */

pub enum Input {
    Text(String),
    Action { message_id: i64, action: String, payload: Value },
}

pub async fn run(s: &AppState, me: &User, input: Input, tx: &Sender<Ev>) -> anyhow::Result<()> {
    let th = Thread::load(&s.db, &me.id).await?;
    let mut cx = Cx { s, me, th, tx };

    match input {
        Input::Text(t) => {
            cx.say_user(Some(&t), None).await?;
            if let Some(p) = cx.th.pending.take() {
                cx.set_card_state(p.message_id, "skipped").await?;
                cx.th.transcript.push(llm::tool_result(&p.call_id, &json!({ "status": "dilewati", "catatan": "mahasiswa menulis pesan baru tanpa mengisi card" })));
            }
            cx.th.transcript.push(llm::user(&t));
        }
        // Aksi deterministik dari card: tidak perlu LLM.
        Input::Action { message_id, action, payload } if action == "cancel_booking" || action == "photo" => {
            if action == "photo" {
                crate::fasilitas::add_photo(&mut cx, &payload).await?;
            } else {
                crate::fasilitas::cancel_booking(&mut cx, message_id, &payload).await?;
            }
            cx.th.save(&s.db, &me.id).await?;
            return Ok(());
        }
        Input::Action { message_id, action, .. } if action == "ticket" => {
            cx.set_card_state(message_id, "submitted").await?;
            cx.th.transcript.push(llm::user("[aksi] Mahasiswa menekan tombol \"Masih bingung? Buat tiket\"."));
        }
        Input::Action { message_id, action, payload } => {
            let p = cx.th.pending.clone().filter(|p| p.message_id == message_id).ok_or_else(|| Nope("Card ini sudah tidak aktif.".into()))?;
            let result = tools::resume(&mut cx, &p, &action, &payload).await?;
            cx.th.pending = None;
            cx.set_card_state(message_id, "submitted").await?;
            cx.th.transcript.push(llm::tool_result(&p.call_id, &result));
        }
    }

    let res = steps(&mut cx).await;
    cx.emit(Ev::Status { label: None, steps: None, step: None }).await;
    cx.th.save(&s.db, &me.id).await?;
    res
}

async fn steps(cx: &mut Cx<'_>) -> anyhow::Result<()> {
    cx.status("Membaca permintaanmu", None).await;
    for _ in 0..10 {
        let (msg, usage) = cx.s.llm.next(&cx.th.transcript).await?;
        if let Some(u) = usage {
            sqlx::query("INSERT INTO llm_usage (student_id, input, output, cached) VALUES (?1, ?2, ?3, ?4)")
                .bind(&cx.me.id).bind(u.input).bind(u.output).bind(u.cached)
                .execute(&cx.s.db)
                .await?;
        }
        let calls = msg["tool_calls"].as_array().cloned().unwrap_or_default();
        cx.th.transcript.push(msg.clone());

        if calls.is_empty() {
            if let Some(t) = msg["content"].as_str().map(str::trim).filter(|t| !t.is_empty()) {
                cx.say(Some(t), None).await?;
            }
            return Ok(());
        }

        let mut paused = false;
        let mut last: Option<String> = None;
        for c in calls {
            let id = c["id"].as_str().unwrap_or_default().to_owned();
            let name = c["function"]["name"].as_str().unwrap_or_default().to_owned();
            // Protokol chat completions: setiap tool call wajib punya jawaban.
            if paused {
                cx.th.transcript.push(llm::tool_result(&id, &json!({ "status": "ditunda, tunggu isian mahasiswa" })));
                continue;
            }
            let args: Value = serde_json::from_str(c["function"]["arguments"].as_str().unwrap_or("{}")).unwrap_or(json!({}));
            let (label, step) = tools::status_for(&name);
            cx.status(label, step).await;
            match tools::exec(cx, &name, &args).await {
                Ok(Outcome::Done(v)) => {
                    cx.th.transcript.push(llm::tool_result(&id, &v));
                    if tools::FINAL.contains(&name.as_str()) {
                        last = Some(name);
                    }
                }
                Ok(Outcome::Pause(message_id)) => {
                    cx.th.pending = Some(Pending { call_id: id, tool: name, message_id });
                    paused = true;
                }
                // Error tool dikembalikan ke LLM supaya bisa memperbaiki langkahnya.
                Err(e) => cx.th.transcript.push(llm::tool_result(&id, &json!({ "error": e.to_string() }))),
            }
        }
        if paused {
            return Ok(());
        }
        // Alur selesai dan card sudah tampil: tidak perlu memanggil LLM lagi hanya untuk menutup.
        // Transcript dikosongkan supaya permintaan berikutnya tidak mengirim ulang riwayat lama,
        // kecuali jawaban KB: tombol "Buat tiket" masih butuh pertanyaan terakhirnya.
        if let Some(name) = last {
            if name != "answerWithCitation" {
                cx.th.transcript.clear();
            }
            return Ok(());
        }
    }
    cx.say(Some("Maaf, aku belum berhasil menyelesaikan ini. Coba ceritakan lagi dengan lebih singkat ya."), None).await?;
    Ok(())
}
