# LAYAN

Digital campus worker. Mahasiswa mengurus layanan kampus lewat satu loket chat,
agent mengerjakan langkah yang repetitif (cek syarat, isi draft, cari jadwal ruang,
gabung laporan dobel), staf cukup memutuskan, dan teknisi mengerjakan laporan.

Tiga worker:

- **Surat**: surat aktif kuliah, surat dispensasi
- **Helpdesk**: aturan akademik dengan sumber, tiket ke unit
- **Fasilitas**: booking ruang, laporan kerusakan

## Struktur

```
api/   Rust (Axum + SQLx + SQLite): auth, data, agent
web/   Next.js PWA: mahasiswa, Staff Console, Board Teknisi
```

## Menjalankan

```bash
cd api && cp .env.example .env && cargo run    # API di :8080, akun demo dibuat otomatis
npm --prefix web install && npm --prefix web run dev   # PWA di :3000
```

Akun demo: NIM/email di `api/src/seed.rs`, password di `api/.env.example`.

Rencana dan progres: [PLAN.md](PLAN.md).
