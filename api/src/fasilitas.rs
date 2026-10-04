//! Worker Fasilitas: booking ruang (cek bentrok, tahan 24 jam, konfirmasi staf)
//! dan laporan kerusakan (laporan dobel digabung, langsung ke teknisi).

use anyhow::bail;
use serde_json::{json, Value};
use sqlx::SqlitePool;

use crate::agent::{Cx, Nope};
use crate::tools::{arg, card, create_request, get_data, merge_data, or, Outcome};
use crate::util::{self, clock, day_label, day_parts, hm, parse_iso, HARI};

pub const CATEGORIES: [&str; 6] = ["Listrik", "AC", "Proyektor", "Jaringan", "Kebersihan", "Lainnya"];
const OPEN: &str = "07:00";
const CLOSE: &str = "17:00";

/* ---------- jadwal ---------- */

fn minutes(t: &str) -> Option<i64> {
    let (h, m) = t.split_once(':')?;
    let (h, m): (i64, i64) = (h.parse().ok()?, m.parse().ok()?);
    (h < 24 && m < 60 && h >= 0 && m >= 0).then_some(h * 60 + m)
}

fn fmt_min(m: i64) -> String {
    format!("{:02}:{:02}", m / 60, m % 60)
}

/// Slot yang sudah terisi di satu ruang pada satu hari (booking terkonfirmasi atau masih ditahan).
async fn busy(db: &SqlitePool, room: &str, day: &str) -> anyhow::Result<Vec<(String, String)>> {
    Ok(sqlx::query_as(
        "SELECT start, end FROM bookings WHERE room = ?1 AND day = ?2 \
         AND (status = 'confirmed' OR (status = 'held' AND held_until > unixepoch()))",
    )
    .bind(room)
    .bind(day)
    .fetch_all(db)
    .await?)
}

fn overlaps(slots: &[(String, String)], s: &str, e: &str) -> bool {
    slots.iter().any(|(bs, be)| bs.as_str() < e && s < be.as_str())
}

fn option(code: &str, cap: i64, fac: &str, kind: &str, s: &str, e: &str, shifted: Option<i64>) -> Value {
    let mut cap_label = format!("{cap} orang");
    if kind == "rapat" {
        cap_label.push_str(" · ruang rapat");
    }
    let fac = match shifted {
        Some(h) => format!("{fac}. Jam digeser {h} jam"),
        None => fac.to_owned(),
    };
    json!({ "code": code, "start": s, "end": e, "time": format!("{}–{}", hm(s), hm(e)), "shifted": shifted.is_some(), "cap": cap_label, "fac": fac })
}

/// Cari ruang kosong. Kalau ruang pilihan bentrok, tawarkan jam lain di ruang itu.
pub async fn find_rooms(cx: &mut Cx<'_>, args: &Value) -> anyhow::Result<Outcome> {
    let db = cx.s.db.clone();
    let date = arg(args, "date");
    let Some(day) = parse_iso(date) else { bail!("Tanggal harus format YYYY-MM-DD.") };
    if day < util::day_of(util::now()) {
        bail!("Tanggal itu sudah lewat. Tanyakan tanggal lain.");
    }
    let (start, end) = (arg(args, "start"), arg(args, "end"));
    let (Some(s), Some(e)) = (minutes(start), minutes(end)) else { bail!("Jam harus format HH:MM, mis. 13:00.") };
    if s >= e {
        bail!("Jam selesai harus setelah jam mulai.");
    }
    if util::weekday(day) == 0 {
        bail!("Hari Minggu kampus tutup. Tawarkan hari lain.");
    }
    if start < OPEN || end > CLOSE {
        bail!("Ruang hanya bisa dipakai 07:00 sampai 17:00.");
    }
    let (start, end) = (fmt_min(s), fmt_min(e));
    let people = args["people"].as_i64().unwrap_or(1).max(1);
    let preferred = arg(args, "preferred_room").to_uppercase();

    let rooms: Vec<(String, i64, String, String)> =
        sqlx::query_as("SELECT code, capacity, facilities, kind FROM rooms ORDER BY capacity").fetch_all(&db).await?;
    let mut options = vec![];
    let mut shifted = None;
    let mut preferred_busy = false;
    for (code, cap, fac, kind) in &rooms {
        if *cap < people {
            continue;
        }
        let slots = busy(&db, code, date).await?;
        if !overlaps(&slots, &start, &end) {
            options.push(option(code, *cap, fac, kind, &start, &end, None));
        } else if *code == preferred {
            preferred_busy = true;
            // mulai tepat setelah jadwal yang bentrok selesai, durasi sama
            let from = slots.iter().filter(|(bs, be)| bs.as_str() < end.as_str() && start.as_str() < be.as_str()).filter_map(|(_, be)| minutes(be)).max();
            if let Some(ns) = from {
                let (ns_s, ne_s) = (fmt_min(ns), fmt_min(ns + e - s));
                if ne_s.as_str() <= CLOSE && !overlaps(&slots, &ns_s, &ne_s) {
                    shifted = Some(option(code, *cap, fac, kind, &ns_s, &ne_s, Some((ns - s) / 60)));
                }
            }
        }
    }
    if let Some(i) = options.iter().position(|o| o["code"] == preferred.as_str()) {
        let o = options.remove(i);
        options.insert(0, o);
    }
    options.truncate(if shifted.is_some() { 2 } else { 3 });
    options.extend(shifted);

    let purpose = arg(args, "purpose");
    create_request(
        cx,
        "REQ",
        "fasilitas",
        "Booking ruang",
        "needs_info",
        json!({ "date": date, "start": start, "end": end, "people": people, "purpose": purpose, "preferred": preferred, "options": options }),
    )
    .await?;
    let found = format!("{} ruang cocok", options.len());
    cx.audit("checkRoomAvailability", &if preferred_busy { format!("{preferred} bentrok, {found}") } else { found }).await?;

    if options.is_empty() {
        return Ok(Outcome::Done(json!({ "opsi": [], "catatan": "Tidak ada ruang kosong. Tawarkan jam atau hari lain." })));
    }
    let default = if preferred_busy { format!("{preferred} sudah dipakai di jam itu. Ini yang masih kosong:") } else { "Ini ruang yang masih kosong di jam itu:".into() };
    let mid = cx.say(Some(or(arg(args, "message"), &default)), Some(card("rooms", json!({ "date_label": day_label(day), "options": options })))).await?;
    Ok(Outcome::Pause(mid))
}

