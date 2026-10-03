"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { HOME } from "@/lib/data"
import { Mark } from "@/components/layan/primitives"
import { useStore } from "@/components/layan/store"

// Landing page publik.
// Isi dibatasi ke 4 layanan yang benar-benar dilayani agent (lihat SYSTEM_PROMPT di api/src/tools.rs).
// Warna & font memakai token app (globals.css), jadi tampilan tidak "melompat" setelah login.
// Demo boleh dimainkan tanpa akun; setiap aksi nyata lewat modal login yang membawa konteksnya.

const ICONS: Record<string, string> = {
  dispensasi: "M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6",
  akademik: "M2 9l10-5 10 5-10 5-10-5z M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
  ruang: "M4 21V6l8-3 8 3v15 M9 21v-5h6v5 M8 9h2 M14 9h2 M8 12.5h2 M14 12.5h2",
  kerusakan: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  status: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3.5 2",
}

const ID = {
  navAria: "Navigasi utama", langLabel: "Bahasa", motionLabel: "Animasi",
  nav: { layanan: "Layanan", cara: "Cara Kerja", app: "App", menu: "Menu" },
  signin: "Masuk", open: "Buka LAYAN", student: "Mahasiswa",
  h1a: "Urus layanan kampus.",
  phrases: ["Lewat satu chat.", "Tanpa antre.", "Sampai selesai."],
  heroSub: "Ajukan surat dispensasi, tanya aturan akademik, booking ruang, atau lapor kerusakan. Keputusan akhir tetap di staf kampus.",
  cta1: "Mulai dengan LAYAN", cta2: "Lihat cara kerja",
  chatStatus: "Asisten layanan kampus · aktif",
  greet1: "Halo.", greet2: "Mau urus apa hari ini?",
  caption: "LAYAN memahami kebutuhanmu.",
  askAria: "Tulis pertanyaan untuk LAYAN (perlu masuk)",
  prompts: ["Aku ikut lomba tanggal 14, butuh surat dispensasi.", "Berapa batas maksimal cuti akademik?", "Pinjam ruang rapat Jumat jam 13.00 untuk 10 orang.", "Proyektor di ruang F2.3 mati."],
  quick: [["dispensasi", "Ajukan dispensasi", "Izin lomba atau kegiatan"], ["status", "Cek status", "Pantau pengajuanmu"], ["ruang", "Booking ruang", "Cari ruang yang kosong"]],

  svcA: "Empat layanan.", svcB: "Satu tempat.",
  svcSub: "Pilih layanan untuk melihat LAYAN menanganinya.",
  services: [
    { k: "dispensasi", name: "Surat Dispensasi", desc: "Izin lomba atau kegiatan", q: "Aku ikut lomba tanggal 14, butuh surat dispensasi.", a: "Siap. Data profilmu sudah terisi. Tinggal unggah surat undangan lombanya, lalu aku cek syaratnya." },
    { k: "akademik", name: "Aturan Akademik", desc: "Jawaban dengan kutipan", q: "Berapa batas maksimal cuti akademik?", a: "Jawabanku diambil dari pedoman akademik kampus, lengkap dengan bagian yang dikutip. Kalau belum pasti, aku teruskan ke unit akademik." },
    { k: "ruang", name: "Booking Ruang", desc: "Cari & tahan ruang kosong", q: "Pinjam ruang rapat Jumat jam 13.00 untuk 10 orang.", a: "Ada 2 ruang yang kosong di jam itu. Pilih satu, nanti aku tahan untukmu." },
    { k: "kerusakan", name: "Lapor Kerusakan", desc: "Langsung ke teknisi", q: "Proyektor di ruang F2.3 mati.", a: "Laporanmu tercatat dengan urgensi Sedang dan sudah diteruskan ke teknisi. Pantau tindak lanjutnya di sini." },
  ],
  sampleTag: "Contoh",
  checksTitle: "Cek syarat", checks: [["Status mahasiswa aktif", "ok"], ["Tanggal lomba tercatat", "ok"], ["Surat undangan", "Menunggu unggahan"]], dispAction: "Ajukan dispensasi",
  citeTitle: "Sumber jawaban", citeDoc: "Pedoman Akademik", citeNote: "Bagian yang dikutip ditampilkan bersama jawaban.", citeAsk: "Tanyakan", citeTicket: "Masih bingung? Buat tiket",
  rooms: [["G2.4", "Ruang rapat", "20 orang"], ["F2.3", "Ruang kelas", "40 orang"]], roomHold: "Tahan",
  reportTitle: "Proyektor mati", reportRoom: "Ruang F2.3", reportUrgency: "Urgensi sedang", reportStatus: "Diteruskan ke teknisi", reportAction: "Lapor kerusakan",

  storyA: "Dari pertanyaan", storyB: "sampai selesai.",
  storySub: "LAYAN bukan cuma chatbot. Kebutuhanmu dibawa dari pertanyaan pertama sampai urusannya tuntas.",
  steps: [
    ["Tanya", "Tulis kebutuhanmu seperti chat biasa."],
    ["Pahami", "LAYAN mengenali layanan yang kamu butuhkan."],
    ["Cari informasi", "Data profil dan syarat dicek otomatis."],
    ["Arahkan", "Kamu dijelaskan langkahnya, tanpa menebak."],
    ["Ajukan", "Draf disiapkan, lalu diajukan ke staf."],
    ["Pantau", "Status muncul di chat sampai selesai."],
  ],
  sPrompt: "Aku mau ajukan surat dispensasi buat lomba minggu depan.",
  sUnderstand: "Memahami kebutuhanmu", sDetected: "Layanan: Surat Dispensasi",
  sSearch: ["Mengambil data profil", "Mengecek syarat dispensasi", "Mencocokkan tanggal kegiatan"], sSearched: "Profil dan syarat sudah dicek",
  sAnswer: "Syaratnya lengkap. Data profilmu sudah terisi dan surat undanganmu sudah aku periksa. Drafnya aku siapkan sekarang.",
  sDraft: "Draf Surat Dispensasi", sDraftRows: ["Data mahasiswa", "Detail lomba", "Surat undangan"], sSubmit: "Ajukan ke staf", sSubmitted: "Diajukan ke staf",
  sTrack: ["Diajukan", "Ditinjau staf", "Disetujui"], sDone: "Selesai. Surat siap diunduh.",
  inputPh: "Tulis pertanyaanmu…",

  finalTitle: "Urusan kampus, beres dari chat.",
  finalSub: "Jelajahi tanpa akun. Masuk dengan akun kampus saat kamu siap mengajukan sesuatu.",
  appAndroid: "Unduh app Android",
  foot: "Asisten layanan kampus",

  mTitle: "Masuk untuk melanjutkan",
  mDesc: "Halaman ini bebas dijelajahi. Untuk menjalankan aksi ini, masuk dulu dengan akun kampus.",
  mNext: "Setelah masuk, kamu langsung lanjut ke", mQuoteNote: "Pertanyaan ini sudah terisi di chat.",
  mPrimary: "Masuk dan lanjutkan", mCancel: "Nanti saja", mClose: "Tutup",
  intents: {
    start: "Percakapan baru", ask: "Mengirim pertanyaan", status: "Cek status pengajuan", app: "Beranda LAYAN",
    dispensasi: "Ajukan surat dispensasi", akademik: "Tanya aturan akademik", ruang: "Booking ruang", kerusakan: "Lapor kerusakan", tiket: "Buat tiket ke unit akademik",
  } as Record<string, string>,
}

type Dict = typeof ID

