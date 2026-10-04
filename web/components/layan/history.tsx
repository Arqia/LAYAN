"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, CircleAlert, FileText, Inbox, MessageCircle, MessageCirclePlus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { api, post, stream } from "@/lib/api"
import { ThemeToggle } from "./app-bar"
import { STATUS_LABEL, type Status, type Worker } from "@/lib/data"
import { StatusBadge, WorkerTile } from "./primitives"

type Kind = "surat" | "tiket" | "booking" | "laporan"
type Item = { id: string; worker: Worker; kind: Kind; title: string; status: Status; time: string; meta: string; active: boolean }
type Detail = {
  id: string
  worker: Worker
  kind: Kind
  title: string
  status: Status
  fields: [string, string][]
  steps: Partial<Record<Status, string>>
  letter: unknown
  reject_reason: string | null
}

function Frame({ title, back, children, footer }: { title: string; back: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-background sm:border-x lg:max-w-[760px]">
      <header className="flex h-14 flex-none items-center gap-1 pl-2 pr-4">
        <Link href={back} aria-label="Kembali" className="grid size-11 place-items-center rounded-[12px] hover:bg-muted">
          <ArrowLeft className="size-[22px]" />
        </Link>
        <h1 className="flex-1 text-[17px] font-bold">{title}</h1>
        <ThemeToggle />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer}
    </div>
  )
}

function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState("")
  const [n, setN] = useState(0)
  useEffect(() => {
    api<T>(path).then(setData, (e: Error) => setError(e.message))
  }, [path, n])
  return { data, error, reload: () => setN((x) => x + 1) }
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="m-4 flex items-start gap-2 rounded-md bg-destructive-soft/60 px-3 py-2.5 text-[13px] text-destructive">
      <CircleAlert className="mt-px size-4 flex-none" />
      {message}
    </p>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 pt-3" aria-label="Memuat riwayat">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[92px] animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

