-- Peran admin (tim pemantau) dan log akses ber-IP untuk halaman /admin.
-- SQLite tidak bisa mengubah CHECK, jadi tabel users dibangun ulang. sqlx menjalankan migrasi di dalam transaksi
-- dengan foreign_keys ON, jadi: salin ke users_bak, DROP users (pelanggaran FK ditunda, tabel lain tetap merujuk
-- "users"), buat ulang, lalu isi kembali dengan id yang sama sehingga pelanggaran tertunda hilang sebelum commit.
-- Catatan: DROP ikut menghapus sesi (ON DELETE CASCADE), semua pengguna perlu login ulang.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE users_bak AS SELECT * FROM users;
DROP TABLE users;
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('mahasiswa', 'staf', 'teknisi', 'admin')),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nim           TEXT UNIQUE,
  prodi         TEXT,
  unit          TEXT,            -- staf: unit kerja, teknisi: bidang
  semester      INTEGER,
  ukt_paid_at   TEXT,            -- NULL = UKT semester ini belum lunas
  password_hash TEXT NOT NULL,
  ipk           REAL
);
INSERT INTO users SELECT id, role, name, email, nim, prodi, unit, semester, ukt_paid_at, password_hash, ipk FROM users_bak;
DROP TABLE users_bak;

CREATE TABLE access_log (
  id      INTEGER PRIMARY KEY,
  at      INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id TEXT REFERENCES users(id),   -- NULL untuk login gagal
  ip      TEXT NOT NULL,
  action  TEXT NOT NULL,               -- login | login_gagal | chat | aksi | upload
  detail  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX access_log_at ON access_log(at);