const EN: Dict = {
  navAria: "Main navigation", langLabel: "Language", motionLabel: "Animation",
  nav: { layanan: "Services", cara: "How it works", app: "App", menu: "Menu" },
  signin: "Sign in", open: "Open LAYAN", student: "Student",
  h1a: "Handle campus services.",
  phrases: ["In one chat.", "No queues.", "Start to finish."],
  heroSub: "Request a dispensation letter, ask about academic rules, book a room, or report damage. Campus staff still make the final call.",
  cta1: "Start with LAYAN", cta2: "See how it works",
  chatStatus: "Campus service assistant · online",
  greet1: "Hi there.", greet2: "What do you need today?",
  caption: "LAYAN understands what you need.",
  askAria: "Ask LAYAN a question (sign-in required)",
  prompts: ["I have a competition on the 14th and need a dispensation letter.", "What is the maximum length of academic leave?", "Book the meeting room Friday at 1 PM for 10 people.", "The projector in room F2.3 is broken."],
  quick: [["dispensasi", "Request dispensation", "For competitions or events"], ["status", "Check status", "Track your requests"], ["ruang", "Book a room", "Find a free room"]],

  svcA: "Four services.", svcB: "One place.",
  svcSub: "Pick a service to see how LAYAN handles it.",
  services: [
    { k: "dispensasi", name: "Dispensation Letter", desc: "For competitions or events", q: "I have a competition on the 14th and need a dispensation letter.", a: "Sure. Your profile is filled in. Upload the competition invitation and I will check the requirements." },
    { k: "akademik", name: "Academic Rules", desc: "Answers with citations", q: "What is the maximum length of academic leave?", a: "My answer comes from the campus academic handbook, with the quoted section. If it is unclear, I forward it to the academic office." },
    { k: "ruang", name: "Room Booking", desc: "Find & hold a free room", q: "Book the meeting room Friday at 1 PM for 10 people.", a: "There are 2 free rooms at that time. Pick one and I will hold it for you." },
    { k: "kerusakan", name: "Damage Report", desc: "Straight to a technician", q: "The projector in room F2.3 is broken.", a: "Your report is logged with medium urgency and sent to a technician. Track the follow-up here." },
  ],
  sampleTag: "Sample",
  checksTitle: "Requirement check", checks: [["Active student status", "ok"], ["Competition date recorded", "ok"], ["Invitation letter", "Waiting for upload"]], dispAction: "Request dispensation",
  citeTitle: "Answer source", citeDoc: "Academic Handbook", citeNote: "The quoted section is shown with the answer.", citeAsk: "Ask", citeTicket: "Still unsure? Open a ticket",
  rooms: [["G2.4", "Meeting room", "20 people"], ["F2.3", "Classroom", "40 people"]], roomHold: "Hold",
  reportTitle: "Projector broken", reportRoom: "Room F2.3", reportUrgency: "Medium urgency", reportStatus: "Sent to technician", reportAction: "Report damage",

  storyA: "From question", storyB: "to done.",
  storySub: "LAYAN is more than a chatbot. It carries your request from the first question until it is resolved.",
  steps: [
    ["Ask", "Describe what you need like a normal chat."],
    ["Understand", "LAYAN recognizes the service you need."],
    ["Find information", "Your profile and the requirements are checked."],
    ["Guide", "You are told the steps, no guessing."],
    ["Submit", "A draft is prepared and sent to staff."],
    ["Track", "Status shows up in the chat until it is done."],
  ],
  sPrompt: "I want to request a dispensation letter for a competition next week.",
  sUnderstand: "Understanding your request", sDetected: "Service: Dispensation Letter",
  sSearch: ["Pulling your profile", "Checking dispensation requirements", "Matching the event date"], sSearched: "Profile and requirements checked",
  sAnswer: "All requirements are met. Your profile is filled in and I checked your invitation letter. I am preparing the draft now.",
  sDraft: "Dispensation Letter Draft", sDraftRows: ["Student details", "Competition details", "Invitation letter"], sSubmit: "Send to staff", sSubmitted: "Sent to staff",
  sTrack: ["Submitted", "Staff review", "Approved"], sDone: "Done. Your letter is ready to download.",
  inputPh: "Type your question…",

  finalTitle: "Campus errands, handled in a chat.",
  finalSub: "Explore without an account. Sign in with your campus account when you are ready to submit something.",
  appAndroid: "Download Android app",
  foot: "Campus service assistant",

  mTitle: "Sign in to continue",
  mDesc: "This page is free to explore. To run this action, sign in with your campus account first.",
  mNext: "After signing in, you continue to", mQuoteNote: "This question will already be in the chat.",
  mPrimary: "Sign in and continue", mCancel: "Not now", mClose: "Close",
  intents: {
    start: "New conversation", ask: "Sending a question", status: "Check request status", app: "LAYAN home",
    dispensasi: "Request a dispensation letter", akademik: "Ask about academic rules", ruang: "Book a room", kerusakan: "Report damage", tiket: "Open a ticket to the academic office",
  },
}

const DICT = { id: ID, en: EN }
type Lang = keyof typeof DICT

/** Aksi nyata yang butuh login. `q` diisikan ke kolom chat setelah login (app/app/page.tsx). */
type Intent = { key: string; path: string; q?: string }
type Gate = (i: Intent) => () => void

const SECTIONS = ["top", "layanan", "cara-kerja", "mulai"]
const EASE = "cubic-bezier(.2,.7,.2,1)"
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

// animasi: pilihan pengguna lewat saklar di navbar menang; tanpa pilihan, ikut setelan "kurangi animasi" perangkat
type Motion = "on" | "off"
const MOTION_EVENT = "layan-motion"
const REDUCE_MQ = "(prefers-reduced-motion: reduce)"
const subscribeMotion = (cb: () => void) => {
  const m = window.matchMedia(REDUCE_MQ)
  m.addEventListener("change", cb)
  window.addEventListener("storage", cb)
  window.addEventListener(MOTION_EVENT, cb)
  return () => {
    m.removeEventListener("change", cb)
    window.removeEventListener("storage", cb)
    window.removeEventListener(MOTION_EVENT, cb)
  }
}
const readMotion = (): Motion => {
  try {
    const v = localStorage.getItem("layan_motion")
    if (v === "on" || v === "off") return v
  } catch {}
  return window.matchMedia(REDUCE_MQ).matches ? "off" : "on"
}
const motionOff = () => readMotion() === "off"

// bahasa disimpan di localStorage; event lokal supaya useSyncExternalStore ikut berubah
const LANG_EVENT = "layan-lang"
const subscribeLang = (cb: () => void) => {
  window.addEventListener("storage", cb)
  window.addEventListener(LANG_EVENT, cb)
  return () => {
    window.removeEventListener("storage", cb)
    window.removeEventListener(LANG_EVENT, cb)
  }
}
const readLang = (): Lang => {
  try {
    return localStorage.getItem("layan_lang") === "en" ? "en" : "id"
  } catch {
    return "id"
  }
}

const SUB = "text-[length:clamp(16px,1.25vw,19px)] leading-[1.55] text-soft-foreground text-pretty"
const GUTTER = "px-[clamp(20px,4vw,48px)]"
const CARD = "overflow-hidden rounded-[28px] border bg-card shadow-[0_50px_120px_-60px_rgba(22,24,26,.35)]"
const USER_BUBBLE = "self-end max-w-[85%] rounded-[18px_18px_6px_18px] bg-ink px-4 py-3 text-[15px] leading-[1.45] text-ink-foreground"
const BOT_BUBBLE = "self-start max-w-[90%] rounded-[18px_18px_18px_6px] bg-muted px-4 py-3.5 text-[15px] leading-normal text-foreground"
const H2 = "text-[length:clamp(34px,min(4.4vw,7vh),68px)] font-semibold leading-[1.04] tracking-[-.04em] text-balance"
const MSG_IN = "animate-[layanMsgIn_.6s_cubic-bezier(.2,.7,.2,1)_both]"
const BTN_DARK = "inline-flex cursor-pointer items-center whitespace-nowrap rounded-full bg-ink font-semibold text-ink-foreground transition-all duration-300 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-0.5 active:scale-[.98]"
const BTN_LINE = "inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border border-input font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground hover:bg-card active:scale-[.98]"
const BTN_ACC = "inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-250 hover:-translate-y-px hover:bg-primary-hover active:scale-[.98]"

