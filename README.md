# LAYAN

Digital campus worker. Mahasiswa mengurus layanan kampus lewat satu loket chat,
agent AI mengerjakan langkah yang repetitif (cek syarat, isi draft, cari ruang kosong,
gabung laporan dobel), staf cukup memutuskan, dan teknisi mengerjakan laporan.

Demo: https://layan.codewithus.me

## Tiga worker

| Worker | Yang dikerjakan agent | Yang tetap di manusia |
|---|---|---|
| **Surat** | ambil profil, minta data dan bukti kegiatan, cek syarat (status aktif, UKT, lampiran), susun draft dari template | staf approve/reject, nomor surat terbit otomatis |
| **Helpdesk** | cari di Pedoman Akademik, jawab dengan sumber, buat tiket kalau tidak yakin | unit membalas tiket |
| **Fasilitas** | cek bentrok dan kapasitas ruang, tawarkan jam alternatif, tahan 24 jam; laporan kerusakan dobel digabung dan langsung ke teknisi | staf konfirmasi booking, teknisi mengerjakan laporan |

Setiap aksi agent dan manusia tercatat di audit log. Dari situ Staff Console menghitung
berapa permintaan selesai tanpa staf dan perkiraan waktu staf yang dihemat.

## Struktur

```
api/       Rust (Axum + SQLx + SQLite): auth, data, agent loop + tools, SSE
web/       Next.js PWA: loket mahasiswa, Staff Console, Board Teknisi
android/   Kotlin + Jetpack Compose: app mahasiswa
deploy/    systemd unit + skrip deploy ke home server (Cloudflare Tunnel)
```

Agent memakai LLM format chat completions (Gemini, DeepSeek, dll). Tanpa API key, agent
tiruan berbasis aturan mengambil alih, dan juga jadi cadangan kalau LLM error atau diam.

## Menjalankan lokal

```bash
cd api && cp .env.example .env && cargo run            # API :8080, akun demo dibuat otomatis
npm --prefix web install && npm --prefix web run dev   # PWA :3000, /api diteruskan ke Rust
```

Akun demo: NIM/email di `api/src/seed.rs`, password lokal di `api/.env.example`.

## Android

Buka folder `android/` di Android Studio, atau:

```bash
cd android && ./gradlew assembleDebug
```

APK ada di `android/app/build/outputs/apk/debug/`. Alamat API diatur di `android/gradle.properties` (`layan.apiBase`).

Rencana dan progres: [PLAN.md](PLAN.md). Isi Pedoman Akademik di knowledge base adalah contoh, bukan dokumen resmi.
