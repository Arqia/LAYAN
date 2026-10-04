-- Status "eskalasi": sarana rusak berat (perlu penggantian/pengadaan), alasan teknisi di kolom note.
-- SQLite tidak bisa mengubah CHECK, jadi tabel reports dibangun ulang seperti 0008.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE reports_bak AS SELECT * FROM reports;
DROP TABLE reports;
CREATE TABLE reports (
  id         TEXT PRIMARY KEY,             -- LK-0587
  room       TEXT NOT NULL,
  title      TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('Listrik', 'AC', 'Proyektor', 'Jaringan', 'Kebersihan', 'Lainnya')),
  urgency    TEXT NOT NULL CHECK (urgency IN ('Rendah', 'Sedang', 'Tinggi')),
  status     TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dikerjakan', 'eskalasi', 'selesai')),
  assignee   TEXT NOT NULL REFERENCES users(id),
  reporters  INTEGER NOT NULL DEFAULT 1,  -- termasuk pelapor di luar aplikasi (loket, telepon)
  photo      TEXT REFERENCES attachments(id),
  note       TEXT,                         -- alasan eskalasi
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT INTO reports (id, room, title, category, urgency, status, assignee, reporters, photo, created_at, updated_at)
  SELECT id, room, title, category, urgency, status, assignee, reporters, photo, created_at, updated_at FROM reports_bak;
DROP TABLE reports_bak;
