# Tugas Arqia (Farrel): Staff Console `/staf` dan Board Teknisi `/teknisi`

Prioritas: **Tinggi**. Aturan wajib: [`AGENTS.md`](../../AGENTS.md). Branch: `farrel/staf-teknisi`.

## Wilayah file

Boleh diubah:
- `web/app/staf/**`, `web/app/teknisi/**` (termasuk halaman baru `web/app/staf/metrik/`, `web/app/teknisi/rekap/`)
- `web/components/layan/staff-console.tsx`, `web/components/layan/board.tsx`
- Komponen baru khusus tugas ini di `web/components/layan/` (misal `staff-metrics.tsx`, `board-recap.tsx`)
- `web/lib/data.ts`: **hanya** tipe `Report`/`ReportStatus` dan menambah field yang sudah tertulis di `docs/API.md`

Jangan diubah: landing dan halaman publik (wilayah Boas), `chat.tsx`, `action-cards.tsx`, `history.tsx`, `api/`, `globals.css`.

## Kondisi sekarang (sudah dicek di kode)

- `/staf` ([staff-console.tsx](../../web/components/layan/staff-console.tsx)) dikunci `min-w-[1280px]`, jadi tidak bisa dipakai di tablet/HP.
  Di atasnya ada 6 kartu metrik. Antrean ada di kiri (tab Semua/Surat/Tiket/Booking), detail di kanan.
- Tombol "Edit draft" / "Ubah jadwal" hanya memunculkan toast "Belum tersedia". Label aksi masih campur bahasa ("Approve", "Reject", "Balas").
- `/teknisi` ([board.tsx](../../web/components/layan/board.tsx)) punya Kanban 3 kolom drag & drop (desktop) dan daftar "Tugas saya" (HP).
  Header versi HP belum punya `ThemeToggle`.
- Data: `GET /api/staff/queue`, `GET /api/staff/metrics`, `POST /api/staff/requests/{id}/decide`, `POST .../undo`,
  `GET /api/reports`, `POST /api/reports/{id}/status`.

## A. `/staf`: rapikan isi dan buat lebih intuitif (±4 jam)

1. **Hapus baris 6 metrik** dari `/staf`. Metrik pindah ke halaman B.
2. Di `TopBar`, tambahkan navigasi dua tab **Antrean** (`/staf`) dan **Metrik** (`/staf/metrik`), dengan tab aktif yang jelas.
3. **Antrean:**
   - Urut dari yang paling lama menunggu.
   - Tiap item menampilkan jenis, nama, prodi, dan lama menunggu.
   - Badge jumlah di tiap tab.
   - Item yang sedang dibuka terlihat jelas aktif.
   - Kolom cari nama/NIM (filter di klien saja).
4. **Detail:** aksi utama selalu terlihat (sticky), urutannya Tolak (`destructive-outline`) lalu **Setujui** / **Balas** (`default`).
   Ganti label "Approve" menjadi **Setujui** dan "Reject" menjadi **Tolak**.
   Sembunyikan tombol yang belum berfungsi ("Edit draft", "Ubah jadwal"). Jangan dibiarkan memunculkan toast "Belum tersedia".
5. **Responsif:**
   - Buang `min-w-[1280px]`.
   - ≥1024px: dua kolom.
   - <1024px: daftar antrean dulu, ketuk item untuk membuka detail dengan tombol kembali.
6. Pertahankan yang sudah jalan: dialog alasan tolak (alasan wajib), toast **Batalkan** (undo), skeleton loading, kondisi kosong, pesan error.

## B. Halaman baru `/staf/metrik`: semua metrik dalam chart (±4 jam)

1. **Kartu ringkasan** (6 angka yang dipindah dari `/staf`): permintaan hari ini, rata-rata waktu proses, selesai otomatis,
   waktu staf dihemat, token AI per permintaan, menunggu persetujuan.
2. **Chart dengan data yang sudah ada** dari `GET /api/staff/metrics` (`by`, `auto`, `handled`, `auto_pct`, `tokens`):
   - Bar per jenis: surat, tiket, booking, laporan, jawaban.
   - Proporsi selesai otomatis vs diteruskan ke staf.
