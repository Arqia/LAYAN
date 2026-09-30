"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { ArrowUp, CalendarClock, ChevronRight, CircleAlert, CircleCheck, History, Paperclip, RefreshCw, ShieldCheck, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Check, Worker } from "@/lib/data"
import { api, stream, type AgentEvent, type ChatMessage } from "@/lib/api"
import {
  AnswerCard, BookingHeldCard, ChecksCard, CollapsedCard, DraftCard, FormCard, LetterDoneCard, ReportCard, RoomsCard, TicketCard,
  UPLOAD_INPUT_ID, UploadCard, type Answer, type Held, type LetterDone, type ReportData, type RoomsData, type Ticket,
} from "./action-cards"
import { AccountPill } from "./app-bar"
import { AgentAvatar, FileTypeTile, Mark, TypingDots, WorkerTile, formatSize } from "./primitives"
import { useStore } from "./store"

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

const SHORTCUTS: { worker: Worker; title: string; sub: string; prompt: string }[] = [
  { worker: "surat", title: "Minta surat", sub: "Aktif kuliah, dispensasi", prompt: "Kak, aku mau minta surat izin lomba tanggal 10–12 Oktober" },
  { worker: "helpdesk", title: "Tanya aturan akademik", sub: "SKS, cuti, nilai. Lengkap dengan sumber", prompt: "Batas maksimal SKS kalau IP semester lalu 3,2 berapa?" },
  { worker: "fasilitas", title: "Lapor kerusakan / booking ruangan", sub: "Cek bentrok, langsung ke teknisi", prompt: "Mau booking ruang rapat Jumat 13.00–15.00, 20 orang" },
]

type AgentStatus = { label: string; steps: string[] | null; step: number | null } | null

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

function Typing({ agent }: { agent: AgentStatus }) {
  if (!agent) return null
  const step = agent.step ?? 0
  return (
    <AgentRow>
      <AgentBubble className={cn("flex flex-col gap-2.5 py-3", agent.steps && "min-w-60")}>
        <div className="flex items-center gap-2.5">
          <TypingDots />
          <span className={cn(agent.steps ? "text-[13px] font-semibold" : "text-xs text-muted-foreground")}>{agent.label}</span>
        </div>
        {agent.steps && (
          <div className="flex flex-col gap-1.5 border-t pt-2.5">
            {agent.steps.map((s, i) => (
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
            ))}
          </div>
        )}
      </AgentBubble>
    </AgentRow>
  )
}

function FileBubble({ file }: { file: { name: string; size: number } }) {
  return (
    <div className="flex w-[250px] items-center gap-2.5 self-end rounded-[18px_18px_6px_18px] bg-primary p-2 text-primary-foreground">
      <FileTypeTile name={file.name} onPrimary />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">{file.name}</span>
        <span className="text-xs opacity-85">{formatSize(file.size)}</span>
      </div>
    </div>
  )
}