/// Mahasiswa memilih salah satu opsi ruang di card.
pub async fn pick(cx: &mut Cx<'_>, payload: &Value) -> anyhow::Result<Value> {
    let req = cx.req()?;
    let d = get_data(&cx.s.db, &req).await?;
    let code = arg(payload, "code");
    let Some(chosen) = d["options"].as_array().and_then(|o| o.iter().find(|x| x["code"] == code)).cloned() else {
        return Err(Nope("Ruang itu tidak ada di pilihan. Pilih salah satu opsi.".into()).into());
    };
    merge_data(&cx.s.db, &req, json!({ "chosen": chosen })).await?;
    Ok(json!({ "ruang": code, "mulai": chosen["start"], "selesai": chosen["end"], "langkah_berikutnya": "Panggil holdRoom sekarang untuk menahan ruang ini." }))
}

/// Tahan ruang yang dipilih 24 jam dan kirim ke staf untuk dikonfirmasi.
pub async fn hold_room(cx: &mut Cx<'_>, args: &Value) -> anyhow::Result<Outcome> {
    let db = cx.s.db.clone();
    let req = cx.req()?;
    let d = get_data(&db, &req).await?;
    let c = &d["chosen"];
    if c.is_null() {
        bail!("Mahasiswa belum memilih ruang. Tunggu pilihan dari findRooms.");
    }
    let (code, start, end, date) = (c["code"].as_str().unwrap_or(""), c["start"].as_str().unwrap_or(""), c["end"].as_str().unwrap_or(""), d["date"].as_str().unwrap_or(""));
    if overlaps(&busy(&db, code, date).await?, start, end) {
        bail!("Ruang {code} baru saja terisi. Jalankan findRooms lagi.");
    }
    let day = parse_iso(date).unwrap_or_default();
    let held_until = util::now() + 24 * 3600;
    let booking: i64 = sqlx::query_scalar(
        "INSERT INTO bookings (request_id, room, day, start, end, status, held_until, purpose) VALUES (?1, ?2, ?3, ?4, ?5, 'held', ?6, ?7) RETURNING id",
    )
    .bind(&req).bind(code).bind(date).bind(start).bind(end).bind(held_until).bind(d["purpose"].as_str().unwrap_or(""))
    .fetch_one(&db)
    .await?;

    let cap: i64 = sqlx::query_scalar("SELECT capacity FROM rooms WHERE code = ?1").bind(code).fetch_one(&db).await?;
    let people = d["people"].as_i64().unwrap_or(1);
    let time = format!("{}–{}", hm(start), hm(end));
    let saturday = util::weekday(day) == 6;
    let checks = [
        (true, "Tidak bentrok", format!("{code} kosong {time}")),
        (people <= cap, "Kapasitas cukup", format!("{people} dari {cap} kursi")),
        (!saturday, "Jam operasional", if saturday { "Sabtu butuh izin khusus".into() } else { format!("{} 07.00–17.00", HARI[util::weekday(day)]) }),
    ]
    .map(|(ok, label, note)| json!({ "ok": ok, "label": label, "note": note }));

    let first = cx.me.name.split(' ').next().unwrap_or("Mahasiswa").to_owned();
    let purpose = d["purpose"].as_str().filter(|p| !p.is_empty()).unwrap_or("kegiatan");
    let default_summary = format!("{first} booking {code} untuk {purpose}, {people} orang, {}, {time}. Ruang sudah ditahan 24 jam.", day_label(day));
    let summary = or(arg(args, "summary"), &default_summary).to_owned();
    merge_data(&db, &req, json!({ "booking_id": booking, "checks": checks, "held_until": held_until })).await?;
    sqlx::query("UPDATE requests SET status = 'pending_approval', summary = ?2, updated_at = unixepoch() WHERE id = ?1").bind(&req).bind(&summary).execute(&db).await?;
    cx.audit("holdRoom", &format!("{code} ditahan 24 jam")).await?;
    cx.audit("submitForApproval", "Masuk queue").await?;

    let until = format!("{} {}", HARI[util::weekday(util::day_of(held_until))], clock(held_until));
    let (dn, dd, mm) = day_parts(day);
    let data = json!({ "request_id": req, "code": code, "time": time, "dn": dn, "dd": dd, "mm": mm, "purpose": purpose, "people": people, "until": until });
    let msg = or(arg(args, "message"), &format!("{code} sudah aku tahan untukmu. Tinggal dikonfirmasi staf.")).to_owned();
    cx.say(Some(&msg), Some(card("held", data))).await?;
    cx.th.request_id = None;
    Ok(Outcome::Done(json!({ "status": "ditahan, menunggu konfirmasi staf", "lepas_otomatis": until })))
}

