-- Worker Fasilitas: booking ruang dan laporan kerusakan. Semua data ruang adalah contoh.
CREATE TABLE rooms (
  code       TEXT PRIMARY KEY,
  capacity   INTEGER NOT NULL,
  facilities TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'kelas'   -- kelas | rapat
);
INSERT INTO rooms (code, capacity, facilities, kind) VALUES
('F2.3', 40, 'Proyektor, AC', 'kelas'),
('F3.1', 60, 'Proyektor, AC, sound system', 'kelas'),
('G1.2', 30, 'Proyektor, AC, whiteboard', 'kelas'),
('G2.4', 25, 'TV, AC', 'rapat');

CREATE TABLE bookings (
  id          INTEGER PRIMARY KEY,
  request_id  TEXT REFERENCES requests(id),
  room        TEXT NOT NULL REFERENCES rooms(code),
  day         TEXT NOT NULL,   -- 2026-10-02
  start       TEXT NOT NULL,   -- 13:00
  end         TEXT NOT NULL,   -- 15:00
  status      TEXT NOT NULL CHECK (status IN ('held', 'confirmed', 'cancelled', 'released')),
  held_until  INTEGER,
  purpose     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX bookings_slot ON bookings(room, day);

-- Jadwal yang sudah terisi, supaya cek bentrok punya data.
INSERT INTO bookings (room, day, start, end, status, purpose) VALUES
('G2.4', '2026-10-02', '13:00', '15:00', 'confirmed', 'Rapat dosen'),
('F3.1', '2026-10-02', '08:00', '12:00', 'confirmed', 'Kuliah umum'),
('G1.2', '2026-10-05', '10:00', '12:00', 'confirmed', 'Praktikum');

-- Satu laporan kerusakan bisa punya banyak pelapor (laporan dobel digabung agent).
CREATE TABLE reports (
  id         TEXT PRIMARY KEY,             -- LK-0587
  room       TEXT NOT NULL,
  title      TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('Listrik', 'AC', 'Proyektor', 'Jaringan', 'Kebersihan', 'Lainnya')),
  urgency    TEXT NOT NULL CHECK (urgency IN ('Rendah', 'Sedang', 'Tinggi')),
  status     TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dikerjakan', 'selesai')),
  assignee   TEXT NOT NULL REFERENCES users(id),
  reporters  INTEGER NOT NULL DEFAULT 1,  -- termasuk pelapor di luar aplikasi (loket, telepon)
  photo      TEXT REFERENCES attachments(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
