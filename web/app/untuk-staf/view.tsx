"use client"

import Link from "next/link"
import { Block, BTN_DARK, BTN_LINE, CheckIcon, SitePage, useLang } from "@/components/layan/site"

// Mock di halaman ini meniru Staff Console (components/layan/staff-console.tsx) dan Board (board.tsx), datanya contoh.
const T = {
  id: {
    kicker: "Untuk staf & teknisi",
    title: "Staf cukup memutuskan.",
    sub: "Agent mengerjakan langkah yang berulang: cek syarat, isi draf, cari ruang, gabung laporan dobel. Staf dan teknisi menerima pekerjaan yang sudah rapi.",
    cmpTitle: "Dulu dan dengan LAYAN",
    cmpHead: ["Layanan", "Dulu", "Dengan LAYAN"],
    cmp: [
      ["Surat akademik", "Mahasiswa datang ke loket, staf mengecek syarat dan mengetik surat satu per satu.", "Syarat dicek dan draf disusun agent. Staf tinggal menyetujui, nomor surat terbit otomatis."],
      ["Aturan akademik", "Pertanyaan yang sama dijawab berulang lewat chat pribadi.", "Dijawab dengan kutipan pedoman. Yang belum pasti masuk sebagai tiket ke unit."],
      ["Booking ruang", "Jadwal dicek manual, rawan bentrok.", "Bentrok dan kapasitas dicek otomatis, ruang ditahan 24 jam sambil menunggu konfirmasi."],
      ["Laporan kerusakan", "Kerusakan yang sama dilaporkan berkali-kali oleh banyak orang.", "Laporan dobel digabung dan langsung masuk ke teknisi dengan tingkat urgensi."],
    ],
    consoleTitle: "Staff Console",
    consoleSub: "Satu antrean untuk surat, tiket, dan booking. Setiap kartu datang dengan syarat yang sudah dicek.",
    consoleFeat: ["Syarat, lampiran, dan draf surat terlihat di satu kartu", "Setujui atau tolak dengan alasan, bisa dibatalkan", "Metrik harian: berapa yang selesai tanpa staf dan perkiraan waktu yang dihemat"],
    queue: [["Rina Ayu", "Surat dispensasi", "2 mnt"], ["Bagas P.", "Booking G2.4", "9 mnt"], ["Dewi S.", "Tiket akademik", "14 mnt"]],
    checks: ["Status aktif", "UKT lunas", "Lampiran ada"],
    approve: "Setujui", reject: "Tolak",
    boardTitle: "Board Teknisi",
    boardSub: "Laporan kerusakan dari chat langsung jadi kartu, lengkap dengan ruang, kategori, urgensi, dan jumlah pelapor.",
    cols: ["Baru", "Dikerjakan", "Selesai"],
    cards: [[0, "Proyektor mati", "F2.3", "Sedang", 3], [0, "AC bocor", "G1.2", "Tinggi", 1], [1, "Wi-Fi putus", "F3.1", "Sedang", 2], [2, "Lampu kedip", "G2.4", "Rendah", 1]] as [number, string, string, string, number][],
    reporters: "pelapor",
    sample: "Contoh tampilan",
    staff: "Masuk sebagai staf", tech: "Masuk sebagai teknisi",
  },
  en: {
    kicker: "For staff & technicians",
    title: "Staff just decide.",
    sub: "The agent does the repetitive steps: checking requirements, drafting, finding rooms, merging duplicate reports. Staff and technicians receive work that is already organized.",
    cmpTitle: "Before and with LAYAN",
    cmpHead: ["Service", "Before", "With LAYAN"],
    cmp: [
      ["Academic letters", "Students come to the counter, staff check requirements and type each letter.", "The agent checks requirements and drafts. Staff just approve, the letter number is issued automatically."],
      ["Academic rules", "The same questions are answered again and again in private chats.", "Answered with handbook quotes. Unclear ones become tickets to the office."],
      ["Room booking", "Schedules are checked by hand and clash easily.", "Conflicts and capacity are checked automatically, rooms are held 24 hours pending confirmation."],
      ["Damage report", "The same damage is reported many times by many people.", "Duplicate reports are merged and go straight to a technician with an urgency level."],
    ],
    consoleTitle: "Staff Console",
    consoleSub: "One queue for letters, tickets, and bookings. Every card arrives with requirements already checked.",
    consoleFeat: ["Requirements, attachments, and the letter draft on one card", "Approve or reject with a reason, and undo", "Daily metrics: how many finished without staff and estimated time saved"],
    queue: [["Rina Ayu", "Dispensation letter", "2 min"], ["Bagas P.", "Booking G2.4", "9 min"], ["Dewi S.", "Academic ticket", "14 min"]],
    checks: ["Active status", "Tuition paid", "Attachment present"],
    approve: "Approve", reject: "Reject",
    boardTitle: "Technician Board",
    boardSub: "Damage reports from the chat become cards right away, with room, category, urgency, and reporter count.",
    cols: ["New", "In progress", "Done"],
    cards: [[0, "Projector broken", "F2.3", "Medium", 3], [0, "AC leaking", "G1.2", "High", 1], [1, "Wi-Fi down", "F3.1", "Medium", 2], [2, "Flickering light", "G2.4", "Low", 1]] as [number, string, string, string, number][],
    reporters: "reporters",
    sample: "Sample view",
    staff: "Sign in as staff", tech: "Sign in as technician",
  },
}

