# Kontrak API LAYAN

Sumber kebenaran: kode di `api/src/` (route di `api/src/main.rs`). Spesifikasi OpenAPI otomatis ada di `GET /api/openapi.json`,
tapi baru mencakup sebagian request body. Dokumen ini yang dipakai PWA (`web/`) dan App Android (`android/`).
Client TS ada di `web/lib/api.ts`, client Kotlin di `android/.../data/Api.kt`, keduanya ditulis tangan.

**Perubahan kontrak** (nama field, endpoint, arti status) harus lewat PR yang menyentuh `api/` **dan** dokumen ini.

## Autentikasi

| Klien | Cara |
|---|---|
| PWA | Cookie `layan_session` (HttpOnly). Browser memanggil `/api/*` di domain yang sama, Next.js meneruskan ke Rust (`next.config.ts` rewrites). |
| Android | `Authorization: Bearer <token>` dari respons login. |

Error selalu `{ "error": "pesan siap tampil ke pengguna" }` dengan status 4xx/5xx.

## Endpoint

| Method | Path | Peran | Isi |
|---|---|---|---|
| GET | `/api/health` | publik | `"ok"` |
| GET | `/api/openapi.json` | publik | spesifikasi OpenAPI |
| POST | `/api/auth/login` | publik | body `{identifier, password}` (NIM atau email) → `{token, user}` |
| POST | `/api/auth/logout` | login | 204, cookie dihapus |
| GET | `/api/me` | login | `User` = `{id, role, name, email, nim, prodi, unit}`; `role` = `mahasiswa` \| `staf` \| `teknisi` |
| GET | `/api/chat` | mahasiswa | riwayat pesan: `ChatMessage[]` |
| POST | `/api/chat` | mahasiswa | body `{text}` (maks 2000 huruf) → **stream SSE** |
| POST | `/api/chat/action` | mahasiswa | body `{message_id, action, payload}`; `action` = `submit` \| `upload` \| `ticket` → **stream SSE** |
| POST | `/api/attachments` | mahasiswa | multipart, satu file PDF/JPG/PNG ≤ 5 MB → `{id, name, size}` |
| GET | `/api/attachments/{id}` | pemilik, staf, teknisi | isi file |
| GET | `/api/requests` | mahasiswa | riwayat permintaan: `[{id, worker, kind, title, status, time, meta, active}]` |
| GET | `/api/requests/{id}` | mahasiswa | detail: `{id, worker, kind, title, status, fields, steps, letter, letter_no, approved_by, approved_at, reject_reason, student}` |
| GET | `/api/staff/queue` | staf | antrean: `[{id, worker, tab, type, name, nim, prodi, time, mins, line, summary, checks, attachments, letter, timeline, ...}]` |
| POST | `/api/staff/requests/{id}/decide` | staf | body `{approve, reason?, answer?}`; `reason` wajib saat menolak, `answer` wajib saat menjawab tiket |
| POST | `/api/staff/requests/{id}/undo` | staf | batalkan keputusan |
| GET | `/api/staff/metrics` | staf | `{tokens, total, by, avg_minutes, auto, handled, auto_pct, saved_minutes}` |
| GET | `/api/reports` | staf, teknisi | kartu laporan kerusakan untuk Board |
| POST | `/api/reports/{id}/status` | teknisi | body `{status}`; `baru` \| `dikerjakan` \| `selesai` |
| GET | `/api/app/latest` | publik | rilis App Android terbaru (404 kalau belum ada), lihat di bawah |
| GET | `/api/app/layan.apk` | publik | file APK terbaru; dipakai tombol "Unduh Android" di landing |

Peran yang salah dijawab 403. Detail field lengkap: lihat `json!` di `api/src/requests.rs` dan `api/src/board.rs`.

## Status permintaan

`submitted` → `processing` → `needs_info` / `pending_approval` → `approved` / `rejected` → `done`
(label Indonesia ada di `web/lib/data.ts`, `STATUS_LABEL`).

## Stream SSE (`POST /api/chat`, `POST /api/chat/action`)

Respons `text/event-stream`. Tiap event punya nama dan `data` JSON:

| Event | data |
|---|---|
| `status` | `{label, steps, step}` progres langkah agent (checklist di UI) |
| `message` | `{message: ChatMessage}` pesan baru dari agent |
| `update` | `{id, state}` ubah state action card yang sudah ada |
| `error` | `{message}` |
| `done` | selalu event terakhir |

`ChatMessage` = `{id, sender: "user"|"agent", text, file: {name,size}|null, card: Card|null, time}`.

## Action card

`Card` = `{kind, state, data}`; `state` = `active` \| `submitted` \| `skipped` \| `cancelled`.
Ada 10 `kind`: `form`, `upload`, `checks`, `draft`, `answer`, `ticket` (`api/src/tools.rs`),
`rooms`, `held`, `report` (`api/src/fasilitas.rs`), `done` (`api/src/requests.rs`).
Bentuk `data` tiap kind: lihat produsen di file tersebut dan renderer di `web/components/layan/action-cards.tsx`
(PWA) atau `android/.../ui/Cards.kt` (Android).

## Update App Android

`GET /api/app/latest` mengembalikan isi `latest.json` yang ditulis `deploy/release-android.sh`:

```json
{ "versionCode": 2, "versionName": "1.1", "notes": "…", "sha256": "…", "minVersionCode": 0, "url": "/api/app/layan.apk?v=2" }
```

App membandingkan `versionCode` dengan versinya sendiri, mengunduh `url`, mencocokkan `sha256`, lalu membuka installer.
Versi terpasang di bawah `minVersionCode` mendapat dialog wajib (tanpa tombol "Nanti").
