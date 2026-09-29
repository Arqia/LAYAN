//! Provider LLM tiruan: aturan sederhana yang memanggil tool dengan urutan yang sama
//! seperti LLM sungguhan. Dipakai saat belum ada API key, dan sebagai cadangan demo.

use std::collections::HashMap;

use serde_json::{json, Value};

use crate::llm::{assistant_call, assistant_text};

fn has(text: &str, words: &[&str]) -> bool {
    words.iter().any(|w| text.contains(w))
}

/// "10–12 Oktober" / "14 Okt" dari teks bebas. Kosong kalau tidak ketemu.
fn dates(text: &str) -> String {
    const BULAN: [&str; 12] = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
    let words: Vec<&str> = text.split_whitespace().collect();
    for (i, w) in words.iter().enumerate() {
        let lw = w.to_lowercase();
        if let Some(b) = BULAN.iter().find(|b| lw.starts_with(&b[..3.min(b.len())])) {
            if i > 0 && words[i - 1].chars().next().is_some_and(|c| c.is_ascii_digit()) {
                let mut name = b.to_string();
                name[..1].make_ascii_uppercase();
                return format!("{} {name}", words[i - 1]);
            }
        }
    }
    String::new()
}

/// IP pertama di teks, mis. "3,2" -> 3.2
fn ip(text: &str) -> Option<f64> {
    let c: Vec<char> = text.chars().collect();
    (1..c.len().saturating_sub(1)).find_map(|i| {
        if (c[i] == ',' || c[i] == '.') && c[i - 1].is_ascii_digit() && c[i + 1].is_ascii_digit() && (i < 2 || !c[i - 2].is_ascii_digit()) {
            let frac: String = c[i + 1..].iter().take_while(|d| d.is_ascii_digit()).collect();
            format!("{}.{frac}", c[i - 1]).parse().ok()
        } else {
            None
        }
    })
}

fn sks_for(ip: f64) -> (&'static str, &'static str) {
    match ip {
        x if x < 2.0 => ("Maksimal 18 SKS", "IP kurang dari 2,00"),
        x if x < 3.0 => ("Maksimal 20 SKS", "IP 2,00 sampai 2,99"),
        x if x < 3.5 => ("Maksimal 22 SKS", "IP 3,00 sampai 3,49"),
        _ => ("Maksimal 24 SKS", "Mulai IP 3,50"),
    }
}

/// Dua kalimat penjelasan: kalimat yang memuat `anchor` dan kalimat sesudahnya.
fn explain(body: &str, anchor: Option<&str>) -> String {
    let sentences: Vec<&str> = body.split(". ").map(|s| s.trim_end_matches('.')).collect();
    let start = anchor.and_then(|a| sentences.iter().position(|s| s.contains(a))).unwrap_or(0);
    sentences.iter().skip(start).take(2).map(|s| format!("{s}.")).collect::<Vec<_>>().join(" ")
}

