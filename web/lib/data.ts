// Data contoh dari design handoff. Semua nama, NIM, ruang adalah dummy.

export type Status =
  | "submitted"
  | "processing"
  | "needs_info"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "done"

export const STATUS_LABEL: Record<Status, string> = {
  submitted: "Diajukan",
  processing: "Diproses agent",
  needs_info: "Butuh data",
  pending_approval: "Menunggu persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  done: "Selesai",
}

export type Worker = "surat" | "helpdesk" | "fasilitas"
export type Urgency = "Rendah" | "Sedang" | "Tinggi"
export type Role = "mahasiswa" | "staf" | "teknisi"

/** Halaman awal tiap peran setelah login. */
export const HOME: Record<Role, string> = { mahasiswa: "/", staf: "/staf", teknisi: "/teknisi" }

/** User yang login, bentuknya sama dengan `User` di api/src/auth.rs. */
export type Me = {
  id: string
  role: Role
  name: string
  email: string
  nim: string | null
  prodi: string | null
  unit: string | null
}

export const PEOPLE = {
  raka: { name: "Raka Pratama", nim: "245150200111001", prodi: "Teknik Informatika" },
  nadia: { name: "Nadia Putri", nim: "245150300111002", prodi: "Teknik Komputer" },
  bima: { name: "Bima Saputra", nim: "235150400111003", prodi: "Sistem Informasi" },
}

/* ---------- Staff Console ---------- */

export type Check = { ok: boolean; label: string; note: string }
export type AuditEntry = { time: string; tool: string; result: string }

export type QueueItem = {
  id: string
  worker: Worker
  tab: "surat" | "tiket" | "booking"
  type: string
  person: keyof typeof PEOPLE
  time: string
  mins: number
  line: string
  summary: string
  checks: Check[]
  attachments: { name: string; meta: string }[]
  pdf?: { title: string; body1: string; body2: string }
  timeline: AuditEntry[]
  toastSub: string
}

const ok = (label: string, note: string): Check => ({ ok: true, label, note })
const no = (label: string, note: string): Check => ({ ok: false, label, note })
const tl = (time: string, tool: string, result: string): AuditEntry => ({ time, tool, result })
const PDF_OPEN = "Yang bertanda tangan di bawah ini menerangkan bahwa mahasiswa berikut:"

