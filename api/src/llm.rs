//! Client LLM format chat completions (OpenAI-compatible).
//! Gemini dan DeepSeek sama-sama punya endpoint ini, jadi ganti provider cukup lewat .env.

use anyhow::{bail, Context};
use serde_json::{json, Value};

use crate::{mock, tools};

pub enum Llm {
    /// Agent tiruan berbasis aturan, tanpa API key. Juga cadangan saat demo.
    Mock,
    Http { url: String, key: String, model: String, client: reqwest::Client },
}

impl Llm {
    pub fn from_env() -> Self {
        let get = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
        match (get("LLM_PROVIDER").as_deref(), get("LLM_API_KEY")) {
            (Some("openai-compatible"), Some(key)) => Self::Http {
                url: format!("{}/chat/completions", get("LLM_BASE_URL").unwrap_or_default().trim_end_matches('/')),
                key,
                model: get("LLM_MODEL").unwrap_or_default(),
                client: reqwest::Client::builder().timeout(std::time::Duration::from_secs(20)).build().expect("reqwest client"),
            },
            _ => Self::Mock,
        }
    }

    pub fn name(&self) -> String {
        match self {
            Self::Mock => "mock".into(),
            Self::Http { model, .. } => model.clone(),
        }
    }

    /// Satu langkah agent: kirim transcript, terima pesan assistant (teks dan/atau tool_calls).
    /// Kalau provider error atau lewat 20 detik, langkah ini dikerjakan mock supaya layanan tidak macet.
    pub async fn next(&self, transcript: &[Value]) -> anyhow::Result<Value> {
        let Self::Http { url, key, model, client } = self else {
            tokio::time::sleep(std::time::Duration::from_millis(700)).await;
            return Ok(mock::next(transcript));
        };
        match Self::call(url, key, model, client, transcript).await {
            // LLM kadang diam di tengah alur. Kalau aturan mock tahu langkah berikutnya, pakai itu.
            Ok(m) if m["tool_calls"].as_array().is_none_or(|c| c.is_empty()) && m["content"].as_str().is_none_or(|t| t.trim().is_empty()) => {
                let fallback = mock::next(transcript);
                if fallback["tool_calls"].is_array() {
                    eprintln!("LLM diam di tengah alur, langkah ini dilanjutkan mock");
                    return Ok(fallback);
                }
                Ok(m)
            }
            Ok(m) => Ok(m),
            Err(e) => {
                eprintln!("LLM gagal, langkah ini pakai mock: {e:#}");
                Ok(mock::next(transcript))
            }
        }
    }

    async fn call(url: &str, key: &str, model: &str, client: &reqwest::Client, transcript: &[Value]) -> anyhow::Result<Value> {
        let mut messages = vec![json!({ "role": "system", "content": tools::system_prompt() })];
        messages.extend_from_slice(transcript);
        let body = json!({
            "model": model,
            "messages": messages,
            "tools": tools::definitions(),
            "tool_choice": "auto",
            "temperature": 0.2,
        });
        let res = client.post(url).bearer_auth(key).json(&body).send().await.context("LLM tidak bisa dihubungi")?;
        let status = res.status();
        let text = res.text().await?;
        if !status.is_success() {
            bail!("LLM {status}: {}", text.chars().take(300).collect::<String>());
        }
        let v: Value = serde_json::from_str(&text).context("respons LLM bukan JSON")?;
        let mut msg = v["choices"][0]["message"].clone();
        if msg.is_null() {
            bail!("respons LLM tanpa message: {}", text.chars().take(300).collect::<String>());
        }

        // Normalisasi: sebagian provider tidak mengisi id tool call.
        msg["role"] = json!("assistant");
        if let Some(calls) = msg["tool_calls"].as_array_mut() {
            for (i, c) in calls.iter_mut().enumerate() {
                if c["id"].as_str().unwrap_or("").is_empty() {
                    c["id"] = json!(format!("call-{}-{i}", crate::util::now()));
                }
            }
        }
        Ok(msg)
    }
}

/* ---------- builder pesan (dipakai agent dan mock) ---------- */

pub fn user(text: &str) -> Value {
    json!({ "role": "user", "content": text })
}

pub fn tool_result(call_id: &str, result: &Value) -> Value {
    json!({ "role": "tool", "tool_call_id": call_id, "content": result.to_string() })
}

pub fn assistant_text(text: &str) -> Value {
    json!({ "role": "assistant", "content": text })
}

pub fn assistant_call(id: String, name: &str, args: Value) -> Value {
    json!({
        "role": "assistant",
        "content": null,
        "tool_calls": [{ "id": id, "type": "function", "function": { "name": name, "arguments": args.to_string() } }],
    })
}
