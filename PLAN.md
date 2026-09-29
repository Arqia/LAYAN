# LAYAN · Rencana MVP (7 hari, solo)

Digital campus worker: mahasiswa minta layanan lewat chat, agent AI mengerjakan
langkah repetitif, staf hanya memutuskan, teknisi mengerjakan laporan.

## Keputusan

| Bagian | Pilihan |
|---|---|
| Backend | Rust: Axum + SQLx + SQLite, satu binary |
| Kontrak | OpenAPI dari Rust (`utoipa`), client TS dan Kotlin di-generate |
| PWA | Next.js (frontend saja): mahasiswa, staf, teknisi |
| Android | Kotlin + Jetpack Compose: alur mahasiswa |
| LLM | Client format OpenAI. Provider: `mock` → `gemini` → `deepseek` lewat config |
| Data | Seed tiruan mirip SIAKAD |
| Login | NIM/email + password (argon2), token sesi di SQLite. Web: cookie (via proxy `/api`). Android: Bearer |

## Struktur

```
layan/
├─ api/       Rust
├─ web/       Next.js PWA (kode yang sekarang di root dipindah ke sini)
├─ android/   Kotlin + Compose
└─ openapi.json
```

## Prinsip agent

1. Syarat (UKT, status aktif, bentrok ruang) dicek kode, bukan LLM.
2. LLM hanya: pahami pesan, pilih tool, ekstrak field, jawab dengan sitasi.
3. Output agent = action card JSON (10 jenis dari desain). Client render native.
4. Semua tool call masuk audit log → timeline staf + metrik dampak.
5. Agent tidak bisa approve. Keputusan akhir di staf.
6. Data ke LLM seminimal mungkin (NIM, status UKT tidak dikirim mentah).

## Jadwal

| Hari | Target | Selesai kalau |
|---|---|---|
| 1 | git init, pindah Next.js ke `web/`, API dasar: skema, seed, login, OpenAPI | Login dari PWA berhasil |
| 2 | Agent loop + provider `mock` + worker Surat + SSE | Alur surat jalan di PWA sampai "Menunggu persetujuan" |
| 3 | Staff Console ke API, PDF surat, Helpdesk (FTS5 + tiket), ganti ke Gemini | Approve di console → surat selesai di chat |
| 4 | Fasilitas (booking + gabung laporan), Board ke API, PWA installable, metrik dampak | 3 worker jalan, PWA bisa di-install |
| 5–6 | Android: login, chat, card Surat, riwayat | Alur surat jalan di HP |
| 7 | Deploy home server, skrip demo, cadangan | Demo lancar end-to-end |

Cadangan kalau hari 5–6 meleset: Android sebagai TWA dari PWA.

## Jalankan lokal

```bash
cd api && cp .env.example .env && cargo run    # API di :8080, seed akun demo otomatis
npm --prefix web run dev                        # PWA di :3000, /api di-proxy ke Rust
```

Akun demo: NIM/email ada di `api/src/seed.rs`, password di `api/.env.example`.

Catatan Windows: laptop ini tidak punya MSVC Build Tools, jadi `api/` memakai
`rustup override` ke `stable-x86_64-pc-windows-gnu` + linker bawaan rustup
(`api/.cargo/config.toml`). Server Linux tidak terpengaruh.

## Progres

- [x] Hari 1: git init, Next.js pindah ke `web/`, API Rust (skema, seed, login cookie + Bearer, OpenAPI), halaman login, proxy per peran
- [ ] Hari 2

## Di luar MVP

Push notification · sinkronisasi offline · uji DeepSeek · vector search · editor draft staf · iOS · SSO.

## Tugas pemilik proyek

- [ ] API key Gemini dari https://aistudio.google.com/apikey (dibutuhkan hari 3)
- [ ] Rust terpasang di laptop ini (`rustup`), dibutuhkan hari 1
- [ ] Android Studio + SDK platform terpasang, dibutuhkan hari 5