function Icon({ d, size = 20, sw = 1.6 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
const Arrow = ({ size = 18 }: { size?: number }) => <Icon d="M5 12h14M13 6l6 6-6 6" size={size} sw={1.8} />
const Up = ({ size = 18 }: { size?: number }) => <Icon d="M12 19V5M6 11l6-6 6 6" size={size} sw={1.8} />
const Check = ({ size = 14 }: { size?: number }) => <Icon d="M5 12.5l4.5 4.5L19 7.5" size={size} sw={2.2} />
const Download = () => <Icon d="M12 4v11M7 10l5 5 5-5M5 20h14" size={18} sw={1.8} />

function DoodleArrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 100" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 86 C36 68 58 60 90 46" />
      <path d="M74 40 L92 44 L82 60" />
    </svg>
  )
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" className={className}>
      <path d="M28 8 v24 M16 20 h24" />
      <path d="M84 46 v18 M75 55 h18" />
      <circle cx="102" cy="18" r="6" />
      <circle cx="52" cy="68" r="4" fill="currentColor" stroke="none" />
    </svg>
  )
}

const Dots = () => (
  <span className="flex gap-[5px]">
    {[0, 0.15, 0.3].map((d) => (
      <span key={d} className="size-1.5 rounded-full bg-foreground" style={{ animation: `layanDot 1.2s ${d}s infinite` }} />
    ))}
  </span>
)

/** Tombol yang sedikit tertarik ke kursor. Transform di wrapper supaya hover tombol tetap jalan. */
function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const move = (e: PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== "mouse" || motionOff()) return
    const r = el.getBoundingClientRect()
    el.style.transform = `translate3d(${(e.clientX - r.left - r.width / 2) * strength}px, ${(e.clientY - r.top - r.height / 2) * strength * 1.2}px, 0)`
  }
  const leave = () => ref.current && (ref.current.style.transform = "")
  return (
    <span ref={ref} onPointerMove={move} onPointerLeave={leave} className="inline-flex transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)]">
      {children}
    </span>
  )
}

/* ---------- 02 Layanan: tab layanan mengganti demo (klik/ketuk/hover, tidak bergantung hover) ---------- */