3. **Chart tren harian 30 hari**: tunggu endpoint `GET /api/staff/metrics/daily` (lihat bagian "API dari Arva").
   Sebelum endpoint itu ada di `docs/API.md`, tampilkan kondisi kosong "Data harian belum tersedia". **Jangan** pakai angka palsu.
4. Aturan chart:
   - SVG/HTML biasa, **tanpa library baru**.
   - Warna hanya dari token (`var(--worker-surat)` dan seterusnya).
   - Tiap chart punya judul dan angka yang terbaca tanpa hover.
   - Sertakan tabel `sr-only` untuk pembaca layar.
   - Jalan di mode gelap.

## C. `/teknisi`: tombol Terima, Eskalasi, dan perbaikan isi (±4 jam)

Alur status baru:

```
baru --[Terima]--> dikerjakan --[Tandai selesai]--> selesai
                        |
                        +--[Eskalasi + alasan]--> eskalasi --[Tandai selesai]--> selesai
```

1. Kartu `baru` punya tombol **Terima** (status menjadi `dikerjakan`). Endpoint ini **sudah ada**, jadi bisa dikerjakan sekarang.
2. Kartu `dikerjakan` punya tombol **Tandai selesai** dan **Eskalasi**.
   - Eskalasi dipakai kalau sarana benar-benar rusak (perlu penggantian/pengadaan, di luar kemampuan teknisi).
   - Eskalasi membuka dialog dengan alasan wajib (minimal 10 huruf).
3. Kolom Kanban menjadi 4: **Baru**, **Dikerjakan**, **Eskalasi**, **Selesai**.
   - Warna eskalasi pakai `bg-destructive-soft text-destructive`.
   - Drag & drop hanya mengizinkan perpindahan yang sesuai alur di atas. Perpindahan lain ditolak dengan toast.
4. Versi HP: tombol yang sama di tiap kartu, dan `ThemeToggle` di header.
5. Navigasi di `TopBar`: **Board** (`/teknisi`) dan **Rekap bulanan** (`/teknisi/rekap`).

## D. Halaman baru `/teknisi/rekap`: laporan bulanan (±3 jam)

1. Pemilih bulan, default bulan ini.
2. Ringkasan: jumlah laporan, selesai, eskalasi, dan masih terbuka.
3. Tabel per ruang: ruang (`font-mono`), barang/judul, kategori, urgensi, jumlah pelapor, status, tanggal masuk, alasan eskalasi.
   Bisa dikelompokkan per ruang.
4. Tombol **Simpan PDF** dengan `window.print()`. Contoh pola cetak ada di `/surat/[id]` dan `@media print` di `globals.css`.
5. Opsional: tombol **Unduh CSV** (`Blob` + `URL.createObjectURL`, tanpa library).
6. Data dari `GET /api/reports`, difilter per bulan di klien memakai `created_at`. Tunggu field itu (lihat bagian API).

## API dari Arva (jangan dibuat sendiri)

Bagian C2–C3, D, dan B3 bergantung pada perubahan API berikut. Mulai pakai setelah tercatat di `docs/API.md`:

| Perubahan | Isi |
|---|---|
| `POST /api/reports/{id}/status` | `status` menerima `eskalasi`, body tambahan `note` (wajib saat eskalasi). Transisi di luar alur ditolak 400 |
| `GET /api/reports` | field baru `created_at`, `updated_at` (detik unix), `note` (string atau null) |
| `GET /api/staff/metrics/daily?days=30` | `[{date: "YYYY-MM-DD", total, auto, surat, tiket, booking, laporan}]` |

Urutan kerja yang disarankan: A → C1 → B1–B2 → (API siap) → C2–C5 → D → B3.

## Kriteria selesai

- [ ] Semua poin A–D sesuai, label tombol persis: Terima, Tandai selesai, Eskalasi, Setujui, Tolak, Balas, Rekap bulanan.
      (Boas menulis tutorial memakai label ini.)
- [ ] Tidak ada warna/hex di luar token, tidak ada dependency baru.
- [ ] `npm run lint` dan `npm run build` lulus.
- [ ] Dicek terang + gelap, 375px + 1440px, akun staf dan akun teknisi.
- [ ] PR kecil per bagian (A, B, C, D) lebih disukai daripada satu PR raksasa.
