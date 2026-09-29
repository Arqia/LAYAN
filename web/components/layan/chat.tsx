"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowUp, CalendarClock, ChevronRight, CircleAlert, CircleCheck, History, Paperclip, RefreshCw, ShieldCheck, WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Worker } from "@/lib/data"
import {
  AnswerCard, BookingHeldCard, ChecksCard, CollapsedCard, DraftCard, FormCard, LetterDoneCard,
  ReportCard, RoomsCard, TicketCard, UPLOAD_INPUT_ID, UploadCard, type Room,
} from "./action-cards"
import { AccountPill } from "./app-bar"
import { AgentAvatar, FileTypeTile, Mark, TypingDots, WorkerTile, formatSize } from "./primitives"
import { useStore, type FileInfo, type Msg } from "./store"

/* ---------- koneksi (native online/offline event) ---------- */

function subscribe(cb: () => void) {
  window.addEventListener("online", cb)
  window.addEventListener("offline", cb)
  return () => {
    window.removeEventListener("online", cb)
    window.removeEventListener("offline", cb)
  }
}
const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true)

/* ---------- alur demo ---------- */

const SHORTCUTS: { worker: Worker; title: string; sub: string; prompt: string }[] = [
  { worker: "surat", title: "Minta surat", sub: "Aktif kuliah, dispensasi", prompt: "Kak, aku mau minta surat izin lomba tanggal 10–12 Oktober" },
  { worker: "helpdesk", title: "Tanya aturan akademik", sub: "SKS, cuti, nilai. Lengkap dengan sumber", prompt: "Batas maksimal SKS kalau IP semester lalu 3,2 berapa?" },
  { worker: "fasilitas", title: "Lapor kerusakan / booking ruangan", sub: "Cek bentrok, langsung ke teknisi", prompt: "Mau booking ruang rapat Jumat 13.00–15.00, 20 orang" },
]

const DRAFT_STEPS = [
  { doing: "Mengecek syarat surat", done: "Status aktif, UKT lunas" },
  { doing: "Membuat draft Surat Dispensasi", done: "Menyusun draft PDF" },
  { doing: "Mengirim ke staf", done: "Kirim ke staf untuk persetujuan" },
]

const uid = () => Math.random().toString(36).slice(2, 10)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const joinList = (s: string) => {
  const p = s.split(",").map((x) => x.trim()).filter(Boolean)
  return p.length > 1 ? `${p.slice(0, -1).join(", ")} dan ${p.at(-1)}` : p[0] ?? ""
}