function ServiceDemo({ t, gate, motion }: { t: Dict; gate: Gate; motion: Motion }) {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const box = useRef<HTMLDivElement>(null)

  // berganti sendiri selama terlihat, sampai pengguna memilih tab
  useEffect(() => {
    const el = box.current
    if (!auto || !el || motion === "off") return
    let visible = false
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    const id = setInterval(() => visible && setActive((a) => (a + 1) % 4), 5600)
    return () => {
      clearInterval(id)
      io.disconnect()
    }
  }, [auto, motion])

  const pick = (i: number) => {
    setAuto(false)
    setActive(i)
  }
  const s = t.services[active]
  const ask = gate({ key: s.k, path: "/app", q: s.q })
  const delay = (ms: number) => ({ animationDelay: `${ms}ms` })

  return (
    <div ref={box} className="grid items-start gap-x-[clamp(32px,5vw,88px)] gap-y-8 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <div role="tablist" aria-label={t.nav.layanan} className="-mx-[clamp(20px,4vw,48px)] flex gap-2 overflow-x-auto px-[clamp(20px,4vw,48px)] pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {t.services.map((v, i) => {
          const on = i === active
          return (
            <button
              key={v.k}
              type="button"
              role="tab"
              aria-selected={on}
              data-reveal
              data-delay={120 + i * 70}
              onClick={() => pick(i)}
              onMouseEnter={() => pick(i)}
              className={`group flex min-h-12 flex-none cursor-pointer items-center gap-3.5 rounded-[20px] border p-2.5 pr-4 text-left transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)] lg:p-3 lg:pr-5 ${on ? "border-primary bg-card shadow-[0_20px_40px_-26px_rgba(10,122,102,.55)] lg:translate-x-2" : "border-transparent hover:bg-card/60"}`}
            >
              <span aria-hidden className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] transition-all duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] ${on ? "rotate-[-6deg] bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                <Icon d={ICONS[v.k]} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="whitespace-nowrap text-[15px] font-semibold lg:text-[17px]">{v.name}</span>
                <span className="hidden text-[13px] text-muted-foreground lg:block">{v.desc}</span>
              </span>
              <span aria-hidden className={`ml-auto hidden transition-all duration-500 lg:block ${on ? "text-primary opacity-100" : "-translate-x-1 opacity-0"}`}>
                <Arrow size={16} />
              </span>
            </button>
          )
        })}
      </div>

      <div data-reveal data-delay="160" className={CARD}>
        {/* key: ganti layanan = percakapan diputar ulang dari awal */}
        <div key={s.k + t.sampleTag} role="tabpanel" aria-live="polite" className="flex min-h-[380px] flex-col justify-end gap-3.5 p-[clamp(16px,2.4vw,24px)]">
          <div className={`${USER_BUBBLE} ${MSG_IN}`}>{s.q}</div>
          <div className={`${BOT_BUBBLE} ${MSG_IN}`} style={delay(450)}>{s.a}</div>
          <div className={`self-stretch ${MSG_IN}`} style={delay(850)}>
            {s.k === "dispensasi" && (
              <div className="flex flex-col gap-3 rounded-[18px] border p-4">
                <span className="text-sm font-semibold">{t.checksTitle}</span>
                {t.checks.map(([label, state], i) => (
                  <div key={label} className={`flex items-center justify-between gap-3 text-sm ${MSG_IN}`} style={delay(1000 + i * 160)}>
                    <span className="flex items-center gap-2.5">
                      <span className={`flex size-5 items-center justify-center rounded-full ${state === "ok" ? "bg-primary text-primary-foreground" : "border-2 border-dashed border-input"}`}>{state === "ok" && <Check size={12} />}</span>
                      {label}
                    </span>
                    {state !== "ok" && <span className="text-xs text-muted-foreground">{state}</span>}
                  </div>
                ))}
                <button type="button" onClick={ask} className={`${BTN_ACC} mt-1 self-start`}>{t.dispAction}<Arrow size={15} /></button>
              </div>
            )}
            {s.k === "akademik" && (
              <div className="flex flex-col gap-3 rounded-[18px] border p-4">
                <span className="text-xs font-medium text-muted-foreground">{t.citeTitle}</span>
                <span className="flex items-center gap-2.5 border-l-2 border-primary pl-3 text-[15px] font-semibold">{t.citeDoc}</span>
                <span className="text-[13px] text-muted-foreground">{t.citeNote}</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={ask} className={BTN_ACC}>{t.citeAsk}<Arrow size={15} /></button>
                  <button type="button" onClick={gate({ key: "tiket", path: "/app", q: s.q })} className="h-10 cursor-pointer rounded-full border border-input px-4 text-sm font-medium transition-colors hover:border-foreground">{t.citeTicket}</button>
                </div>
              </div>
            )}
            {s.k === "ruang" && (
              <div className="flex flex-col gap-2">
                {t.rooms.map(([code, kind, cap], i) => (
                  <div key={code} className={`flex items-center justify-between gap-3 rounded-[16px] border p-3.5 ${MSG_IN}`} style={delay(950 + i * 150)}>
                    <span className="flex items-center gap-3">
                      <span className="rounded-lg bg-accent px-2.5 py-1.5 font-mono text-[13px] font-medium text-accent-foreground">{code}</span>
                      <span className="flex flex-col">
                        <span className="text-sm font-semibold">{kind}</span>
                        <span className="text-xs text-muted-foreground">{cap}</span>
                      </span>
                    </span>
                    <button type="button" onClick={gate({ key: "ruang", path: "/app", q: s.q })} className={BTN_ACC}>{t.roomHold}</button>
                  </div>
                ))}
              </div>
            )}
            {s.k === "kerusakan" && (
              <div className="flex flex-col gap-3 rounded-[18px] border p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold">{t.reportTitle}</span>
                    <span className="text-xs text-muted-foreground">{t.reportRoom}</span>
                  </span>
                  <span className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-medium text-warn">{t.reportUrgency}</span>
                </div>
                <span className={`flex items-center gap-2 text-sm text-primary ${MSG_IN}`} style={delay(1150)}><Check />{t.reportStatus}</span>
                <button type="button" onClick={ask} className={`${BTN_ACC} self-start`}>{t.reportAction}<Arrow size={15} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- 03 Cara kerja: percakapan yang berjalan sendiri; hover/ketuk tahap = lompat ke tahap itu ---------- */

// 6 tahap x 3 sub-langkah; React hanya render ulang saat sub-langkah berganti,
// ketikan, teks yang mengalir, dan garis progres diisi langsung ke DOM tiap frame.
const STAGES = 6, SUBS = 3
const DUR = [2600, 1500, 2400, 2800, 2400, 2800] // lama tiap tahap (ms)
const END = STAGES - 0.001

function Story({ t, gate, motion }: { t: Dict; gate: Gate; motion: Motion }) {
  const box = useRef<HTMLElement>(null)
  const typed = useRef<HTMLSpanElement>(null)
  const streamed = useRef<HTMLSpanElement>(null)
  const line = useRef<HTMLSpanElement>(null)
  const segs = useRef<(HTMLSpanElement | null)[]>([])
  const pos = useRef(motion === "off" ? END : 0) // posisi 0..6 (tahap + progres di dalamnya)
  const hold = useRef<number | null>(null) // tahap yang sedang di-hover/diketuk
  const rest = useRef(0) // jeda di akhir sebelum mengulang
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [k, setK] = useState(motion === "off" ? STAGES * SUBS - 1 : 0)
  const stage = Math.floor(k / SUBS), sub = k % SUBS

  // tulis ke DOM sesuai posisi (tanpa render React)
  const sync = useCallback((p: number) => {
    const st = Math.floor(p), local = p - st
    if (line.current) line.current.style.transform = `scaleY(${p / STAGES})`
    segs.current.forEach((s, i) => s && (s.style.transform = `scaleX(${clamp(p - i)})`))
    if (typed.current) typed.current.textContent = st === 0 ? t.sPrompt.slice(0, Math.round(t.sPrompt.length * clamp(local / 0.75))) : ""
    if (streamed.current) streamed.current.textContent = st === 3 ? t.sAnswer.slice(0, Math.round(t.sAnswer.length * clamp(local / 0.8))) : t.sAnswer
  }, [t])
  const paint = useCallback((p: number) => {
    setK(Math.floor(p * SUBS))
    sync(p)
  }, [sync])
  // elemen baru (mis. gelembung jawaban) terpasang setelah render: isi ulang DOM-nya
  useEffect(() => sync(pos.current), [k, sync])

  useEffect(() => {
    if (motion === "off") {
      if (hold.current === null) pos.current = END
      paint(pos.current)
      return
    }
    const el = box.current
    if (!el) return
    let raf = 0, last = performance.now(), visible = false
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    const frame = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      if (visible) {
        const h = hold.current
        if (rest.current > 0) {
          rest.current -= dt
          if (rest.current <= 0) pos.current = 0
        } else if (h === null || pos.current < h + 0.999) {
          pos.current += dt / DUR[Math.min(STAGES - 1, Math.floor(pos.current))]
          if (h !== null) pos.current = Math.min(pos.current, h + 0.999) // berhenti di akhir tahap yang di-hover
          if (pos.current >= END) {
            pos.current = END
            rest.current = 2800
          }
        }
        paint(pos.current)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [motion, paint])

  const focusStage = (i: number) => {
    hold.current = i
    rest.current = 0
    pos.current = motion === "off" ? i + 0.999 : i
    paint(pos.current)
  }
  const release = () => (hold.current = null)
  // ketuk (HP): tahan di tahap itu sebentar, lalu lanjut jalan sendiri
  const tap = (i: number) => {
    focusStage(i)
    clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(release, 6000)
  }
  useEffect(() => () => clearTimeout(tapTimer.current), [])

  const tracked = stage === 5 ? sub + 1 : 0 // jumlah tahap status yang sudah centang

  return (
    <section id="cara-kerja" ref={box} className={`relative flex min-h-dvh flex-col justify-center pt-[max(96px,12vh)] pb-[max(40px,6vh)] ${GUTTER}`}>
      <div className="mx-auto grid w-full max-w-[1376px] items-center gap-x-[clamp(32px,5vw,88px)] gap-y-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col">
          <h2 data-reveal="clip" className={H2}>
            <span className="block">{t.storyA}</span>
            <span className="block text-primary">{t.storyB}</span>
          </h2>
          <p data-reveal data-delay="120" className={`mt-4 max-w-[440px] ${SUB}`}>{t.storySub}</p>

          {/* alur di layar lebar: satu garis yang terisi; hover/fokus = lompat ke tahap itu */}
          <ol className="relative mt-[clamp(20px,4vh,40px)] hidden list-none flex-col p-0 lg:flex" onMouseLeave={release}>
            <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-0.5 bg-border" />
            <span ref={line} aria-hidden className="absolute bottom-3 left-[11px] top-3 w-0.5 origin-top bg-primary" style={{ transform: "scaleY(0)" }} />
            {t.steps.map(([label, desc], i) => {
              const done = i < stage, on = i === stage
              return (
                <li key={label} aria-current={on ? "step" : undefined} className="relative">
                  <button type="button" onMouseEnter={() => focusStage(i)} onFocus={() => focusStage(i)} onBlur={release} onClick={() => focusStage(i)} className="group flex w-full cursor-pointer gap-4 py-[clamp(4px,1vh,9px)] text-left transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)] hover:translate-x-1">
                    <span className={`relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${done ? "border-primary bg-primary text-primary-foreground" : on ? "scale-110 border-primary bg-background" : "border-border bg-background"}`}>
                      {done && <Check size={12} />}
                      {on && <span className="size-2 rounded-full bg-primary animate-[layanPulse_2.4s_infinite]" />}
                    </span>
                    <span className="flex flex-col">
                      <span className={`text-[17px] font-semibold transition-colors duration-500 group-hover:text-foreground ${on ? "text-foreground" : done ? "text-soft-foreground" : "text-subtle-foreground"}`}>{label}</span>
                      <span className="grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0 }}>
                        <span className="overflow-hidden text-[14.5px] leading-normal text-muted-foreground">{desc}</span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          {/* alur di HP: 6 segmen yang bisa diketuk + tahap aktif */}
          <div className="mt-4 flex flex-col gap-2.5 lg:hidden">
            <div className="grid grid-cols-6 gap-1.5">
              {t.steps.map(([label], i) => (
                <button key={label} type="button" onClick={() => tap(i)} aria-label={label} aria-current={i === stage ? "step" : undefined} className="flex h-6 cursor-pointer items-center">
                  <span className="relative h-1 w-full overflow-hidden rounded-full bg-border">
                    <span ref={(n) => { segs.current[i] = n }} className="absolute inset-0 origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
                  </span>
                </button>
              ))}
            </div>
            <span key={stage} className={`flex items-baseline gap-2 ${MSG_IN}`}>
              <span className="text-[15px] font-semibold">{t.steps[stage][0]}</span>
              <span className="truncate text-[13px] text-muted-foreground">{t.steps[stage][1]}</span>
            </span>
          </div>
        </div>

        <div className={`flex h-[min(560px,70dvh)] flex-col lg:h-[min(620px,calc(100dvh-200px))] ${CARD}`}>
          <div aria-live="polite" className="flex min-h-0 flex-1 flex-col justify-end gap-3.5 overflow-hidden p-[clamp(16px,2.4vw,24px)] [mask-image:linear-gradient(to_bottom,transparent,#000_40px)]">
            <div className="flex flex-col gap-1 text-[length:clamp(22px,2.3vw,32px)] font-semibold leading-[1.15] tracking-[-.03em]">
              <div className="text-subtle-foreground">{t.greet1}</div>
              <div>{t.greet2}</div>
            </div>
            {stage >= 1 && <div className={`${USER_BUBBLE} ${MSG_IN}`}>{t.sPrompt}</div>}

            {stage === 1 && (
              <div className={`flex items-center gap-3 self-start rounded-[18px_18px_18px_6px] bg-muted px-4 py-3.5 ${MSG_IN}`}>
                <Dots />
                <span className="text-[13px] font-medium text-muted-foreground">{t.sUnderstand}</span>
              </div>
            )}

            {stage === 2 && (
              <div className={`flex min-w-[min(100%,300px)] flex-col gap-2.5 self-start rounded-[18px_18px_18px_6px] bg-muted px-4 py-3.5 ${MSG_IN}`}>
                <span className="flex items-center gap-3"><Dots /><span className="text-[13px] font-semibold">{t.sSearch[sub]}</span></span>
                <span className="flex flex-col gap-1.5 border-t pt-2.5">
                  {t.sSearch.map((x, i) => (
                    <span key={x} className={`flex items-center gap-2 text-xs transition-colors duration-300 ${i < sub ? "text-muted-foreground" : i === sub ? "font-medium" : "text-subtle-foreground"}`}>
                      <span className={`flex size-3.5 items-center justify-center rounded-full ${i < sub ? "bg-primary text-primary-foreground" : "border border-input"}`}>{i < sub && <Check size={9} />}</span>
                      {x}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {stage >= 3 && (
              <span className={`flex items-center gap-2 self-start text-xs text-muted-foreground ${MSG_IN}`}>
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check size={10} /></span>
                {t.sSearched}
              </span>
            )}
            {stage >= 3 && <div className={`${BOT_BUBBLE} ${MSG_IN}`}><span ref={streamed} /></div>}

            {stage >= 4 && (
              <div className={`flex w-[min(100%,420px)] flex-col gap-3 self-start rounded-[18px] border bg-card p-4 ${MSG_IN}`}>
                <span className="text-sm font-semibold">{t.sDraft}</span>
                {t.sDraftRows.map((r) => (
                  <span key={r} className="flex items-center gap-2.5 text-sm">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check size={12} /></span>
                    {r}
                  </span>
                ))}
                {stage === 4 && sub < 2 ? (
                  <span className={`${BTN_ACC} mt-1 self-start ${sub === 1 ? "-translate-y-px bg-primary-hover shadow-[0_0_0_4px_rgba(10,122,102,.15)]" : ""}`}>{t.sSubmit}<Arrow size={15} /></span>
                ) : (
                  <span className={`mt-1 flex items-center gap-2 text-sm font-semibold text-primary ${MSG_IN}`}><Check />{t.sSubmitted}</span>
                )}
              </div>
            )}

            {stage === 5 && (
              <div className={`flex w-[min(100%,420px)] flex-col gap-3 self-start rounded-[18px] border bg-card p-4 ${MSG_IN}`}>
                <div className="grid grid-cols-3 gap-1.5">
                  {t.sTrack.map((x, i) => (
                    <span key={x} className="flex flex-col gap-2">
                      <span className="relative h-1 overflow-hidden rounded-full bg-border">
                        <span className="absolute inset-0 origin-left bg-primary transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ transform: `scaleX(${i < tracked ? 1 : 0})` }} />
                      </span>
                      <span className={`text-[12.5px] ${i < tracked ? "font-semibold" : "text-muted-foreground"}`}>{x}</span>
                    </span>
                  ))}
                </div>
                {tracked === 3 && <span className={`flex items-center gap-2 text-sm font-semibold text-primary ${MSG_IN}`}><Check />{t.sDone}</span>}
              </div>
            )}
          </div>
          <div className="border-t p-3.5">
            <button type="button" onClick={gate({ key: "dispensasi", path: "/app", q: t.sPrompt })} aria-label={t.askAria} className="flex min-h-14 w-full cursor-text items-center gap-3 rounded-2xl border bg-panel py-2 pl-[18px] pr-2 text-left transition-[border-color,box-shadow] duration-250 hover:border-primary hover:shadow-[0_0_0_4px_rgba(10,122,102,.08)]">
              <span className="min-w-0 flex-1 truncate text-[15px]">
                <span ref={typed} />
                {stage === 0 ? <span aria-hidden className="ml-0.5 inline-block h-[18px] w-0.5 bg-primary align-[-3px] animate-[layanBlink_1s_steps(1)_infinite]" /> : <span className="text-muted-foreground">{t.inputPh}</span>}
              </span>
              <span aria-hidden className={`flex size-10 items-center justify-center rounded-xl transition-colors duration-300 ${stage === 0 && sub === 2 ? "bg-primary text-primary-foreground" : "bg-ink text-ink-foreground"}`}><Up size={16} /></span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- halaman ---------- */

export function Landing() {
  const { me } = useStore()
  const router = useRouter()
  const lang = useSyncExternalStore(subscribeLang, readLang, () => "id" as Lang)
  const motion = useSyncExternalStore(subscribeMotion, readMotion, () => "on" as Motion)
  const cine = motion === "on" // hero sinematik (hanya layar >= 900px)
  const C = (cls: string) => (cine ? cls : "")
  const [scrolled, setScrolled] = useState(false)
  const [rail, setRail] = useState(0)
  const [menu, setMenu] = useState(false)
  const [intent, setIntent] = useState<Intent | null>(null)

  const root = useRef<HTMLDivElement>(null)
  const heroWrap = useRef<HTMLElement>(null)
  const heroHead = useRef<HTMLDivElement>(null)
  const heroChat = useRef<HTMLDivElement>(null)
  const heroCaption = useRef<HTMLDivElement>(null)
  const heroType = useRef<HTMLSpanElement>(null)
  const heroH1b = useRef<HTMLSpanElement>(null)
  const promptIdx = useRef(0)
  const modalRef = useRef<HTMLDivElement>(null)
  const modalPrimary = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<Element | null>(null)

  const t = DICT[lang]
  const modal = intent !== null

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const toggleMotion = () => {
    try {
      localStorage.setItem("layan_motion", motion === "on" ? "off" : "on")
    } catch {}
    window.dispatchEvent(new Event(MOTION_EVENT))
  }

  const setLang = (l: Lang) => {
    try {
      localStorage.setItem("layan_lang", l)
    } catch {}
    window.dispatchEvent(new Event(LANG_EVENT))
  }

  // scroll: nav mengecil, hero sinematik (layar lebar & gerak tidak dikurangi), link navbar aktif
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 900px)")
    const tick = () => {
      const vh = window.innerHeight
      setScrolled(window.scrollY > 24)
      const head = heroHead.current, chat = heroChat.current, cap = heroCaption.current, wrap = heroWrap.current
      if (wide.matches && !motionOff() && wrap && head && chat) {
        const p = clamp(-wrap.getBoundingClientRect().top / Math.max(1, wrap.offsetHeight - vh))
        const e = ease(p)
        head.style.transform = `translate3d(0, ${-vh * 0.28 * e}px, 0)`
        head.style.opacity = String(clamp(1 - p * 1.9))
        const finalTop = Math.max(150, (vh - chat.offsetHeight) / 2 + 48)
        chat.style.transform = `translate3d(0, ${(finalTop - vh) * e}px, 0) scale(${0.9 + 0.1 * e})`
        chat.style.opacity = String(clamp(e * 2.4))
        if (cap) {
          const o = clamp((p - 0.55) / 0.3)
          cap.style.opacity = String(o)
          cap.style.top = finalTop - 74 + "px"
          cap.style.transform = `translate3d(0, ${(1 - o) * 18}px, 0)`
        }
      } else if (head && chat) {
        head.style.transform = head.style.opacity = chat.style.transform = chat.style.opacity = ""
      }
      let r = 0
      SECTIONS.forEach((id, i) => {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= vh * 0.45) r = i
      })
      setRail(r)
    }
    let raf = 0
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), tick()))
    }
    tick()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    wide.addEventListener("change", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      wide.removeEventListener("change", onScroll)
    }
  }, [motion])

  // intro hero + reveal saat masuk layar: judul dibuka (clip), elemen lain naik; diulang saat masuk lagi
  useEffect(() => {
    const el = root.current
    if (!el || !Element.prototype.animate || motionOff()) return
    el.querySelectorAll<HTMLElement>("[data-intro-line]").forEach((n, i) =>
      n.animate([{ transform: "translateY(105%)" }, { transform: "none" }], { duration: 1100, delay: 120 + i * 110, easing: "cubic-bezier(.2,.8,.1,1)", fill: "backwards" }),
    )
    el.querySelectorAll<HTMLElement>("[data-intro]").forEach((n) => {
      const i = Number(n.dataset.intro)
      n.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: [0, 0, 420, 520][i] || 0, easing: EASE, fill: "backwards" })
    })
    const shown = new WeakSet<Element>()
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        const n = e.target as HTMLElement
        if (!e.isIntersecting) {
          // benar-benar keluar layar: sembunyikan lagi supaya diputar ulang saat kembali
          if (shown.has(n)) {
            shown.delete(n)
            n.style.opacity = "0"
          }
          return
        }
        if (shown.has(n) || e.intersectionRatio < 0.12) return
        shown.add(n)
        const dir = e.boundingClientRect.top < (e.rootBounds?.top ?? 0) + 1 ? -1 : 1 // masuk dari atas saat scroll naik
        n.style.opacity = ""
        const kf = n.dataset.reveal === "clip"
          ? [{ clipPath: dir > 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)", transform: `translateY(${28 * dir}px)` }, { clipPath: "inset(0 0 0 0)", transform: "none" }]
          : [{ opacity: 0, transform: `translateY(${44 * dir}px) scale(.96)` }, { opacity: 1, transform: "none" }]
        n.animate(kf, { duration: 900, delay: Number(n.dataset.delay || 0), easing: "cubic-bezier(.2,.9,.25,1.08)", fill: "backwards" })
      }),
      { threshold: [0, 0.12] },
    )
    el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((n) => {
      if (n.getBoundingClientRect().top > window.innerHeight) n.style.opacity = "0"
      else shown.add(n)
      io.observe(n)
    })
    return () => {
      io.disconnect()
      el.querySelectorAll<HTMLElement>("[data-reveal], [data-intro], [data-intro-line]").forEach((n) => {
        n.getAnimations().forEach((x) => x.cancel())
        n.style.opacity = ""
      })
    }
  }, [motion])

  // frasa h1 berganti (efek ketik)
  useEffect(() => {
    const h = heroH1b.current
    if (!h) return
    h.textContent = t.phrases[0]
    if (motionOff()) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const later = (f: () => void, ms: number) => timers.push(setTimeout(f, ms))
    let i = 0, ch = t.phrases[0].length, dir = -1
    const step = () => {
      const txt = t.phrases[i % t.phrases.length]
      if (dir === -1) {
        h.textContent = txt.slice(0, Math.max(0, --ch))
        if (ch <= 0) return (dir = 1), i++, later(step, 380)
        later(step, 30)
      } else {
        h.textContent = txt.slice(0, ++ch)
        if (ch >= txt.length) return (dir = -1), later(step, 2600)
        later(step, 60 + Math.random() * 55)
      }
    }
    later(step, 3400)
    return () => timers.forEach(clearTimeout)
  }, [t, motion])

  // prompt contoh diketik di kotak chat hero; indeksnya dipakai saat kotak diklik
  useEffect(() => {
    const el = heroType.current
    if (!el) return
    promptIdx.current = 0
    if (motionOff()) {
      el.textContent = t.prompts[0]
      return
    }
    let i = 0, ch = 0, dir = 1, timer: ReturnType<typeof setTimeout>
    el.textContent = ""
    const step = () => {
      promptIdx.current = i % t.prompts.length
      const txt = t.prompts[promptIdx.current]
      if (dir === 1) {
        el.textContent = txt.slice(0, ++ch)
        if (ch >= txt.length) return (dir = -1), (timer = setTimeout(step, 2400))
        timer = setTimeout(step, 34 + Math.random() * 46)
      } else {
        ch = Math.max(0, ch - 3)
        el.textContent = txt.slice(0, ch)
        if (ch === 0) return (dir = 1), i++, (timer = setTimeout(step, 420))
        timer = setTimeout(step, 16)
      }
    }
    timer = setTimeout(step, 1300)
    return () => clearTimeout(timer)
  }, [t, motion])

  // modal: kunci scroll, fokus ke tombol utama, Esc & trap Tab, fokus kembali saat ditutup
  useEffect(() => {
    if (!modal) return
    document.body.style.overflow = "hidden"
    const f = setTimeout(() => modalPrimary.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setIntent(null)
      } else if (e.key === "Tab" && modalRef.current) {
        const els = Array.from(modalRef.current.querySelectorAll<HTMLElement>("button"))
        const first = els[0], last = els[els.length - 1]
        const wrap = e.shiftKey ? document.activeElement === first && last : document.activeElement === last && first
        if (wrap) {
          e.preventDefault()
          wrap.focus()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(f)
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
      ;(lastFocus.current as HTMLElement | null)?.focus?.()
    }
  }, [modal])

  const nextOf = (i: Intent) => (i.q ? `${i.path}?q=${encodeURIComponent(i.q)}` : i.path)
  const gate: Gate = (i) => () => {
    if (me) return router.push(me.role === "mahasiswa" ? nextOf(i) : HOME[me.role])
    lastFocus.current = document.activeElement
    setMenu(false)
    setIntent(i)
  }
  const goLogin = () => intent && router.push(`/login?next=${encodeURIComponent(nextOf(intent))}`)
  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: motionOff() ? "auto" : "smooth" })
    setMenu(false)
  }
  const link = (id: string) => (e: React.MouseEvent) => (e.preventDefault(), scrollToId(id))
  const promptOf = (k: string) => t.services.find((s) => s.k === k)?.q

  const navLinks = ([["layanan", t.nav.layanan, 1], ["cara-kerja", t.nav.cara, 2], ["mulai", t.nav.app, 3]] as const).map(([id, label, idx]) => ({ id, label, on: rail === idx }))
  const nav = scrolled
    ? { outer: "12px 12px 0", maxW: 1040, h: 58, inner: "10px", bg: "color-mix(in srgb, var(--background) 84%, transparent)", bd: "var(--border)", blur: "blur(14px) saturate(1.4)", sh: "0 12px 40px -20px rgba(22,24,26,.25)" }
    : { outer: "18px 12px 0", maxW: 1400, h: 64, inner: "clamp(8px,2vw,24px)", bg: "transparent", bd: "transparent", blur: "none", sh: "none" }
  const initial = ((me?.name || t.student).trim()[0] || "M").toUpperCase()

  return (
    <div ref={root} data-motion={motion} className="layan-landing min-h-dvh overflow-x-clip bg-background text-foreground antialiased selection:bg-accent [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-[3px] [&_:focus-visible]:outline-ring">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-60 flex justify-center transition-[padding] duration-[450ms] ease-[cubic-bezier(.2,.7,.2,1)]" style={{ padding: nav.outer }}>
        <nav
          aria-label={t.navAria}
          className="pointer-events-auto flex w-full items-center justify-between gap-4 rounded-[18px] border transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)]"
          style={{ maxWidth: nav.maxW, height: nav.h, padding: `0 ${nav.inner}`, background: nav.bg, borderColor: nav.bd, backdropFilter: nav.blur, WebkitBackdropFilter: nav.blur, boxShadow: nav.sh }}
        >
          <a href="#top" onClick={link("top")} aria-label="LAYAN" className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-[.04em] text-foreground">
            <Mark size={26} />
            LAYAN
          </a>
          <div className="hidden items-center gap-0.5 min-[1080px]:flex">
            {navLinks.map((l) => (
              <a key={l.id} href={"#" + l.id} onClick={link(l.id)} aria-current={l.on || undefined} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[14.5px] font-medium transition-colors duration-300 hover:bg-foreground/5 hover:text-foreground ${l.on ? "bg-foreground/[.06] text-foreground" : "text-muted-foreground"}`}>
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <button type="button" role="switch" aria-checked={motion === "on"} onClick={toggleMotion} className={`hidden h-11 pl-4 pr-1.5 min-[1080px]:flex cursor-pointer items-center gap-2.5 rounded-full border bg-card/60 text-[13.5px] font-medium transition-colors duration-300 hover:text-foreground ${motion === "on" ? "text-foreground" : "text-muted-foreground"}`}>
              {t.motionLabel}
              <span aria-hidden className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300 ${motion === "on" ? "bg-primary" : "bg-input"}`}>
                <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-card shadow-sm transition-transform duration-300 ease-out ${motion === "on" ? "translate-x-4" : "translate-x-0"}`} />
              </span>
            </button>
            <div role="group" aria-label={t.langLabel} className="flex rounded-full border bg-card/60 p-1">
              {(["id", "en"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={`h-9 min-w-11 cursor-pointer rounded-full px-3 font-mono text-xs font-medium uppercase tracking-[.06em] transition-colors duration-300 ${lang === l ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button type="button" onClick={gate({ key: me ? "app" : "start", path: "/app" })} className={`${BTN_DARK} h-11 gap-2.5 pr-4 text-[14.5px] hover:gap-[13px]`} style={{ paddingLeft: me ? 6 : 18 }}>
              {me && <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">{initial}</span>}
              {me ? t.open : t.signin}
            </button>
            <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label={t.nav.menu} className="flex size-11 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-full border bg-card/70 min-[1080px]:hidden">
              <span className="h-[1.5px] w-4 bg-foreground transition-transform duration-300" style={{ transform: menu ? "translateY(3.25px) rotate(45deg)" : "none" }} />
              <span className="h-[1.5px] w-4 bg-foreground transition-transform duration-300" style={{ transform: menu ? "translateY(-3.25px) rotate(-45deg)" : "none" }} />
            </button>
          </div>
        </nav>
      </header>
      {menu && (
        <div className="fixed inset-x-3 top-[80px] z-[59] flex flex-col rounded-[20px] border bg-card p-2.5 shadow-[0_30px_60px_-30px_rgba(22,24,26,.3)] animate-[layanMsgIn_.35s_cubic-bezier(.2,.7,.2,1)_both] min-[1080px]:hidden">
          {navLinks.map((l) => (
            <a key={l.id} href={"#" + l.id} onClick={link(l.id)} className="rounded-xl px-3.5 py-4 text-xl font-medium tracking-[-.02em] text-foreground hover:bg-muted">
              {l.label}
            </a>
          ))}
          <button type="button" role="switch" aria-checked={motion === "on"} onClick={toggleMotion} className={`mt-1 flex h-12 justify-between px-3.5 cursor-pointer items-center gap-2.5 rounded-full border bg-card/60 text-[13.5px] font-medium transition-colors duration-300 hover:text-foreground ${motion === "on" ? "text-foreground" : "text-muted-foreground"}`}>
            {t.motionLabel}
            <span aria-hidden className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300 ${motion === "on" ? "bg-primary" : "bg-input"}`}>
              <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-card shadow-sm transition-transform duration-300 ease-out ${motion === "on" ? "translate-x-4" : "translate-x-0"}`} />
            </span>
          </button>
        </div>
      )}

      <main>
        {/* 01 Hero: layar lebar sinematik (sticky 210vh), chat naik & membesar saat di-scroll */}
        <section id="top" ref={heroWrap} className={`relative overflow-x-clip ${C("min-[900px]:h-[210vh]")}`}>
          {/* cahaya lembut di atas hero supaya latar tidak datar; ikut token tema */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_44%_at_50%_0%,var(--accent)_0%,transparent_70%)]" />
          <div className={`relative pb-[72px] ${C("min-[900px]:sticky min-[900px]:top-0 min-[900px]:h-dvh min-[900px]:overflow-hidden min-[900px]:pb-0")}`}>
            <div ref={heroHead} className={`relative mx-auto max-w-[1376px] pt-[clamp(112px,16vh,152px)] ${GUTTER} will-change-[transform,opacity] ${C("min-[900px]:flex min-[900px]:h-full min-[900px]:flex-col min-[900px]:justify-center min-[900px]:pt-16")}`}>
              <h1 className="text-[length:clamp(44px,min(7vw,12vh),116px)] font-semibold leading-[1] tracking-[-.045em]">
                <span className="sr-only">{t.h1a} {t.phrases[0]}</span>
                <span className="block overflow-hidden pb-[.1em]">
                  <span data-intro-line aria-hidden className="block">{t.h1a}</span>
                </span>
                <span className="-mt-[.1em] block overflow-hidden pb-[.1em]">
                  <span data-intro-line aria-hidden className="block text-primary">
                    <span ref={heroH1b}>{t.phrases[0]}</span>
                    <span className="ml-[.06em] inline-block h-[.8em] w-[.055em] rounded-[1px] bg-primary align-[-.03em] animate-[layanBlink_1.05s_steps(1)_infinite]" />
                  </span>
                </span>
              </h1>
              <div className="mt-[clamp(22px,3.6vh,40px)] flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
                <p data-intro="2" className="m-0 max-w-[560px] text-[length:clamp(16px,1.25vw,19px)] leading-normal text-soft-foreground text-pretty">{t.heroSub}</p>
                <div data-intro="3" className="flex flex-wrap gap-3">
                  <Magnetic>
                    <button type="button" onClick={gate({ key: "start", path: "/app" })} className={`${BTN_DARK} h-[54px] gap-2.5 pl-[26px] pr-[22px] text-base shadow-[0_10px_30px_-12px_rgba(22,24,26,.5)] hover:gap-[15px]`}>
                      {t.cta1}
                      <Arrow />
                    </button>
                  </Magnetic>
                  <button type="button" onClick={() => scrollToId("cara-kerja")} className={`${BTN_LINE} h-[54px] gap-2.5 px-6 text-base`}>
                    {t.cta2}
                  </button>
                </div>
              </div>
            </div>

            <div ref={heroCaption} className={`pointer-events-none absolute inset-x-0 top-24 hidden px-5 text-center text-[length:clamp(24px,2.6vw,40px)] font-semibold tracking-[-.03em] opacity-0 ${C("min-[900px]:block")}`}>
              {t.caption}
            </div>

            <div ref={heroChat} className={`relative inset-x-0 mx-auto mt-14 w-[min(960px,calc(100%-32px))] origin-top will-change-transform ${C("min-[900px]:absolute min-[900px]:top-full min-[900px]:mt-0")}`}>
              <DoodleArrow className="pointer-events-none absolute -left-20 top-8 hidden w-24 text-primary opacity-50 min-[1280px]:block" />
              <Sparkles className="pointer-events-none absolute -right-16 top-20 hidden w-24 text-primary opacity-40 min-[1280px]:block" />
              <div className="overflow-hidden rounded-[28px] border bg-card shadow-[0_1px_0_rgba(22,24,26,.04),0_50px_120px_-60px_rgba(22,24,26,.4)]">
                <div className="flex flex-col gap-[22px] p-[clamp(20px,3vw,36px)]">
                  <div className="text-[length:clamp(22px,2.3vw,32px)] font-semibold leading-[1.15] tracking-[-.03em]">
                    <div className="text-subtle-foreground">{t.greet1}</div>
                    <div>{t.greet2}</div>
                  </div>
                  <button type="button" onClick={() => gate({ key: "ask", path: "/app", q: t.prompts[promptIdx.current] })()} aria-label={t.askAria} className="flex min-h-[66px] w-full cursor-text items-center gap-3 rounded-[18px] border bg-panel py-2.5 pl-5 pr-2.5 text-left transition-[border-color,box-shadow] duration-250 hover:border-primary hover:shadow-[0_0_0_4px_rgba(10,122,102,.08)]">
                    <span className="min-w-0 flex-1 truncate text-base">
                      <span ref={heroType} />
                      <span aria-hidden className="ml-0.5 inline-block h-[19px] w-0.5 bg-primary align-[-4px] animate-[layanBlink_1s_steps(1)_infinite]" />
                    </span>
                    <span aria-hidden className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] bg-ink text-ink-foreground"><Up /></span>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {t.services.map((s) => (
                      <button key={s.k} type="button" onClick={gate({ key: s.k, path: "/app", q: s.q })} className="h-11 cursor-pointer rounded-full border px-4 text-sm font-medium transition-all duration-250 hover:-translate-y-px hover:border-primary hover:bg-accent hover:text-accent-foreground">
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2.5">
                    {t.quick.map(([k, title, sub]) => (
                      <button key={k} type="button" onClick={k === "status" ? gate({ key: "status", path: "/app/riwayat" }) : gate({ key: k, path: "/app", q: promptOf(k) })} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-muted p-3.5 text-left transition-all duration-250 hover:-translate-y-0.5 hover:bg-accent active:scale-[.98]">
                        <span aria-hidden className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] border bg-card text-primary"><Icon d={ICONS[k]} size={18} /></span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-[14.5px] font-semibold">{title}</span>
                          <span className="text-[12.5px] text-muted-foreground">{sub}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 02 Layanan */}
        <section id="layanan" className={`relative flex min-h-dvh flex-col justify-center pt-[max(96px,12vh)] pb-[max(40px,6vh)] ${GUTTER}`}>
          <div className="mx-auto w-full max-w-[1376px]">
            <h2 data-reveal="clip" className={H2}>
              <span className="block">{t.svcA}</span>
              <span className="block text-muted-foreground">{t.svcB}</span>
            </h2>
            <p data-reveal data-delay="100" className={`mt-4 mb-[clamp(24px,5vh,48px)] max-w-[520px] ${SUB}`}>{t.svcSub}</p>
            <ServiceDemo t={t} gate={gate} motion={motion} />
          </div>
        </section>

        {/* 03 Cara kerja: adegan scroll */}
        <Story t={t} gate={gate} motion={motion} />

        {/* 04 Penutup + footer */}
        <section id="mulai" className="relative flex min-h-[80dvh] flex-col">
          <div className={`mx-auto flex w-full max-w-[1376px] flex-1 flex-col justify-center py-[clamp(64px,12vh,120px)] ${GUTTER}`}>
            <h2 data-reveal="clip" className={`max-w-[16ch] ${H2}`}>{t.finalTitle}</h2>
            <p data-reveal data-delay="100" className={`mt-5 max-w-[520px] ${SUB}`}>{t.finalSub}</p>
            {/* 4 layanan menyala bergiliran (satu putaran 4,8 detik); klik = mulai layanan itu */}
            <div className="mt-8 flex flex-wrap gap-2.5">
              {t.services.map((v, i) => (
                <button
                  key={v.k}
                  type="button"
                  data-reveal
                  data-delay={160 + i * 70}
                  onClick={gate({ key: v.k, path: "/app", q: v.q })}
                  className="group flex h-12 cursor-pointer items-center gap-2.5 rounded-full border bg-card pl-1.5 pr-4 text-sm font-semibold transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-1 active:scale-[.97] animate-[layanCycle_4.8s_infinite]"
                  style={{ animationDelay: `${i * 1.2}s` }}
                >
                  <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-muted text-primary transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] group-hover:rotate-[-10deg] group-hover:scale-110">
                    <Icon d={ICONS[v.k]} size={17} />
                  </span>
                  {v.name}
                </button>
              ))}
            </div>
            <div data-reveal data-delay="460" className="mt-6 flex flex-wrap gap-3">
              <Magnetic>
                <button type="button" onClick={gate({ key: "start", path: "/app" })} className={`${BTN_DARK} h-[54px] gap-2.5 pl-[26px] pr-[22px] text-base hover:gap-[15px]`}>
                  {t.cta1}
                  <Arrow />
                </button>
              </Magnetic>
              <a href="/api/app/layan.apk" download className={`group ${BTN_LINE} h-[54px] gap-2.5 px-6 text-base`}>
                <span className="group-hover:animate-[layanNudge_.9s_ease-in-out_infinite]"><Download /></span>
                {t.appAndroid}
              </a>
            </div>
          </div>
          <footer className={`border-t py-6 ${GUTTER}`}>
            <div className="mx-auto flex max-w-[1376px] flex-wrap items-center justify-between gap-4 text-[13.5px] text-muted-foreground">
              <div className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-[.04em] text-foreground">
                <Mark size={22} />
                LAYAN
                <span className="text-[13.5px] font-normal tracking-normal text-muted-foreground">{t.foot}</span>
              </div>
              <span>© 2026 LAYAN</span>
            </div>
          </footer>
        </section>
      </main>

      {/* Modal masuk: menyebut aksi & pertanyaan yang akan dilanjutkan setelah login */}
      <div aria-hidden={!modal} inert={!modal} className="fixed inset-0 z-100 flex items-center justify-center p-5" style={{ visibility: modal ? "visible" : "hidden", transition: `visibility 0s linear ${modal ? "0s" : ".5s"}` }}>
        <div onClick={() => setIntent(null)} className="absolute inset-0 bg-[rgba(18,20,18,.46)] transition-opacity duration-400" style={{ opacity: modal ? 1 : 0 }} />
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="layan-auth-title"
          aria-describedby="layan-auth-desc"
          className="relative w-full max-w-[460px] rounded-[28px] bg-card p-7 shadow-[0_60px_140px_-40px_rgba(22,24,26,.55)]"
          style={{ opacity: modal ? 1 : 0, transform: modal ? "none" : "scale(.96) translateY(8px)", transition: `opacity .4s ${EASE}, transform .5s ${EASE}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-base font-extrabold tracking-[.04em]">
              <Mark size={28} />
              LAYAN
            </div>
            <button type="button" onClick={() => setIntent(null)} aria-label={t.mClose} className="flex size-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Icon d="M6 6l12 12M18 6L6 18" size={16} sw={1.8} />
            </button>
          </div>
          <h2 id="layan-auth-title" className="mt-6 text-[28px] font-semibold leading-[1.1] tracking-[-.03em]">{t.mTitle}</h2>
          <p id="layan-auth-desc" className="mt-3 text-[15px] leading-[1.55] text-soft-foreground text-pretty">{t.mDesc}</p>
          <div className="mt-5 flex flex-col gap-2.5 rounded-2xl bg-muted p-4">
            <span className="text-[12.5px] text-muted-foreground">{t.mNext}</span>
            <span className="flex items-center gap-2 text-[15px] font-semibold">
              <span className="text-primary"><Arrow size={16} /></span>
              {intent ? t.intents[intent.key] ?? t.intents.start : ""}
            </span>
            {intent?.q && (
              <>
                <span className="rounded-[14px_14px_14px_4px] border bg-card px-3.5 py-2.5 text-sm">“{intent.q}”</span>
                <span className="text-xs text-muted-foreground">{t.mQuoteNote}</span>
              </>
            )}
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <button ref={modalPrimary} type="button" onClick={goLogin} className={`${BTN_DARK} h-[54px] justify-center gap-2.5 rounded-2xl text-base hover:gap-3.5 hover:translate-y-0`}>
              {t.mPrimary}
              <Arrow size={17} />
            </button>
            <button type="button" onClick={() => setIntent(null)} className="h-12 cursor-pointer rounded-2xl text-[15px] font-medium transition-colors hover:bg-muted">
              {t.mCancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
