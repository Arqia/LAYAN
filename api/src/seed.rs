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

/// Isi akun demo sekali, saat tabel users masih kosong.
pub async fn run(db: &SqlitePool) -> anyhow::Result<()> {
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