function useFlows() {
  const { setMessages, setAgent } = useStore()
  const push = (...m: Msg[]) => setMessages((s) => [...s, ...m])
  const patch = (id: string, p: Partial<Msg>) => setMessages((s) => s.map((m) => (m.id === id ? ({ ...m, ...p } as Msg) : m)))
  const agentDo = async (label: string, msgs: Msg[], ms = 1100) => {
    setAgent({ label })
    await wait(ms)
    setAgent(null)
    push(...msgs)
  }
  const agent = (p: Omit<Extract<Msg, { from: "agent" }>, "id" | "from">): Msg => ({ id: uid(), from: "agent", ...p })

  async function uploadOk() {
    push(agent({ text: "Lampiran diterima. Sekarang aku cek syarat dan buat draft suratnya." }))
    for (let step = 0; step < DRAFT_STEPS.length; step++) {
      setAgent({ label: DRAFT_STEPS[step].doing, steps: DRAFT_STEPS.map((s) => s.done), step })
      await wait(1200)
    }
    setAgent(null)
    push(agent({ text: "Syarat surat sudah aku cek. Semua aman.", card: "checks" }))
    await wait(600)
    push(agent({ text: "Draft sudah aku kirim ke staf. Biasanya diproses di jam kerja.", card: "draft" }))
  }

  return {
    push,
    send(text: string, first: boolean) {
      const now = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      push(...(first ? [{ id: uid(), from: "time", text: `Hari ini · ${now}` } as Msg] : []), { id: uid(), from: "user", text })
      if (/rusak|mati|bocor|mampet|putus|kedip|tidak menyala|lapor/i.test(text))
        return agentDo("Mencatat laporan", [agent({ text: "Sudah aku catat dan teruskan ke teknisi. Makasih laporannya.", card: "report" })])
      if (/surat|izin|dispensasi|lomba/i.test(text))
        return agentDo("Mengambil data profil", [
          agent({ text: "Siap. Aku buatkan Surat Dispensasi ya. Data profil kamu sudah aku ambil. Tinggal dua hal:", card: "form", state: "active" }),
        ])
      if (/booking|pinjam|ruang/i.test(text))
        return agentDo("Mengecek jadwal ruangan", [agent({ text: "G2.4 sudah dipakai di jam itu. Ini yang masih kosong:", card: "rooms", state: "active" })])
      if (/sks|\bip\b|ipk|cuti|nilai|aturan|akademik/i.test(text))
        return agentDo("Mencari di Pedoman Akademik", [agent({ card: "answer", state: "active" })], 1400)
      return agentDo("Membaca permintaanmu", [
        agent({ text: "Aku bisa bantu tiga hal: minta surat, tanya aturan akademik, dan urusan fasilitas (booking ruang atau lapor kerusakan). Coba ceritakan lebih spesifik ya." }),
      ])
    },
    submitForm(id: string, v: { activity: string; courses: string }) {
      patch(id, { state: "submitted" })
      push({ id: uid(), from: "user", text: `${v.activity}, ${joinList(v.courses)}` })
      agentDo("Menyiapkan permintaan lampiran", [
        agent({ text: "Terakhir, upload bukti kegiatan (surat undangan atau pengumuman lolos).", card: "upload", state: "active" }),
      ])
    },
    upload(id: string, file: FileInfo, online: boolean) {
      patch(id, { state: "submitted" })
      push({ id: uid(), from: "user", file, failed: !online })
      if (online) uploadOk()
    },
    retry(id: string) {
      patch(id, { failed: false })
      uploadOk()
    },
    ticket(id: string) {
      patch(id, { state: "submitted" })
      agentDo("Membuat tiket ke Bagian Akademik", [
        agent({ text: "Oke, pertanyaanmu aku teruskan ke Bagian Akademik. Jawabannya nanti muncul di sini.", card: "ticket" }),
      ])
    },
    pickRoom(id: string, room: Room) {
      patch(id, { state: "submitted", room })
      agentDo(`Menahan ruang ${room.code}`, [
        agent({ text: `${room.code} sudah aku tahan untukmu. Tinggal dikonfirmasi staf.`, card: "held", state: "active", room }),
      ])
    },
    cancelBooking(id: string, room: Room) {
      patch(id, { state: "cancelled" })
      push(agent({ text: `Booking ${room.code} dibatalkan. Ruangnya sudah aku lepas.` }))
    },
  }
}

/* ---------- tampilan ---------- */

function AgentRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <AgentAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  )
}

function AgentBubble({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("self-start rounded-[6px_18px_18px_18px] border bg-card px-3.5 py-2.5 text-[15px] leading-[22px]", className)}>
      {children}
    </div>
  )
}

function Typing() {
  const { agent } = useStore()
  if (!agent) return null
  return (
    <AgentRow>
      <AgentBubble className={cn("flex flex-col gap-2.5 py-3", agent.steps && "min-w-60")}>
        <div className="flex items-center gap-2.5">
          <TypingDots />
          <span className={cn(agent.steps ? "text-[13px] font-semibold" : "text-xs text-muted-foreground")}>{agent.label}</span>
        </div>
        {agent.steps && (
          <div className="flex flex-col gap-1.5 border-t pt-2.5">
            {agent.steps.map((s, i) => {
              const step = agent.step ?? 0
              return (
                <span
                  key={s}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    i < step && "text-muted-foreground",
                    i === step && "font-medium",
                    i > step && "text-subtle-foreground",
                  )}
                >
                  {i < step ? (
                    <CircleCheck className="size-3.5 text-ok" />
                  ) : i === step ? (
                    <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                  ) : (
                    <span className="size-3.5 rounded-full border-[1.5px] border-dashed border-icon" />
                  )}
                  {s}
                </span>
              )
            })}
          </div>
        )}
      </AgentBubble>
    </AgentRow>
  )
}