/** Upload yang putus karena koneksi. File masih di browser, bisa dicoba lagi. */
function FailedUpload({ file, onRetry, disabled }: { file: File; onRetry: () => void; disabled: boolean }) {
  return (
    <div className="flex flex-col items-end gap-1.5 self-end">
      <div className="flex w-[250px] items-center gap-2.5 rounded-[18px_18px_6px_18px] border-[1.5px] border-dashed bg-card p-2" style={{ borderColor: "var(--status-rejected-dot)" }}>
        <FileTypeTile name={file.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{file.name}</span>
          <span className="text-xs text-muted-foreground">{formatSize(file.size)} · belum terkirim</span>
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
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-input bg-card px-3.5 text-sm font-semibold hover:bg-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
            className="flex min-h-[68px] cursor-pointer items-center gap-3.5 rounded-lg border bg-card px-3.5 py-3 text-left hover:bg-background active:scale-[0.98]"
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

function Skeleton() {
  return (
    <div className="flex min-h-full flex-col justify-end gap-3 p-4" aria-label="Memuat percakapan">
      {["ml-auto w-2/3", "w-3/4", "w-4/5 h-40", "ml-auto w-1/2"].map((c) => (
        <div key={c} className={cn("h-11 animate-pulse rounded-[18px] bg-muted", c)} />
      ))}
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

/* ---------- loket chat ---------- */

export function Chat() {
  const online = useOnline()
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [agent, setAgent] = useState<AgentStatus>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [failed, setFailed] = useState<{ file: File; messageId: number } | null>(null)
  const [text, setText] = useState("")
  const scroller = useRef<HTMLDivElement>(null)

  const load = useCallback(
    () =>
      api<ChatMessage[]>("/chat").then(setMessages, (e: Error) => {
        setError(e.message)
        setMessages((m) => m ?? [])
      }),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  // Keputusan staf masuk sebagai pesan baru. Cek tiap 5 detik saat tab terlihat dan agent diam.
  useEffect(() => {
    if (busy) return
    const t = setInterval(() => document.visibilityState === "visible" && load(), 5000)
    return () => clearInterval(t)
  }, [busy, load])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })
  }, [messages?.length, agent, failed])

  const onEvent = useCallback((e: AgentEvent) => {
    if (e.type === "status") setAgent(e.label ? { label: e.label, steps: e.steps, step: e.step } : null)
    else if (e.type === "message") setMessages((ms) => (ms?.some((m) => m.id === e.message.id) ? ms : [...(ms ?? []), e.message]))
    else if (e.type === "update") setMessages((ms) => ms?.map((m) => (m.id === e.id && m.card ? { ...m, card: { ...m.card, state: e.state } } : m)) ?? ms)
    else if (e.type === "error") setError(e.message)
  }, [])

  async function run(path: string, body: unknown) {
    setBusy(true)
    setError("")
    try {
      await stream(path, body, onEvent)
    } catch (e) {
      setError(e instanceof TypeError ? "Koneksi terputus. Progres kamu aman, coba lagi." : (e as Error).message)
    } finally {
      setBusy(false)
      setAgent(null)
    }
  }

  function send(t: string) {
    if (!t.trim() || busy || !online) return
    setText("")
    run("/chat", { text: t.trim() })
  }

  const act = (messageId: number, action: string, payload: unknown = {}) => run("/chat/action", { message_id: messageId, action, payload })

  async function upload(messageId: number, file: File): Promise<string | void> {
    if (!navigator.onLine) return setFailed({ file, messageId })
    try {
      const fd = new FormData()
      fd.append("file", file)
      const att = await api<{ id: string }>("/attachments", { method: "POST", body: fd })
      setFailed(null)
      await act(messageId, "upload", { attachment_id: att.id })
    } catch (e) {
      if (e instanceof TypeError) return setFailed({ file, messageId }) // jaringan putus di tengah jalan
      return (e as Error).message
    }
  }

  async function photo(messageId: number, reportId: string, file: File): Promise<string | void> {
    try {
      const fd = new FormData()
      fd.append("file", file)
      const att = await api<{ id: string }>("/attachments", { method: "POST", body: fd })
      await act(messageId, "photo", { report_id: reportId, attachment_id: att.id })
    } catch (e) {
      return e instanceof TypeError ? "Koneksi terputus. Coba lagi." : (e as Error).message
    }
  }

  function renderCard(m: ChatMessage) {
    const c = m.card!
    const d = c.data
    const skipped = c.state === "skipped"
    switch (c.kind) {
      case "form":
        if (c.state !== "active") return <CollapsedCard worker="surat" title="Data kegiatan" note={skipped ? "Dilewati" : "Terkirim"} tone={skipped ? "muted" : "ok"} />
        return <FormCard onSubmit={(v) => act(m.id, "submit", v)} />
      case "upload":
        if (failed?.messageId === m.id) return <CollapsedCard worker="surat" title="Bukti kegiatan" note="Menunggu upload" tone="warn" />
        if (c.state !== "active") return <CollapsedCard worker="surat" title="Bukti kegiatan" note={skipped ? "Dilewati" : "Terkirim"} tone={skipped ? "muted" : "ok"} />
        return <UploadCard onUpload={(f) => upload(m.id, f)} />
      case "checks":
        return <ChecksCard checks={d.checks as Check[]} footer={(d.footer as { note: string } | null) ?? undefined} />
      case "draft":
        return <DraftCard title={d.title as string} meta={d.meta as string} requestId={d.request_id as string} />
      case "answer":
        return <AnswerCard data={d as Answer} ticketed={c.state !== "active"} onTicket={() => act(m.id, "ticket")} />
      case "ticket":
        return <TicketCard data={d as Ticket} />
      case "done":
        return <LetterDoneCard data={d as LetterDone} />
      case "rooms":
        if (c.state !== "active") return <CollapsedCard worker="fasilitas" title="Pilihan ruang" note={skipped ? "Dilewati" : "Terkirim"} tone={skipped ? "muted" : "ok"} />
        return <RoomsCard data={d as RoomsData} onPick={(r) => act(m.id, "pick", { code: r.code })} />
      case "held":
        if (c.state === "cancelled") return <CollapsedCard worker="fasilitas" icon={CalendarClock} title={`Booking ${d.code}`} note="Dibatalkan" tone="muted" />
        return <BookingHeldCard data={d as Held} onCancel={() => act(m.id, "cancel_booking", { request_id: d.request_id })} />
      case "report":
        return <ReportCard data={d as ReportData} onPhoto={(f) => photo(m.id, d.report_id as string, f)} />
      default:
        return null
    }
  }

  const empty = messages?.length === 0
  const uploadActive = messages?.some((m) => m.card?.kind === "upload" && m.card.state === "active" && failed?.messageId !== m.id)

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-background sm:border-x">
      <MobileHeader
        bordered={!empty || !online}
        right={
          <Link href="/app/riwayat" aria-label="Riwayat permintaan" className="grid size-11 place-items-center rounded-[12px] hover:bg-muted">
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
        {messages === null ? (
          <Skeleton />
        ) : empty ? (
          <EmptyState onPick={send} />
        ) : (
          <div className="flex min-h-full flex-col justify-end gap-3 p-4">
            {messages.map((m) =>
              m.sender === "user" ? (
                m.file ? (
                  <FileBubble key={m.id} file={m.file} />
                ) : (
                  <div key={m.id} className="max-w-[82%] self-end whitespace-pre-wrap rounded-[18px_18px_6px_18px] bg-primary px-3.5 py-2.5 text-[15px] leading-[22px] text-primary-foreground">
                    {m.text}
                  </div>
                )
              ) : (
                <AgentRow key={m.id}>
                  {m.text && <AgentBubble>{m.text}</AgentBubble>}
                  {m.card && renderCard(m)}
                </AgentRow>
              ),
            )}
            {failed && <FailedUpload file={failed.file} disabled={!online || busy} onRetry={() => upload(failed.messageId, failed.file)} />}
            <Typing agent={agent} />
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="flex flex-none items-start gap-2 border-t bg-destructive-soft/60 px-4 py-2 text-[13px] leading-[18px] text-destructive">
          <CircleAlert className="mt-px size-4 flex-none" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError("")} className="cursor-pointer font-semibold hover:underline">
            Tutup
          </button>
        </div>
      )}

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
          maxLength={2000}
          aria-label="Pesan"
          placeholder={!online ? "Menunggu koneksi…" : empty ? "Tulis permintaanmu…" : "Tulis pesan…"}
          className="h-11 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-[15px] outline-none placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-accent disabled:bg-muted"
        />
        <button
          type="submit"
          aria-label="Kirim"
          disabled={!text.trim() || busy || !online}
          className="grid size-11 flex-none cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95 disabled:cursor-default disabled:bg-border disabled:text-icon"
        >
          <ArrowUp className="size-5" />
        </button>
      </form>
    </div>
  )
}

