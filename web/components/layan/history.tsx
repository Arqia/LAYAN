"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, MessageCircle, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HISTORY, STATUS_LABEL, type HistoryItem, type Status } from "@/lib/data"
import { StatusBadge, WorkerTile } from "./primitives"
import { useStore } from "./store"

function Frame({ title, back, children, footer }: { title: string; back: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-background sm:border-x">
      <header className="flex h-14 flex-none items-center gap-1 pl-2 pr-4">
        <Link href={back} aria-label="Kembali" className="grid size-11 place-items-center rounded-[12px] hover:bg-muted">
          <ArrowLeft className="size-[22px]" />
        </Link>
        <h1 className="flex-1 text-[17px] font-bold">{title}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer}
    </div>
  )
}

/** Status Surat Dispensasi Raka mengikuti keputusan staf di Staff Console. */
function useLiveStatus(item: HistoryItem): Status {
  const { decisions } = useStore()
  const d = decisions.r1
  if (item.id !== "REQ-2026-0931" || !d) return item.status
  return d.kind === "ok" ? "approved" : "rejected"
}

function Row({ item, first }: { item: HistoryItem; first: boolean }) {
  const status = useLiveStatus(item)
  return (
    <Link href={`/riwayat/${item.id}`} className={cn("flex items-start gap-3 p-3.5 hover:bg-background", !first && "border-t")}>
      <WorkerTile worker={item.worker} icon={item.icon === "wrench" ? Wrench : undefined} size={36} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-semibold leading-5">{item.title}</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground">{item.time}</span>
        </div>
        <span className="text-[13px] leading-[18px] text-muted-foreground">{item.meta}</span>
        <StatusBadge status={status} />
      </div>
    </Link>
  )
}

export function HistoryList() {
  const [filter, setFilter] = useState<"semua" | "aktif" | "selesai">("semua")
  const active = HISTORY.filter((h) => h.active)
  const done = HISTORY.filter((h) => !h.active)
  const groups = [
    { label: "Aktif", items: active, show: filter !== "selesai" },
    { label: "Selesai", items: done, show: filter !== "aktif" },
  ]
  const chips = [
    { key: "semua", label: "Semua" },
    { key: "aktif", label: "Aktif", count: active.length },
    { key: "selesai", label: "Selesai" },
  ] as const
  return (
    <Frame title="Riwayat permintaan" back="/">
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
      <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
        {groups.filter((g) => g.show).map((g) => (
          <div key={g.label} className="contents">
            <span className="px-1 pb-0.5 pt-2 text-xs font-semibold text-muted-foreground">{g.label}</span>
            <div className="overflow-hidden rounded-lg border bg-card">
              {g.items.map((it, i) => (
                <Row key={it.id} item={it} first={i === 0} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

/* ---------- detail ---------- */

const STEPS: { status: Status; note: string }[] = [
  { status: "submitted", note: "Lewat chat LAYAN" },
  { status: "needs_info", note: "Nama kegiatan, mata kuliah, bukti kegiatan" },
  { status: "processing", note: "Syarat lolos, draft surat dibuat" },
  { status: "pending_approval", note: "Di Ibu Sari, Layanan Akademik. Biasanya selesai di hari yang sama." },
  { status: "approved", note: "Nomor surat terbit" },
  { status: "done", note: "PDF siap diunduh" },
]
const TIMES = ["09.10", "09.10", "09.15", "09.15"]

// Hanya permintaan utama demo yang punya data kegiatan lengkap.
const DETAIL: Record<string, [string, string][]> = {
  "REQ-2026-0931": [["Kegiatan", "Gemastik 2026"], ["Tanggal", "10–12 Oktober 2026"], ["Mata kuliah", "Struktur Data, Sistem Digital"]],
}

export function HistoryDetail({ id }: { id: string }) {
  const item = HISTORY.find((h) => h.id === id)
  const status = useLiveStatus(item ?? HISTORY[0])
  if (!item)
    return (
      <Frame title="Detail permintaan" back="/riwayat">
        <p className="p-4 text-sm text-muted-foreground">Permintaan {id} tidak ditemukan.</p>
      </Frame>
    )

  const rejected = status === "rejected"
  const cur = rejected ? 4 : STEPS.findIndex((s) => s.status === status)
  const kv = DETAIL[item.id] ?? [["Keterangan", item.meta]]

  return (
    <Frame
      title="Detail permintaan"
      back="/riwayat"
      footer={
        <div className="grid flex-none grid-cols-2 gap-2 border-t px-4 py-3">
          <Button variant="outline" size="lg" disabled={item.worker !== "surat"}>
            <FileText />
            Lihat draft
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/">
              <MessageCircle />
              Buka chat
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-4 pb-4 pt-2">
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <WorkerTile worker={item.worker} icon={item.icon === "wrench" ? Wrench : undefined} size={40} />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[17px] font-bold">{item.title}</span>
              <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
            </div>
          </div>
          <StatusBadge status={status} />
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t pt-3 text-sm">
            {kv.map(([k, v]) => (
              <div key={k} className="contents">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-lg border bg-card px-4 pb-1 pt-4">
          <span className="text-sm font-bold">Status</span>
          <ol className="flex flex-col">
            {STEPS.map((s, i) => {
              const state = i < cur || (i === cur && status === "done") ? "done" : i === cur ? "current" : "todo"
              const label = rejected && i === 4 ? STATUS_LABEL.rejected : STATUS_LABEL[s.status]
              const isLast = i === STEPS.length - 1
              return (
                <li key={s.status} className="grid grid-cols-[18px_minmax(0,1fr)_auto] gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-[3px] size-3.5 flex-none rounded-full border-2",
                        state === "done" && "border-primary bg-primary",
                        state === "current" && (rejected ? "border-destructive bg-card shadow-[0_0_0_4px_var(--destructive-soft)]" : "border-violet-dot bg-card shadow-[0_0_0_4px_var(--status-pending_approval-bg)]"),
                        state === "todo" && "border-input bg-card",
                      )}
                    />
                    {!isLast && <span className={cn("my-0.5 w-0.5 flex-1", state === "done" ? "bg-primary" : "bg-border")} />}
                  </div>
                  <div className="flex flex-col gap-0.5 pb-4">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        state === "current" && (rejected ? "text-destructive" : "text-violet"),
                        state === "todo" && "text-subtle-foreground",
                      )}
                    >
                      {label}
                    </span>
                    {item.id === "REQ-2026-0931" && !(rejected && i === 4) && (
                      <span className="text-[13px] leading-[18px] text-muted-foreground">{s.note}</span>
                    )}
                  </div>
                  <span className="pt-0.5 font-mono text-xs text-muted-foreground">{item.id === "REQ-2026-0931" && TIMES[i] ? TIMES[i] : "–"}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </Frame>
  )
}
