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
| POST | `/api/attachments` | mahasiswa | multipart, satu file PDF/JPG/PNG ≤ 5 MB → `{id, name, size}`. Gambar diklasifikasi LLM (lihat Klasifikasi lampiran) |
| GET | `/api/attachments/{id}` | pemilik, staf, teknisi | isi file |
| GET | `/api/requests` | mahasiswa | riwayat permintaan: `[{id, worker, kind, title, status, time, meta, active}]` |
| GET | `/api/requests/{id}` | mahasiswa | detail: `{id, worker, kind, title, status, fields, steps, letter, letter_no, approved_by, approved_at, reject_reason, student}` |
| GET | `/api/staff/queue` | staf | antrean: `[{id, worker, tab, type, name, nim, prodi, time, mins, line, summary, checks, attachments, letter, timeline, ...}]` |
| POST | `/api/staff/requests/{id}/decide` | staf | body `{approve, reason?, answer?}`; `reason` wajib saat menolak, `answer` wajib saat menjawab tiket |
| POST | `/api/staff/requests/{id}/undo` | staf | batalkan keputusan |
| GET | `/api/staff/metrics` | staf | `{tokens, total, by, avg_minutes, auto, handled, auto_pct, saved_minutes}` |
| GET | `/api/reports` | staf, teknisi | kartu laporan kerusakan untuk Board |
| POST | `/api/reports/{id}/status` | teknisi | body `{status}`; `baru` \| `dikerjakan` \| `selesai` |
| GET | `/api/admin/overview` | admin | pemantauan: `{activity: [{at, ip, action, detail, name, email, role}], users: [{name, email, role, ai_calls, tokens, chats, requests, ips, last}], requests}` |
| GET | `/api/public/stats` | publik | hitungan tanpa data pribadi untuk halaman `/status`: `{requests, requests_week, answers, fixed_week, auto_pct_week}` |
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

### Card surat (`form`, `upload`)

Isian surat ditentukan server, klien cukup merender ulang:

- `form`: `data = {title, fields: [{key, label, placeholder, helper}]}`. Aksi `submit` mengirim `payload` berisi
  `{<key>: "nilai", ...}` untuk setiap field. Khusus `courses` (dispensasi), isinya dipisah koma.
- `upload`: `data = {title}`, judul lampiran yang diminta (mis. "Bukti kegiatan", "Proposal penelitian").

## Jenis surat

Semua jenis memakai worker `surat`, alur tool yang sama, dan bentuk surat `{title, body1, body2}`. Definisinya ada di
`LETTERS` (`api/src/tools.rs`). `requests.data.type` menyimpan key-nya; permintaan lama tanpa `type` dianggap dispensasi.

| `type` | Surat | Prefiks nomor | Lampiran | Syarat tambahan |
|---|---|---|---|---|
| `dispensasi` | Surat Dispensasi | `SD` | Bukti kegiatan | - |
| `aktif` | Surat Keterangan Aktif Kuliah | `SKA` | - | - |
| `magang` | Surat Pengantar Magang/KP | `SPM` | - | semester ≥ 5 |
| `penelitian` | Surat Izin Penelitian/Survei | `SIP` | Proposal penelitian | - |
| `beasiswa` | Surat Rekomendasi Beasiswa | `SRB` | - | IPK ≥ 3,00 |

Syarat umum semua jenis: status aktif dan UKT lunas. Detail permintaan (`GET /api/requests/{id}`) dan antrean staf
menampilkan isian surat sebagai `fields: [[label, nilai], ...]`.

## Klasifikasi lampiran

Setiap JPG/PNG yang diupload dikirim ke LLM (`Llm::classify_image`, `api/src/llm.rs`) dan diberi label di
`attachments.label`: `dokumen`, `foto`, atau `lainnya`.

- `tidak_pantas` (ketelanjangan, seksual, kekerasan, atau diblokir filter keamanan provider): upload ditolak 400, file tidak disimpan.
- Lampiran surat (`requestAttachment`) wajib berlabel `dokumen`, selain itu aksi `upload` ditolak dengan pesan untuk upload ulang.
- Foto laporan kerusakan cukup lolos cek `tidak_pantas`.
- Label `NULL` (PDF, agent mock, atau LLM gagal) tetap diterima; staf memeriksa saat approve. Antrean staf menampilkan
  label di `meta` lampiran (`... · dicek AI: dokumen`).

## Admin dan log akses

Peran `admin` hanya membuka `/admin`. Login (berhasil dan gagal), chat ke AI, aksi card, dan upload dicatat di
`access_log` beserta IP pengguna (`CF-Connecting-IP` dari Cloudflare Tunnel, cadangan `X-Forwarded-For`).
Akun admin, juri, dan teknisi ada di `api/accounts.json` (di-gitignore, contoh di `accounts.example.json`).

## Update App Android

`GET /api/app/latest` mengembalikan isi `latest.json` yang ditulis `deploy/release-android.sh`:

```json
{ "versionCode": 2, "versionName": "1.1", "notes": "…", "sha256": "…", "minVersionCode": 0, "url": "/api/app/layan.apk?v=2" }
```

App membandingkan `versionCode` dengan versinya sendiri, mengunduh `url`, mencocokkan `sha256`, lalu membuka installer.
Versi terpasang di bawah `minVersionCode` mendapat dialog wajib (tanpa tombol "Nanti").