/* ---------- laporan kerusakan ---------- */

fn assignee_for(category: &str) -> &'static str {
    match category {
        "Proyektor" | "Jaringan" => "dimas",
        _ => "joko",
    }
}

/// Status permintaan mahasiswa mengikuti status laporan di board teknisi.
pub fn request_status(report_status: &str) -> &'static str {
    match report_status {
        "dikerjakan" | "eskalasi" => "processing",
        "selesai" => "done",
        _ => "submitted",
    }
}

pub async fn report_damage(cx: &mut Cx<'_>, args: &Value) -> anyhow::Result<Outcome> {
    let db = cx.s.db.clone();
    let room = arg(args, "room").to_uppercase();
    let title = arg(args, "title");
    let category = arg(args, "category");
    let urgency = match arg(args, "urgency") {
        u @ ("Rendah" | "Sedang" | "Tinggi") => u,
        _ => "Sedang",
    };
    if room.is_empty() || title.is_empty() {
        bail!("Ruang dan kerusakannya wajib jelas. Tanyakan ke mahasiswa dulu.");
    }
    if !CATEGORIES.contains(&category) {
        bail!("Kategori harus salah satu: {}.", CATEGORIES.join(", "));
    }

    let open: Option<(String, String, i64, String, String)> = sqlx::query_as(
        "SELECT id, title, reporters, assignee, status FROM reports WHERE room = ?1 AND category = ?2 AND status != 'selesai' ORDER BY created_at DESC LIMIT 1",
    )
    .bind(&room).bind(category)
    .fetch_optional(&db)
    .await?;

    let (id, report_title, reporters, assignee, status, merged) = match open {
        Some((id, t, n, a, st)) => {
            let already: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM requests WHERE student_id = ?1 AND json_extract(data, '$.report_id') = ?2")
                .bind(&cx.me.id).bind(&id)
                .fetch_one(&db)
                .await?;
            if already > 0 {
                cx.say(Some(&format!("Kamu sudah melaporkan ini ({id}). Teknisi sedang menanganinya, nanti aku kabari kalau selesai.")), None).await?;
                return Ok(Outcome::Done(json!({ "catatan": "mahasiswa sudah pernah melaporkan ini, tidak dihitung dua kali" })));
            }
            sqlx::query("UPDATE reports SET reporters = reporters + 1, updated_at = unixepoch() WHERE id = ?1").bind(&id).execute(&db).await?;
            (id, t, n + 1, a, st, true)
        }
        None => {
            let next: i64 = sqlx::query_scalar("SELECT COALESCE(MAX(CAST(substr(id, 4) AS INTEGER)), 586) + 1 FROM reports").fetch_one(&db).await?;
            let id = format!("LK-{next:04}");
            let a = assignee_for(category);
            sqlx::query("INSERT INTO reports (id, room, title, category, urgency, assignee) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
                .bind(&id).bind(&room).bind(title).bind(category).bind(urgency).bind(a)
                .execute(&db)
                .await?;
            (id, title.to_owned(), 1, a.to_owned(), "baru".to_owned(), false)
        }
    };

    create_request(cx, "REQ", "fasilitas", &format!("Lapor: {report_title}"), request_status(&status), json!({ "report_id": id })).await?;
    let (tech, area): (String, Option<String>) = sqlx::query_as("SELECT name, unit FROM users WHERE id = ?1").bind(&assignee).fetch_one(&db).await?;
    cx.audit(
        "reportDamage",
        &if merged { format!("{id} digabung, {reporters} pelapor, teknisi {tech}") } else { format!("{id} dibuat, ditugaskan ke {tech}") },
    )
    .await?;

    let initials: String = tech.split(' ').filter_map(|w| w.chars().next()).collect();
    let data = json!({
        "report_id": id, "room": room, "category": category, "urgency": urgency,
        "tech": tech, "initials": initials, "reporters": reporters, "merged": merged,
    });
    let default = if merged {
        "Sudah aku catat. Laporan yang sama sudah masuk sebelumnya, jadi laporanmu aku gabungkan."
    } else {
        "Sudah aku catat dan teruskan ke teknisi. Makasih laporannya."
    };
    cx.say(Some(or(arg(args, "message"), default)), Some(card("report", data))).await?;
    cx.th.request_id = None;
    Ok(Outcome::Done(json!({ "laporan": id, "digabung": merged, "pelapor": reporters, "teknisi": tech, "bidang": area })))
}

/* ---------- aksi langsung dari card (tanpa LLM) ---------- */

pub async fn cancel_booking(cx: &mut Cx<'_>, message_id: i64, payload: &Value) -> anyhow::Result<()> {
    let db = cx.s.db.clone();
    let req = arg(payload, "request_id");
    let row: Option<(String, String)> = sqlx::query_as("SELECT status, data FROM requests WHERE id = ?1 AND student_id = ?2")
        .bind(req).bind(&cx.me.id)
        .fetch_optional(&db)
        .await?;
    let Some((status, data)) = row.filter(|(s, _)| s == "pending_approval" || s == "approved") else {
        return Err(Nope("Booking ini sudah tidak bisa dibatalkan.".into()).into());
    };
    let d: Value = serde_json::from_str(&data)?;
    sqlx::query("UPDATE bookings SET status = 'cancelled' WHERE request_id = ?1").bind(req).execute(&db).await?;
    sqlx::query("UPDATE requests SET status = 'rejected', updated_at = unixepoch() WHERE id = ?1").bind(req).execute(&db).await?;
    merge_data(&db, req, json!({ "cancelled": true, "reject_reason": "Dibatalkan oleh mahasiswa" })).await?;
    cx.audit_as("mahasiswa", Some(req), "cancelBooking", if status == "approved" { "Booking terkonfirmasi dibatalkan" } else { "Booking dibatalkan sebelum dikonfirmasi" }).await?;
    cx.set_card_state(message_id, "cancelled").await?;
    let code = d["chosen"]["code"].as_str().unwrap_or("ruang");
    cx.say(Some(&format!("Booking {code} dibatalkan. Ruangnya sudah aku lepas.")), None).await?;
    Ok(())
}

pub async fn add_photo(cx: &mut Cx<'_>, payload: &Value) -> anyhow::Result<()> {
    let db = cx.s.db.clone();
    let (report, att) = (arg(payload, "report_id"), arg(payload, "attachment_id"));
    let req: Option<String> = sqlx::query_scalar("SELECT id FROM requests WHERE student_id = ?1 AND json_extract(data, '$.report_id') = ?2")
        .bind(&cx.me.id).bind(report)
        .fetch_optional(&db)
        .await?;
    let Some(req) = req else { return Err(Nope("Laporan tidak ditemukan.".into()).into()) };
    let linked = sqlx::query("UPDATE attachments SET request_id = ?1 WHERE id = ?2 AND owner_id = ?3 AND request_id IS NULL")
        .bind(&req).bind(att).bind(&cx.me.id)
        .execute(&db)
        .await?
        .rows_affected();
    if linked == 0 {
        return Err(Nope("Foto tidak ditemukan. Coba upload lagi.".into()).into());
    }
    sqlx::query("UPDATE reports SET photo = COALESCE(photo, ?2), updated_at = unixepoch() WHERE id = ?1").bind(report).bind(att).execute(&db).await?;
    cx.audit_as("mahasiswa", Some(&req), "addPhoto", "Foto kerusakan ditambahkan").await?;
    Ok(())
}