export const QUEUE: QueueItem[] = [
  {
    id: "r1", worker: "surat", tab: "surat", type: "Surat Dispensasi", person: "raka", time: "09.15", mins: 3,
    line: "Gemastik 2026, 10–12 Okt, 2 mata kuliah",
    summary: "Raka minta Surat Dispensasi untuk mengikuti Gemastik 2026 pada 10–12 Oktober. Dua mata kuliah terlewat: Struktur Data dan Sistem Digital. Syarat terpenuhi dan undangan sudah dicek cocok dengan nama serta tanggal.",
    checks: [ok("Status aktif", "Ganjil 2026/2027"), ok("UKT lunas", "Dibayar 14 Agu 2026"), ok("Lampiran sesuai", "Nama dan tanggal cocok")],
    attachments: [{ name: "undangan_gemastik.pdf", meta: "PDF · 412 KB · 2 halaman" }],
    pdf: {
      title: "SURAT DISPENSASI", body1: PDF_OPEN,
      body2: "diberikan dispensasi untuk tidak mengikuti perkuliahan Struktur Data dan Sistem Digital pada tanggal 10–12 Oktober 2026 karena mengikuti kegiatan Gemastik 2026. Mohon dosen pengampu dapat memaklumi. Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.",
    },
    timeline: [tl("09.12", "getStudentProfile", "Data profil ditemukan"), tl("09.12", "checkLetterRequirements", "Status aktif, UKT lunas"), tl("09.14", "requestAttachment", "Lampiran diterima (undangan_gemastik.pdf)"), tl("09.15", "generateLetterDraft", "Draft Surat Dispensasi dibuat"), tl("09.15", "submitForApproval", "Masuk queue")],
    toastSub: "Nomor SD/2026/10/0142 terbit. Raka sudah diberi tahu lewat chat.",
  },
  {
    id: "n1", worker: "fasilitas", tab: "booking", type: "Booking ruang", person: "nadia", time: "09.20", mins: 1,
    line: "G1.2 · Jumat 2 Okt, 13.00–15.00 · 20 orang",
    summary: "Nadia booking ruang untuk rapat himpunan, 20 orang. G2.4 bentrok di jam itu, jadi Nadia memilih G1.2 (30 orang) di jam yang sama. Ruang sudah ditahan sampai Rabu 09.20.",
    checks: [ok("Tidak bentrok", "G1.2 kosong 13.00–15.00"), ok("Kapasitas cukup", "20 dari 30 kursi"), ok("Jam operasional", "Jumat 07.00–17.00")],
    attachments: [],
    timeline: [tl("09.18", "checkRoomAvailability", "G2.4 bentrok, 3 alternatif ditemukan"), tl("09.19", "suggestAlternatives", "G1.2, F2.3, G2.4 (15.00)"), tl("09.20", "holdRoom", "G1.2 ditahan 24 jam"), tl("09.20", "submitForApproval", "Masuk queue")],
    toastSub: "G1.2 terkonfirmasi. Nadia sudah diberi tahu lewat chat.",
  },
  {
    id: "b1", worker: "helpdesk", tab: "tiket", type: "Tiket helpdesk", person: "bima", time: "08.57", mins: 21,
    line: "Prosedur cicilan UKT, cek syarat surat gagal",
    summary: "Bima gagal cek syarat Surat Aktif Kuliah karena UKT Ganjil 2026/2027 belum lunas, lalu menanyakan prosedur cicilan UKT. Knowledge base tidak punya jawaban pasti, jadi agent membuat tiket ke Bagian Keuangan.",
    checks: [ok("Status aktif", "Semester 5"), no("UKT lunas", "Jatuh tempo 30 Sep")],
    attachments: [],
    timeline: [tl("08.52", "getStudentProfile", "Data profil ditemukan"), tl("08.52", "checkLetterRequirements", "UKT belum lunas, surat ditahan"), tl("08.55", "searchKnowledgeBase", "2 dokumen, keyakinan rendah"), tl("08.57", "createTicket", "TKT-2026-0321 ke Bagian Keuangan")],
    toastSub: "Tiket diteruskan. Bima sudah diberi tahu lewat chat.",
  },
  {
    id: "n2", worker: "surat", tab: "surat", type: "Surat Aktif Kuliah", person: "nadia", time: "08.41", mins: 37,
    line: "Untuk beasiswa daerah, semester 3",
    summary: "Nadia minta Surat Aktif Kuliah untuk pengajuan beasiswa daerah. Semua syarat terpenuhi. Tidak perlu lampiran untuk jenis surat ini.",
    checks: [ok("Status aktif", "Ganjil 2026/2027"), ok("UKT lunas", "Dibayar 9 Agu 2026")],
    attachments: [],
    pdf: {
      title: "SURAT KETERANGAN AKTIF KULIAH", body1: PDF_OPEN,
      body2: "adalah benar mahasiswa aktif pada semester Ganjil tahun akademik 2026/2027. Surat ini dibuat untuk keperluan pengajuan beasiswa daerah dan dipergunakan sebagaimana mestinya.",
    },
    timeline: [tl("08.40", "getStudentProfile", "Data profil ditemukan"), tl("08.40", "checkLetterRequirements", "Status aktif, UKT lunas"), tl("08.41", "generateLetterDraft", "Draft Surat Aktif Kuliah dibuat"), tl("08.41", "submitForApproval", "Masuk queue")],
    toastSub: "Nomor SA/2026/09/0913 terbit. Nadia sudah diberi tahu lewat chat.",
  },
  {
    id: "b2", worker: "fasilitas", tab: "booking", type: "Booking ruang", person: "bima", time: "08.10", mins: 68,
    line: "F3.1 · Sabtu 3 Okt, 08.00–12.00 · 55 orang",
    summary: "Bima booking F3.1 untuk seminar UKM, 55 orang, hari Sabtu. Ruang kosong, tapi Sabtu di luar jam layanan reguler sehingga perlu persetujuan manual.",
    checks: [ok("Tidak bentrok", "F3.1 kosong"), ok("Kapasitas cukup", "55 dari 60 kursi"), no("Jam operasional", "Sabtu butuh izin khusus")],
    attachments: [{ name: "proposal_seminar_ukm.pdf", meta: "PDF · 1,2 MB · 6 halaman" }],
    timeline: [tl("08.08", "checkRoomAvailability", "F3.1 kosong"), tl("08.09", "checkOperatingHours", "Sabtu di luar jam reguler"), tl("08.10", "holdRoom", "F3.1 ditahan 24 jam"), tl("08.10", "submitForApproval", "Masuk queue, perlu izin khusus")],
    toastSub: "F3.1 terkonfirmasi. Bima sudah diberi tahu lewat chat.",
  },
  {
    id: "r2", worker: "helpdesk", tab: "tiket", type: "Tiket helpdesk", person: "raka", time: "Kemarin", mins: 900,
    line: "Konversi SKS lomba ke kegiatan MBKM",
    summary: "Raka bertanya apakah prestasi Gemastik bisa dikonversi menjadi SKS. Pedoman menyebut konversi prestasi, tapi tidak menjelaskan besaran SKS untuk lomba nasional.",
    checks: [ok("Status aktif", "Semester 3")],
    attachments: [],
    timeline: [tl("16.20", "searchKnowledgeBase", "Pedoman Akademik, Bab Konversi"), tl("16.21", "answerWithCitation", "Jawaban parsial, keyakinan rendah"), tl("16.24", "createTicket", "TKT-2026-0317 ke Bagian Akademik")],
    toastSub: "Tiket diteruskan. Raka sudah diberi tahu lewat chat.",
  },
  {
    id: "n3", worker: "surat", tab: "surat", type: "Surat Dispensasi", person: "nadia", time: "Kemarin", mins: 960,
    line: "Kompetisi robotik, 14 Okt, 1 mata kuliah",
    summary: "Nadia minta Surat Dispensasi untuk Kontes Robot pada 14 Oktober. Satu mata kuliah terlewat: Elektronika Digital. Lampiran berupa pengumuman lolos tim.",
    checks: [ok("Status aktif", "Ganjil 2026/2027"), ok("UKT lunas", "Dibayar 9 Agu 2026"), ok("Lampiran sesuai", "Nama tercantum di tim")],
    attachments: [{ name: "pengumuman_lolos_krti.jpg", meta: "JPG · 860 KB" }],
    pdf: {
      title: "SURAT DISPENSASI", body1: PDF_OPEN,
      body2: "diberikan dispensasi untuk tidak mengikuti perkuliahan Elektronika Digital pada tanggal 14 Oktober 2026 karena mengikuti Kontes Robot. Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.",
    },
    timeline: [tl("16.35", "getStudentProfile", "Data profil ditemukan"), tl("16.35", "checkLetterRequirements", "Status aktif, UKT lunas"), tl("16.38", "requestAttachment", "Lampiran diterima (pengumuman_lolos_krti.jpg)"), tl("16.40", "generateLetterDraft", "Draft Surat Dispensasi dibuat"), tl("16.40", "submitForApproval", "Masuk queue")],
    toastSub: "Nomor SD/2026/10/0143 terbit. Nadia sudah diberi tahu lewat chat.",
  },
]