export function HistoryList() {
  const { data, error } = useApi<Item[]>("/requests")
  const [filter, setFilter] = useState<"semua" | "aktif" | "selesai" | "dibatalkan">("semua")
  const items = data ?? []
  const active = items.filter((h) => h.active)
  const done = items.filter((h) => !h.active && h.status !== "cancelled")
  const cancelled = items.filter((h) => h.status === "cancelled")
  const groups = [
    { label: "Aktif", items: active, show: filter === "semua" || filter === "aktif" },
    { label: "Selesai", items: done, show: filter === "semua" || filter === "selesai" },
    { label: "Dibatalkan", items: cancelled, show: filter === "semua" || filter === "dibatalkan" },
  ]
  const chips = [
    { key: "semua", label: "Semua" },
    { key: "aktif", label: "Aktif", count: active.length },
    { key: "selesai", label: "Selesai" },
    { key: "dibatalkan", label: "Dibatalkan", count: cancelled.length },
  ] as const

  return (
    <Frame title="Riwayat permintaan" back="/app">
      <div className="flex gap-2 px-4 pb-3 pt-1">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={filter === c.key}
            onClick={() => setFilter(c.key)}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold",
              filter === c.key ? "bg-ink text-ink-foreground" : "border border-input bg-card hover:bg-background",
            )}
          >
            {c.label}
            {"count" in c && <span className={cn("text-xs", filter === c.key ? "opacity-70" : "text-muted-foreground")}>{c.count}</span>}
          </button>
        ))}
      </div>
      {error && <ErrorLine message={error} />}
      {!data && !error && <ListSkeleton />}
      {data && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-lg bg-accent text-primary">
            <Inbox className="size-6" />
          </span>
          <span className="text-base font-bold">Belum ada permintaan</span>
          <span className="max-w-[260px] text-pretty text-[13px] leading-[19px] text-muted-foreground">
            Minta surat atau tanya aturan akademik lewat chat. Semuanya tercatat di sini.
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/app">Buka chat</Link>
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
        {groups
          .filter((g) => g.show && g.items.length > 0)
          .map((g) => (
            <div key={g.label} className="contents">
              <span className="px-1 pb-0.5 pt-2 text-xs font-semibold text-muted-foreground">{g.label}</span>
              <div className="overflow-hidden rounded-lg border bg-card">
                {g.items.map((it, i) => (
                  <Link key={it.id} href={`/app/riwayat/${it.id}`} className={cn("flex items-start gap-3 p-3.5 hover:bg-background", i > 0 && "border-t")}>
                    <WorkerTile worker={it.worker} size={36} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[15px] font-semibold leading-5">{it.title}</span>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">{it.time}</span>
                      </div>
                      <span className="text-[13px] leading-[18px] text-muted-foreground">{it.meta}</span>
                      <StatusBadge status={it.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>
    </Frame>
  )
}

/** Riwayat di samping chat, hanya di layar lebar. `refresh` berubah tiap ada pesan baru supaya status ikut terbarui. */
export function HistorySidebar({ refresh }: { refresh: number }) {
  const [items, setItems] = useState<Item[] | null>(null)
  useEffect(() => {
    api<Item[]>("/requests").then(setItems, () => setItems((v) => v ?? []))
  }, [refresh])

  return (
    <aside className="hidden w-[320px] flex-none flex-col border-r bg-card lg:flex">
      <div className="flex h-14 flex-none items-center justify-between gap-2 pl-4 pr-2">
        <h2 className="text-[15px] font-bold">Riwayat permintaan</h2>
        <Link href="/app/riwayat" className="inline-flex h-9 cursor-pointer items-center gap-0.5 rounded-full px-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
          Lihat semua
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {!items && <ListSkeleton />}
        {items?.length === 0 && (
          <p className="px-3 py-6 text-[13px] leading-[19px] text-muted-foreground">Belum ada permintaan. Minta surat, tanya aturan, atau lapor kerusakan lewat chat.</p>
        )}
        {items?.map((it) => (
          <Link key={it.id} href={`/app/riwayat/${it.id}`} className="flex items-start gap-3 rounded-md p-2.5 hover:bg-background">
            <WorkerTile worker={it.worker} size={32} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-semibold">{it.title}</span>
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">{it.time}</span>
              </div>
              <StatusBadge status={it.status} />
            </div>
          </Link>
        ))}
      </div>
    </aside>
  )
}

/* ---------- detail ---------- */

const STEPS: { status: Status; note: string }[] = [
  { status: "submitted", note: "Lewat chat LAYAN" },
  { status: "needs_info", note: "Data dan lampiran surat" },
  { status: "processing", note: "Syarat dicek, draft surat dibuat" },
  { status: "pending_approval", note: "Di staf Layanan Akademik. Biasanya selesai di hari yang sama." },
  { status: "approved", note: "Nomor surat terbit" },
  { status: "done", note: "PDF siap diunduh" },
]
type Step = { status: Status; note: string; label?: string }
const KIND_STEPS: Record<Exclude<Kind, "surat">, Step[]> = {
  tiket: [
    { status: "submitted", note: "Diteruskan ke unit terkait" },
    { status: "done", label: "Dijawab", note: "Jawaban dikirim lewat chat" },
  ],
  booking: [
    { status: "submitted", note: "Lewat chat LAYAN" },
    { status: "needs_info", label: "Pilih ruang", note: "Agent cek bentrok dan kapasitas" },
    { status: "pending_approval", note: "Ruang ditahan 24 jam, menunggu staf" },
    { status: "approved", label: "Terkonfirmasi", note: "Ruang siap dipakai" },
  ],
  laporan: [
    { status: "submitted", label: "Diteruskan ke teknisi", note: "Laporan dobel digabung otomatis" },
    { status: "processing", label: "Dikerjakan", note: "Teknisi sedang menangani" },
    { status: "done", note: "Kamu dikabari lewat chat" },
  ],
}

export function HistoryDetail({ id }: { id: string }) {
  const router = useRouter()
  const { data: d, error, reload } = useApi<Detail>(`/requests/${encodeURIComponent(id)}`)
  const [busyAct, setBusyAct] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  // Lengan konfirmasi tombol batal lepas sendiri setelah 3 detik.
  useEffect(() => {
    if (!confirmCancel) return
    const t = setTimeout(() => setConfirmCancel(false), 3000)
    return () => clearTimeout(t)
  }, [confirmCancel])

  if (error || !d)
    return (
      <Frame title="Detail permintaan" back="/app/riwayat">
        {error ? <ErrorLine message={error} /> : <ListSkeleton />}
      </Frame>
    )

  const steps: Step[] = d.kind === "surat" ? STEPS : KIND_STEPS[d.kind]
  const rejected = d.status === "rejected"
  const cancelled = d.status === "cancelled"
  // ditolak: tandai di langkah keputusan (langkah terakhir sebelum selesai)
  const cur = rejected ? Math.max(0, steps.findIndex((s) => ["approved", "done"].includes(s.status))) : steps.findIndex((s) => s.status === d.status)
  const hasLetter = !!d.letter
  const reqId = d.id
  const resumable = ["needs_info", "submitted", "processing"].includes(d.status)
  const cancellable = ["submitted", "needs_info", "processing", "pending_approval"].includes(d.status)

  // Lanjutkan di chat: server menerbitkan ulang kartu yang tertunda,
  // lalu buka chat untuk mengisinya.
  async function resume() {
    if (busyAct) return
    setBusyAct(true)
    try {
      await stream("/chat/action", { message_id: 0, action: "resume", payload: { request_id: reqId } }, () => {})
      router.push("/app")
    } catch (e) {
      toast.error((e as Error).message)
      setBusyAct(false)
    }
  }

  async function cancel() {
    if (busyAct) return
    if (!confirmCancel) {
      setConfirmCancel(true)
      toast.info("Ketuk lagi untuk membatalkan permintaan", { description: "Status menjadi Dibatalkan dan keluar dari antrean staf." })
      return
    }
    setConfirmCancel(false)
    setBusyAct(true)
    try {
      await post(`/requests/${encodeURIComponent(reqId)}/cancel`)
      toast.success("Permintaan dibatalkan")
      reload()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusyAct(false)
    }
  }

  return (
    <Frame
      title="Detail permintaan"
      back="/app/riwayat"
      footer={
        <div className="flex flex-none flex-col gap-2 border-t px-4 py-3">
          {resumable && (
            <Button size="lg" disabled={busyAct} onClick={resume}>
              <MessageCirclePlus />
              Lanjutkan di chat
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {hasLetter ? (
              <Button variant="outline" size="lg" asChild>
                <Link href={`/surat/${d.id}`}>
                  <FileText />
                  {d.status === "approved" ? "Unduh surat" : "Lihat draft"}
                </Link>
              </Button>
            ) : (
              <div className="flex h-12 items-center justify-center gap-2 rounded-[12px] border border-dashed px-5 text-[15px] font-medium text-muted-foreground">
                <FileText />
                Belum ada draft
              </div>
            )}
            <Button variant="outline" size="lg" asChild>
              <Link href="/app">
                <MessageCircle />
                Buka chat
              </Link>
            </Button>
          </div>
          {cancellable && (
            <Button variant="destructive-outline" size="lg" disabled={busyAct} onClick={cancel}>
              <Trash2 />
              {confirmCancel ? "Ketuk lagi untuk membatalkan" : "Batalkan permintaan"}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-4 pb-4 pt-2">
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <WorkerTile worker={d.worker} size={40} />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[17px] font-bold">{d.title}</span>
              <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
            </div>
          </div>
          <StatusBadge status={d.status} />
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t pt-3 text-sm">
            {d.fields.map(([k, v]) => (
              <div key={k} className="contents">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-lg border bg-card px-4 pb-1 pt-4">
          <span className="text-sm font-bold">Status</span>
          {cancelled ? (
            <p className="pb-4 text-[13px] leading-[19px] text-muted-foreground">
              Permintaan ini dibatalkan. Antrean staf ikut kosong dan tahan ruang (kalau ada) dilepas. Butuh layanan ini lagi? Mulai dari chat.
            </p>
          ) : (
          <ol className="flex flex-col">
            {steps.map((s, i) => {
              const state = i < cur || (i === cur && d.status === "done") ? "done" : i === cur ? "current" : "todo"
              const isReject = rejected && i === cur
              return (
                <li key={s.status} className="grid grid-cols-[18px_minmax(0,1fr)_auto] gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-[3px] size-3.5 flex-none rounded-full border-2",
                        state === "done" && "border-primary bg-primary",
                        state === "current" &&
                          (isReject ? "border-destructive bg-card shadow-[0_0_0_4px_var(--destructive-soft)]" : "border-violet-dot bg-card shadow-[0_0_0_4px_var(--status-pending_approval-bg)]"),
                        state === "todo" && "border-input bg-card",
                      )}
                    />
                    {i < steps.length - 1 && <span className={cn("my-0.5 w-0.5 flex-1", state === "done" ? "bg-primary" : "bg-border")} />}
                  </div>
                  <div className="flex flex-col gap-0.5 pb-4">
                    <span className={cn("text-sm font-semibold", state === "current" && (isReject ? "text-destructive" : "text-violet"), state === "todo" && "text-subtle-foreground")}>
                      {isReject ? STATUS_LABEL.rejected : (s.label ?? STATUS_LABEL[s.status])}
                    </span>
                    <span className="text-[13px] leading-[18px] text-muted-foreground">{isReject ? d.reject_reason : s.note}</span>
                  </div>
                  <span className="pt-0.5 font-mono text-xs text-muted-foreground">{d.steps[isReject ? "rejected" : s.status] ?? "–"}</span>
                </li>
              )
            })}
          </ol>
          )}
        </div>
      </div>
    </Frame>
  )
}
