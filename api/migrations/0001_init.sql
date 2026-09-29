CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('mahasiswa', 'staf', 'teknisi')),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nim           TEXT UNIQUE,
  prodi         TEXT,
  unit          TEXT,            -- staf: unit kerja, teknisi: bidang
  semester      INTEGER,
  ukt_paid_at   TEXT,            -- NULL = UKT semester ini belum lunas
  password_hash TEXT NOT NULL
);

CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL
);
