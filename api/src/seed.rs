use anyhow::Context;
use argon2::password_hash::{rand_core::OsRng, SaltString};
use argon2::{Argon2, PasswordHasher};
use sqlx::SqlitePool;

// (id, role, nama, email, nim, prodi, unit, semester, ukt_paid_at). Semua data tiruan.
type Row = (&'static str, &'static str, &'static str, &'static str, Option<&'static str>, Option<&'static str>, Option<&'static str>, Option<i64>, Option<&'static str>);

const USERS: &[Row] = &[
    ("raka", "mahasiswa", "Raka Pratama", "raka@mhs.layan.test", Some("245150200111001"), Some("Teknik Informatika"), None, Some(3), Some("2026-08-14")),
    ("nadia", "mahasiswa", "Nadia Putri", "nadia@mhs.layan.test", Some("245150300111002"), Some("Teknik Komputer"), None, Some(3), Some("2026-08-09")),
    ("bima", "mahasiswa", "Bima Saputra", "bima@mhs.layan.test", Some("235150400111003"), Some("Sistem Informasi"), None, Some(5), None),
    ("sari", "staf", "Ibu Sari", "sari@staf.layan.test", None, None, Some("Layanan Akademik"), None, None),
    ("joko", "teknisi", "Pak Joko", "joko@staf.layan.test", None, None, Some("Listrik / AC"), None, None),
    ("dimas", "teknisi", "Mas Dimas", "dimas@staf.layan.test", None, None, Some("Jaringan / Proyektor"), None, None),
];

/// Isi akun demo dan laporan awal board teknisi, masing-masing sekali saat tabelnya kosong.
pub async fn run(db: &SqlitePool) -> anyhow::Result<()> {
    users(db).await?;
    reports(db).await
}

// (id, status, ruang, judul, kategori, urgensi, pelapor, hari lalu, jam, teknisi)
const REPORTS: &[(&str, &str, &str, &str, &str, &str, i64, i64, &str, &str)] = &[
    ("LK-0587", "baru", "F2.3", "AC mati, ruangan panas", "AC", "Sedang", 3, 0, "08:40", "joko"),
    ("LK-0591", "baru", "G1.2", "Proyektor tidak menyala, ada kuliah jam 10", "Proyektor", "Tinggi", 1, 0, "09:05", "dimas"),
    ("LK-0584", "baru", "F3.1", "Wi-Fi putus-putus di barisan belakang", "Jaringan", "Sedang", 5, 0, "08:15", "dimas"),
    ("LK-0589", "baru", "F3.1", "Dua lampu depan berkedip", "Listrik", "Rendah", 1, 0, "08:52", "joko"),
    ("LK-0580", "baru", "G2-WC", "Wastafel mampet", "Kebersihan", "Rendah", 1, 0, "07:50", "dimas"),
    ("LK-0571", "dikerjakan", "G2.4", "Stopkontak meja rapat berasap", "Listrik", "Tinggi", 2, 1, "15:10", "joko"),
    ("LK-0569", "dikerjakan", "F2.3", "Kabel HDMI longgar, layar kedip", "Proyektor", "Rendah", 1, 1, "13:30", "dimas"),
    ("LK-0552", "selesai", "F3.1", "AC bocor air ke lantai", "AC", "Sedang", 4, 2, "10:00", "joko"),
    ("LK-0549", "selesai", "G1.2", "Kursi dosen patah", "Lainnya", "Rendah", 1, 2, "09:20", "dimas"),
];

async fn reports(db: &SqlitePool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM reports").fetch_one(db).await?;
    if count > 0 {
        return Ok(());
    }
    let today = crate::util::today_start();
    for &(id, status, room, title, cat, urg, n, days_ago, at, tech) in REPORTS {
        let (h, m) = at.split_once(':').unwrap_or(("8", "0"));
        let t = today - days_ago * 86_400 + h.parse::<i64>()? * 3600 + m.parse::<i64>()? * 60;
        sqlx::query(
            "INSERT INTO reports (id, room, title, category, urgency, status, assignee, reporters, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        )
        .bind(id).bind(room).bind(title).bind(cat).bind(urg).bind(status).bind(tech).bind(n).bind(t)
        .execute(db)
        .await?;
    }
    println!("seed: {} laporan kerusakan dibuat", REPORTS.len());
    Ok(())
}

async fn users(db: &SqlitePool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users").fetch_one(db).await?;
    if count > 0 {
        return Ok(());
    }
    let password = std::env::var("SEED_PASSWORD").context("SEED_PASSWORD belum di-set. Salin .env.example ke .env")?;
    for &(id, role, name, email, nim, prodi, unit, semester, ukt) in USERS {
        let hash = Argon2::default()
            .hash_password(password.as_bytes(), &SaltString::generate(&mut OsRng))
            .map_err(|e| anyhow::anyhow!("hash gagal: {e}"))?
            .to_string();
        sqlx::query(
            "INSERT INTO users (id, role, name, email, nim, prodi, unit, semester, ukt_paid_at, password_hash) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        )
        .bind(id).bind(role).bind(name).bind(email).bind(nim).bind(prodi).bind(unit).bind(semester).bind(ukt).bind(hash)
        .execute(db)
        .await?;
    }
    println!("seed: {} akun demo dibuat", USERS.len());
    Ok(())
}
