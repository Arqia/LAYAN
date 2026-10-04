-- Status "cancelled": permintaan dibatalkan mahasiswa sebelum selesai.
-- SQLite tidak bisa mengubah CHECK, jadi tabel requests dibangun ulang seperti
-- 0007 (foreign_keys ON, pelanggaran ditunda). Index dibuat ulang karena DROP menghapusnya.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE requests_bak AS SELECT * FROM requests;
DROP TABLE requests;
CREATE TABLE requests (
  id         TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  worker     TEXT NOT NULL CHECK (worker IN ('surat', 'helpdesk', 'fasilitas')),
  title      TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('submitted', 'processing', 'needs_info', 'pending_approval', 'approved', 'rejected', 'done', 'cancelled')),
  summary    TEXT NOT NULL DEFAULT '',
  data       TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT INTO requests SELECT id, student_id, worker, title, status, summary, data, created_at, updated_at FROM requests_bak;
DROP TABLE requests_bak;
CREATE INDEX requests_student ON requests(student_id);
CREATE INDEX requests_status ON requests(status);