/* ---------- Board Teknisi ---------- */

export type ReportStatus = "baru" | "dikerjakan" | "selesai"
export type Category = "Listrik" | "AC" | "Proyektor" | "Jaringan" | "Kebersihan" | "Lainnya"
export type Tech = "joko" | "dimas"

export const TECHS: Record<Tech, { name: string; initials: string; bg: string; fg: string; area: string }> = {
  joko: { name: "Pak Joko", initials: "PJ", bg: "#FBEBDF", fg: "#8A3F12", area: "Listrik / AC" },
  dimas: { name: "Mas Dimas", initials: "MD", bg: "#E5EEFC", fg: "#1D5FC7", area: "Jaringan / Proyektor" },
}

export type Report = {
  id: string; status: ReportStatus; room: string; title: string; category: Category
  urgency: Urgency; reporterCount: number; time: string; assignee: Tech; photo: boolean
}

export const REPORTS: Report[] = (
  [
    ["LK-0587", "baru", "F2.3", "AC mati, ruangan panas", "AC", "Sedang", 3, "08.40", "joko", true],
    ["LK-0591", "baru", "G1.2", "Proyektor tidak menyala, ada kuliah jam 10", "Proyektor", "Tinggi", 1, "09.05", "dimas", false],
    ["LK-0584", "baru", "F3.1", "Wi-Fi putus-putus di barisan belakang", "Jaringan", "Sedang", 5, "08.15", "dimas", false],
    ["LK-0589", "baru", "F3.1", "Dua lampu depan berkedip", "Listrik", "Rendah", 1, "08.52", "joko", false],
    ["LK-0580", "baru", "G2-WC", "Wastafel mampet", "Kebersihan", "Rendah", 1, "07.50", "dimas", false],
    ["LK-0571", "dikerjakan", "G2.4", "Stopkontak meja rapat berasap", "Listrik", "Tinggi", 2, "Kemarin", "joko", true],
    ["LK-0569", "dikerjakan", "F2.3", "Kabel HDMI longgar, layar kedip", "Proyektor", "Rendah", 1, "Kemarin", "dimas", false],
    ["LK-0552", "selesai", "F3.1", "AC bocor air ke lantai", "AC", "Sedang", 4, "Senin", "joko", false],
    ["LK-0549", "selesai", "G1.2", "Kursi dosen patah", "Lainnya", "Rendah", 1, "Senin", "dimas", false],
  ] as const
).map(([id, status, room, title, category, urgency, reporterCount, time, assignee, photo]) => ({
  id, status, room, title, category, urgency, reporterCount, time, assignee, photo,
}))