const URGENCY = ["bg-muted text-muted-foreground", "bg-warn-bg text-warn", "bg-destructive/10 text-destructive"]
const urgencyOf = (u: string) => URGENCY[["Rendah", "Low"].includes(u) ? 0 : ["Tinggi", "High"].includes(u) ? 2 : 1]

export function StafView() {
  const lang = useLang()
  const t = T[lang]
  return (
    <SitePage lang={lang} kicker={t.kicker} title={t.title} sub={t.sub}>
      <Block title={t.cmpTitle}>
        <div className="overflow-hidden rounded-[24px] border bg-card">
          <div className="hidden grid-cols-[.8fr_1fr_1fr] gap-6 border-b bg-panel px-6 py-3 text-[11px] font-semibold uppercase tracking-[.08em] text-subtle-foreground md:grid">
            {t.cmpHead.map((h) => <span key={h}>{h}</span>)}
          </div>
          {t.cmp.map(([svc, before, after]) => (
            <div key={svc} className="grid gap-2 border-b px-6 py-5 last:border-b-0 md:grid-cols-[.8fr_1fr_1fr] md:gap-6">
              <span className="text-[16px] font-semibold">{svc}</span>
              <span className="text-[14.5px] leading-relaxed text-muted-foreground">{before}</span>
              <span className="flex items-start gap-2.5 text-[14.5px] leading-relaxed">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon size={11} /></span>
                {after}
              </span>
            </div>
          ))}
        </div>
      </Block>

      <Block title={t.consoleTitle} sub={t.consoleSub}>
        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div aria-label={t.sample} className="overflow-hidden rounded-[24px] border bg-card shadow-[0_50px_120px_-60px_rgba(22,24,26,.35)]">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <span className="text-[14.5px] font-semibold">{t.consoleTitle}</span>
              <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{t.sample}</span>
            </div>
            <div className="grid sm:grid-cols-[.9fr_1.1fr]">
              <ul className="m-0 flex list-none flex-col border-b p-2 sm:border-r sm:border-b-0">
                {t.queue.map(([name, kind, mins], i) => (
                  <li key={name} className={`flex items-center justify-between gap-3 rounded-[14px] px-3 py-3 ${i === 0 ? "bg-accent" : ""}`}>
                    <span className="flex flex-col">
                      <span className="text-[14px] font-semibold">{name}</span>
                      <span className="text-[12.5px] text-muted-foreground">{kind}</span>
                    </span>
                    <span className="font-mono text-[11.5px] text-subtle-foreground">{mins}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 p-5">
                <span className="text-[15px] font-semibold">{t.queue[0][1]} · {t.queue[0][0]}</span>
                {t.checks.map((c) => (
                  <span key={c} className="flex items-center gap-2.5 text-[14px]">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon size={11} /></span>
                    {c}
                  </span>
                ))}
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">{t.approve}</span>
                  <span className="inline-flex h-10 items-center rounded-full border border-input px-4 text-sm font-medium">{t.reject}</span>
                </div>
              </div>
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {t.consoleFeat.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[16px] leading-relaxed">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon size={13} /></span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </Block>

      <Block title={t.boardTitle} sub={t.boardSub}>
        <div aria-label={t.sample} className="grid gap-3 md:grid-cols-3">
          {t.cols.map((col, ci) => (
            <div key={col} className="flex flex-col gap-2.5 rounded-[22px] bg-muted p-3">
              <span className="flex items-center justify-between px-1.5 pt-1 text-[13px] font-semibold">
                {col}
                <span className="font-mono text-[11.5px] text-muted-foreground">{t.cards.filter((c) => c[0] === ci).length}</span>
              </span>
              {t.cards.filter((c) => c[0] === ci).map(([, title, room, urgency, n]) => (
                <div key={title} className="flex flex-col gap-2 rounded-[16px] border bg-card p-3.5">
                  <span className="text-[14.5px] font-semibold">{title}</span>
                  <span className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="rounded-md bg-accent px-2 py-0.5 font-mono font-medium text-accent-foreground">{room}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${urgencyOf(urgency)}`}>{urgency}</span>
                    {n > 1 && <span className="text-muted-foreground">{n} {t.reporters}</span>}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/login?next=%2Fstaf" className={BTN_DARK}>{t.staff}</Link>
          <Link href="/login?next=%2Fteknisi" className={BTN_LINE}>{t.tech}</Link>
        </div>
      </Block>
    </SitePage>
  )
}