pub fn next(tr: &[Value]) -> Value {
    let n = tr.len();
    let call = |name: &str, args: Value| assistant_call(format!("mock-{n}"), name, args);

    let Some(u) = tr.iter().rposition(|m| m["role"] == "user") else {
        return assistant_text("Halo! Ceritakan saja keperluanmu.");
    };
    let said = tr[u]["content"].as_str().unwrap_or("").to_lowercase();

    // Nama tool untuk setiap id, lalu hasil tool sejak pesan user terakhir.
    let names: HashMap<&str, &str> = tr
        .iter()
        .filter_map(|m| m["tool_calls"].as_array())
        .flatten()
        .filter_map(|c| Some((c["id"].as_str()?, c["function"]["name"].as_str()?)))
        .collect();
    let done: Vec<(&str, Value)> = tr[u..]
        .iter()
        .filter(|m| m["role"] == "tool")
        .filter_map(|m| {
            let name = names.get(m["tool_call_id"].as_str()?)?;
            Some((*name, serde_json::from_str(m["content"].as_str()?).unwrap_or(Value::Null)))
        })
        .collect();
    let result = |tool: &str| done.iter().rev().find(|(t, _)| *t == tool).map(|(_, v)| v.clone()).unwrap_or(Value::Null);

    match done.last().map(|(t, _)| *t) {
        None if said.starts_with("[aksi]") => {
            let question = tr[..u]
                .iter()
                .rev()
                .filter(|m| m["role"] == "user")
                .filter_map(|m| m["content"].as_str())
                .find(|t| !t.starts_with("[aksi]"))
                .unwrap_or("Pertanyaan akademik");
            call("createTicket", json!({ "category": "Beban studi / SKS", "unit": "Bagian Akademik Fakultas", "question": question }))
        }
        None if has(&said, &["surat", "izin", "dispensasi", "lomba"]) => call("getStudentProfile", json!({})),
        None if has(&said, &["sks", " ip ", "ipk", "cuti", "nilai", "aturan", "krs", "ukt", "masa studi", "konversi"]) => {
            call("searchKnowledgeBase", json!({ "query": said }))
        }
        None if has(&said, &["booking", "pinjam", "ruang", "rusak", "mati", "bocor", "lapor"]) => assistant_text(
            "Booking ruang dan lapor kerusakan sedang aku siapkan. Untuk sekarang aku bisa bantu minta surat dan menjawab aturan akademik.",
        ),
        None => assistant_text(
            "Aku bisa bantu minta surat dispensasi dan menjawab aturan akademik. Coba ceritakan lebih spesifik ya.",
        ),

        Some("getStudentProfile") => call(
            "requestLetterDetails",
            json!({
                "message": "Siap. Aku buatkan Surat Dispensasi ya. Data profil kamu sudah aku ambil. Tinggal dua hal:",
                "dates": dates(tr[u]["content"].as_str().unwrap_or("")),
            }),
        ),
        Some("requestLetterDetails") => {
            call("requestAttachment", json!({ "message": "Terakhir, upload bukti kegiatan (surat undangan atau pengumuman lolos)." }))
        }
        Some("requestAttachment") => call("checkLetterRequirements", json!({})),
        Some("checkLetterRequirements") if result("checkLetterRequirements")["lolos"] == true => call("generateLetterDraft", json!({})),
        Some("generateLetterDraft") => {
            let p = result("getStudentProfile");
            let d = result("requestLetterDetails");
            let first = p["nama"].as_str().unwrap_or("Mahasiswa").split(' ').next().unwrap_or("Mahasiswa").to_owned();
            let list: Vec<String> = d["courses"].as_array().into_iter().flatten().filter_map(|c| c.as_str().map(str::to_owned)).collect();
            let when = d["dates"].as_str().filter(|s| !s.is_empty()).map(|s| format!(" pada {s}")).unwrap_or_default();
            let summary = format!(
                "{first} minta Surat Dispensasi untuk mengikuti {}{when}. Mata kuliah terlewat: {}. Syarat terpenuhi dan bukti kegiatan sudah diterima.",
                d["activity"].as_str().unwrap_or("kegiatan"),
                crate::tools::join_id(&list),
            );
            call("submitForApproval", json!({ "summary": summary }))
        }

        Some("searchKnowledgeBase") => {
            let hits = result("searchKnowledgeBase")["hasil"].as_array().cloned().unwrap_or_default();
            let out_of_kb = has(&said, &["cicil", "bayar", "ukt"]);
            match hits.first() {
                Some(top) if !out_of_kb => {
                    let body = top["isi"].as_str().unwrap_or("");
                    let (headline, anchor) = match (top["judul"].as_str(), ip(&said)) {
                        (Some("Beban studi"), Some(v)) => {
                            let (h, a) = sks_for(v);
                            (h.to_owned(), Some(a))
                        }
                        _ => (top["ringkas"].as_str().unwrap_or("").to_owned(), None),
                    };
                    call(
                        "answerWithCitation",
                        json!({
                            "headline": headline,
                            "explanation": explain(body, anchor),
                            "source_title": "Pedoman Akademik",
                            "source_section": top["bagian"],
                        }),
                    )
                }
                _ => call(
                    "createTicket",
                    json!({
                        "category": if out_of_kb { "Keuangan / UKT" } else { "Pertanyaan akademik" },
                        "unit": if out_of_kb { "Bagian Keuangan" } else { "Bagian Akademik Fakultas" },
                        "question": tr[u]["content"],
                        "message": "Aku belum menemukan jawaban pastinya di Pedoman Akademik. Pertanyaanmu aku teruskan ke unit terkait ya.",
                    }),
                ),
            }
        }

        // requestLetterDetails/requestAttachment dilewati, syarat gagal, jawaban/tiket sudah tampil: selesai.
        _ => assistant_text(""),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ekstraksi() {
        assert_eq!(dates("surat izin lomba tanggal 10–12 Oktober"), "10–12 Oktober");
        assert_eq!(dates("tidak ada tanggal"), "");
        assert_eq!(ip("kalau ip semester lalu 3,2 berapa"), Some(3.2));
        assert_eq!(sks_for(3.2).0, "Maksimal 22 SKS");
        assert_eq!(explain("A satu. B dua. C tiga.", Some("B")), "B dua. C tiga.");
    }
}