function FileBubble({ file, failed, onRetry, disabled }: { file: FileInfo; failed?: boolean; onRetry: () => void; disabled: boolean }) {
  if (!failed)
    return (
      <div className="flex w-[250px] items-center gap-2.5 self-end rounded-[18px_18px_6px_18px] bg-primary p-2 text-primary-foreground">
        <FileTypeTile name={file.name} onPrimary />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{file.name}</span>
          <span className="text-xs opacity-85">{formatSize(file.size)}</span>
        </div>
      </div>
    )
  return (
    <div className="flex flex-col items-end gap-1.5 self-end">
      <div className="flex w-[250px] items-center gap-2.5 rounded-[18px_18px_6px_18px] border-[1.5px] border-dashed bg-card p-2" style={{ borderColor: "var(--status-rejected-dot)" }}>
        <FileTypeTile name={file.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{file.name}</span>
          <span className="text-xs text-muted-foreground">Terhenti di 38%</span>
        </div>
      </div>
      <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
        <CircleAlert className="size-3.5" />
        Upload gagal karena koneksi putus.
      </span>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-input bg-card px-3.5 text-sm font-semibold hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw className="size-[15px]" />
        Coba upload lagi
      </button>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const { me } = useStore()
  return (
    <div className="flex min-h-full flex-col gap-7 px-5 pb-5 pt-10">
      <div className="flex flex-col gap-2.5">
        <AgentAvatar size={44} />
        <h1 className="mt-2 text-[30px] font-bold leading-9 tracking-[-0.02em]">Halo, {me?.name.split(" ")[0] ?? "kamu"}</h1>
        <p className="text-pretty text-base text-muted-foreground">Mau urus apa hari ini? Ceritakan saja, aku kerjakan sampai selesai.</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {SHORTCUTS.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="flex min-h-[68px] cursor-pointer items-center gap-3.5 rounded-lg border bg-card px-3.5 py-3 text-left hover:bg-background"
          >
            <WorkerTile worker={s.worker} size={40} />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{s.title}</span>
              <span className="text-[13px] text-muted-foreground">{s.sub}</span>
            </span>
            <ChevronRight className="size-[18px] text-icon" />
          </button>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Setiap langkah tercatat. Keputusan akhir tetap di staf.
      </div>
    </div>
  )
}

export function MobileHeader({ bordered, right }: { bordered?: boolean; right?: ReactNode }) {
  return (
    <header className={cn("flex h-14 flex-none items-center gap-2.5 pl-4 pr-3", bordered && "border-b")}>
      <Mark />
      <span className="flex-1 text-[17px] font-extrabold tracking-[0.06em]">LAYAN</span>
      <AccountPill />
      {right}
    </header>
  )
}

export function Chat() {
  const { messages, agent, decisions } = useStore()
  const flows = useFlows()
  const online = useOnline()
  const [text, setText] = useState("")
  const scroller = useRef<HTMLDivElement>(null)
  const empty = messages.length === 0
  const busy = !!agent
  const uploadActive = messages.some((m) => m.from === "agent" && m.card === "upload" && m.state === "active")
  const uploadFailed = messages.some((m) => m.from === "user" && m.failed)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })
  }, [messages, agent])

  // Keputusan staf di Staff Console dikirim ke chat mahasiswa.
  const r1 = decisions.r1
  useEffect(() => {
    if (!r1 || !messages.some((m) => m.from === "agent" && m.card === "draft") || messages.some((m) => m.id === "decision-r1")) return
    flows.push(
      r1.kind === "ok"
        ? { id: "decision-r1", from: "agent", text: "Surat Dispensasi kamu sudah disetujui. Semangat lombanya!", card: "done" }
        : { id: "decision-r1", from: "agent", text: `Surat Dispensasi kamu belum disetujui staf. Alasannya: ${r1.reason}` },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r1])

  function send(t: string) {
    if (!t.trim() || busy || !online) return
    flows.send(t.trim(), empty)
    setText("")
  }

  function renderCard(m: Extract<Msg, { from: "agent" }>) {
    const done = m.state === "submitted"
    switch (m.card) {
      case "form":
        return done ? <CollapsedCard worker="surat" title="Data kegiatan" /> : <FormCard onSubmit={(v) => flows.submitForm(m.id, v)} />
      case "upload":
        return done ? (
          uploadFailed ? <CollapsedCard worker="surat" title="Bukti kegiatan" note="Menunggu upload" tone="warn" /> : <CollapsedCard worker="surat" title="Bukti kegiatan" />
        ) : (
          <UploadCard onUpload={(f) => flows.upload(m.id, f, online)} />
        )
      case "checks":
        return (
          <ChecksCard
            checks={[
              { ok: true, label: "Status aktif", note: "Semester 3, Ganjil 2026/2027" },
              { ok: true, label: "UKT lunas", note: "Dibayar 14 Agu 2026" },
              { ok: true, label: "Lampiran valid", note: "undangan_gemastik.pdf" },
            ]}
          />
        )
      case "draft":
        return <DraftCard />
      case "answer":
        return <AnswerCard ticketed={done} onTicket={() => flows.ticket(m.id)} />
      case "ticket":
        return <TicketCard />
      case "rooms":
        return done ? <CollapsedCard worker="fasilitas" title={`Ruang dipilih · ${m.room?.code}`} /> : <RoomsCard onPick={(r) => flows.pickRoom(m.id, r)} />
      case "held":
        return m.state === "cancelled" ? (
          <CollapsedCard worker="fasilitas" icon={CalendarClock} title={`Booking ${m.room?.code}`} note="Dibatalkan" tone="muted" />
        ) : (
          <BookingHeldCard room={m.room} onCancel={() => flows.cancelBooking(m.id, m.room!)} />
        )
      case "report":
        return <ReportCard />
      case "done":
        return <LetterDoneCard />
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-background sm:border-x">
      <MobileHeader
        bordered={!empty || !online}
        right={
          <Link href="/riwayat" aria-label="Riwayat permintaan" className="grid size-11 place-items-center rounded-[12px] hover:bg-muted">
            <History className="size-[21px]" />
          </Link>
        }
      />
      {!online && (
        <div role="status" className="flex flex-none items-start gap-2.5 bg-destructive-soft px-4 py-2.5 text-[13px] leading-[18px] text-[#8C1D17] dark:text-destructive">
          <WifiOff className="mt-px size-4 flex-none" />
          <span>
            <b className="font-bold">Koneksi terputus.</b> Progres kamu aman. Aku sambungkan ulang otomatis.
          </span>
        </div>
      )}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {empty ? (
          <EmptyState onPick={send} />
        ) : (
          <div className="flex min-h-full flex-col justify-end gap-3 p-4">
            {messages.map((m) => {
              if (m.from === "time")
                return (
                  <span key={m.id} className="self-center text-xs font-medium text-muted-foreground">
                    {m.text}
                  </span>
                )
              if (m.from === "user")
                return m.file ? (
                  <FileBubble key={m.id} file={m.file} failed={m.failed} disabled={!online} onRetry={() => flows.retry(m.id)} />
                ) : (
                  <div key={m.id} className="max-w-[82%] self-end rounded-[18px_18px_6px_18px] bg-primary px-3.5 py-2.5 text-[15px] leading-[22px] text-primary-foreground">
                    {m.text}
                  </div>
                )
              return (
                <AgentRow key={m.id}>
                  {m.text && <AgentBubble>{m.text}</AgentBubble>}
                  {m.card && renderCard(m)}
                </AgentRow>
              )
            })}
            <Typing />
          </div>
        )}
      </div>

      <form
        className="flex flex-none items-end gap-2 border-t bg-background px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        {uploadActive && online ? (
          <label htmlFor={UPLOAD_INPUT_ID} aria-label="Lampirkan file" className="grid size-11 flex-none cursor-pointer place-items-center rounded-full border border-input bg-card hover:bg-background">
            <Paperclip className="size-5" />
          </label>
        ) : (
          <span aria-hidden className="grid size-11 flex-none place-items-center rounded-full border border-input bg-card opacity-50">
            <Paperclip className="size-5" />
          </span>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!online}
          aria-label="Pesan"
          placeholder={!online ? "Menunggu koneksi…" : empty ? "Tulis permintaanmu…" : "Tulis pesan…"}
          className="h-11 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-[15px] outline-none placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-accent disabled:bg-muted"
        />
        <button
          type="submit"
          aria-label="Kirim"
          disabled={!text.trim() || busy || !online}
          className="grid size-11 flex-none cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover disabled:cursor-default disabled:bg-border disabled:text-icon"
        >
          <ArrowUp className="size-5" />
        </button>
      </form>
    </div>
  )
}