/* ---------- Riwayat mahasiswa ---------- */

export type HistoryItem = {
  id: string; worker: Worker; icon?: "wrench"; status: Status; title: string; time: string; meta: string; active: boolean
}

export const HISTORY: HistoryItem[] = [
  { id: "REQ-2026-0931", worker: "surat", status: "pending_approval", title: "Surat Dispensasi", time: "09.15", meta: "Gemastik 2026 · di Ibu Sari", active: true },
  { id: "REQ-2026-0932", worker: "fasilitas", status: "pending_approval", title: "Booking G1.2", time: "09.20", meta: "Jumat 2 Okt, 13.00–15.00", active: true },
  { id: "TKT-2026-0318", worker: "helpdesk", status: "needs_info", title: "Tiket TKT-2026-0318", time: "Kemarin", meta: "Unit minta transkrip semester lalu", active: true },
  { id: "LK-0587", worker: "fasilitas", icon: "wrench", status: "submitted", title: "AC F2.3 mati", time: "Kemarin", meta: "Ditugaskan ke Pak Joko · 3 pelapor", active: true },
  { id: "REQ-2026-0877", worker: "surat", status: "done", title: "Surat Aktif Kuliah", time: "12 Sep", meta: "SA/2026/09/0877 · untuk beasiswa", active: false },
  { id: "REQ-2026-0851", worker: "surat", status: "rejected", title: "Surat Aktif Kuliah", time: "2 Sep", meta: "Keperluan belum disebut. Ajukan ulang dengan tujuan surat.", active: false },
]
