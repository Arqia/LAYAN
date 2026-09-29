// Tipe bersama + data contoh Board Teknisi (belum tersambung API sampai hari 4).

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


/** Hasil satu cek syarat, bentuknya sama dengan data dari API. */
export type Check = { ok: boolean; label: string; note: string }

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
