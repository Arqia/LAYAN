-- Permintaan layanan yang dikerjakan agent (surat, tiket, booking).
CREATE TABLE requests (
  id         TEXT PRIMARY KEY,          -- REQ-2026-0931, TKT-2026-0318
  student_id TEXT NOT NULL REFERENCES users(id),
  worker     TEXT NOT NULL CHECK (worker IN ('surat', 'helpdesk', 'fasilitas')),
  title      TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('submitted', 'processing', 'needs_info', 'pending_approval', 'approved', 'rejected', 'done')),
  summary    TEXT NOT NULL DEFAULT '',  -- ringkasan dari agent untuk staf
  data       TEXT NOT NULL DEFAULT '{}',-- JSON: detail kegiatan, cek syarat, draft, nomor surat
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX requests_student ON requests(student_id);
CREATE INDEX requests_status ON requests(status);

-- Semua aksi agent dan staf. Sumber timeline di Staff Console dan metrik dampak.
CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  request_id TEXT REFERENCES requests(id),   -- NULL sampai permintaannya terbentuk
  at         INTEGER NOT NULL DEFAULT (unixepoch()),
  actor      TEXT NOT NULL,                  -- agent | staf | mahasiswa
  tool       TEXT NOT NULL,
  result     TEXT NOT NULL
);
CREATE INDEX audit_request ON audit_log(request_id);

-- Tampilan chat (bubble + action card), terpisah dari transcript LLM.
CREATE TABLE chat_messages (
  id         INTEGER PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  sender     TEXT NOT NULL CHECK (sender IN ('user', 'agent')),
  text       TEXT,
  file       TEXT,   -- JSON {name, size}
  card       TEXT,   -- JSON {kind, state, data}
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX chat_student ON chat_messages(student_id);

-- Transcript LLM per mahasiswa (format chat completions).
CREATE TABLE threads (
  student_id TEXT PRIMARY KEY REFERENCES users(id),
  transcript TEXT NOT NULL DEFAULT '[]',
  pending    TEXT,   -- JSON {call_id, tool, message_id} saat agent menunggu isian card
  request_id TEXT
);

CREATE TABLE attachments (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id),
  request_id TEXT REFERENCES requests(id),
  name       TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  path       TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Knowledge base helpdesk. Isi di bawah adalah CONTOH, bukan pedoman resmi kampus mana pun.
-- `headline` hanya dipakai provider mock.
CREATE VIRTUAL TABLE kb USING fts5(title, section, body, headline UNINDEXED, tokenize = 'unicode61 remove_diacritics 2');
INSERT INTO kb (title, section, body, headline) VALUES
('Beban studi', 'Bab Beban Studi · Pasal (placeholder)',
 'Beban studi maksimal per semester ditentukan oleh IP semester sebelumnya. IP kurang dari 2,00 boleh mengambil hingga 18 SKS. IP 2,00 sampai 2,99 boleh mengambil hingga 20 SKS. IP 3,00 sampai 3,49 boleh mengambil hingga 22 SKS. Mulai IP 3,50 bisa sampai 24 SKS. Batas SKS ini berlaku saat pengisian KRS.',
 'Maksimal 18 sampai 24 SKS, tergantung IP'),
('Cuti akademik', 'Bab Status Mahasiswa · Pasal (placeholder)',
 'Mahasiswa dapat mengajukan cuti akademik paling banyak 2 semester selama masa studi dan tidak boleh berturut-turut. Cuti diajukan sebelum masa pengisian KRS dengan persetujuan dosen wali. Semester cuti tidak dihitung dalam batas masa studi.',
 'Maksimal 2 semester, tidak berturut-turut'),
('Perbaikan nilai', 'Bab Penilaian · Pasal (placeholder)',
 'Perbaikan nilai dilakukan dengan mengulang mata kuliah pada semester berikutnya saat mata kuliah itu ditawarkan. Nilai yang dipakai dalam transkrip adalah nilai terbaik dari semua pengambilan. Mengulang mata kuliah dihitung dalam beban SKS semester berjalan.',
 'Ulang mata kuliahnya, nilai terbaik yang dipakai'),
('Konversi prestasi', 'Bab Kegiatan Kemahasiswaan · Pasal (placeholder)',
 'Prestasi kompetisi tingkat nasional atau internasional dapat dikonversi menjadi SKS kegiatan kemahasiswaan. Besaran SKS dan mata kuliah yang dapat dikonversi ditetapkan oleh program studi masing-masing.',
 'Bisa, besaran SKS ditetapkan prodi'),
('Dispensasi perkuliahan', 'Bab Kehadiran · Pasal (placeholder)',
 'Mahasiswa yang mengikuti kegiatan resmi mewakili kampus, seperti lomba atau konferensi, dapat memperoleh surat dispensasi. Ketidakhadiran dengan surat dispensasi tidak dihitung sebagai absen, paling banyak 3 pertemuan per mata kuliah dalam satu semester. Surat diajukan paling lambat sebelum kegiatan dimulai dengan melampirkan bukti kegiatan.',
 'Bisa, paling banyak 3 pertemuan per mata kuliah'),
('Masa studi', 'Bab Masa Studi · Pasal (placeholder)',
 'Masa studi program sarjana terapan paling lama 7 tahun atau 14 semester, tidak termasuk semester cuti akademik. Mahasiswa yang melewati batas masa studi dinyatakan tidak dapat melanjutkan studi.',
 'Paling lama 7 tahun'),
('Pengisian KRS', 'Bab Registrasi · Pasal (placeholder)',
 'Pengisian KRS dilakukan pada minggu sebelum perkuliahan dimulai sesuai kalender akademik. Perubahan KRS dapat dilakukan paling lambat minggu kedua perkuliahan dengan persetujuan dosen wali. KRS hanya bisa diisi jika UKT semester berjalan sudah lunas.',
 'Minggu sebelum kuliah, ubah paling lambat minggu kedua');
