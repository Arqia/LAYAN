"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type { LucideIcon } from "lucide-react"
import { Check, ChevronDown, CircleAlert, CircleCheck, CircleEllipsis, ListFilter, Play, Projector, Snowflake, SprayCan, Users, Wifi, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { api, post } from "@/lib/api"
import { TECHS, type Category, type Report, type ReportStatus, type Tech } from "@/lib/data"
import { AccountPill, TopBar } from "./app-bar"
import { Mark, UrgencyBadge } from "./primitives"
import { useStore } from "./store"

const CAT_ICON: Record<Category, LucideIcon> = {
  Listrik: Zap, AC: Snowflake, Proyektor: Projector, Jaringan: Wifi, Kebersihan: SprayCan, Lainnya: CircleEllipsis,
}
const COLUMNS: { key: ReportStatus; label: string; dot: string }[] = [
  { key: "baru", label: "Baru", dot: "var(--icon)" },
  { key: "dikerjakan", label: "Dikerjakan", dot: "#2F74E0" },
  { key: "selesai", label: "Selesai", dot: "var(--ink)" },
]
const RANK = { Tinggi: 0, Sedang: 1, Rendah: 2 }

function Meta({ r, large }: { r: Report; large?: boolean }) {
  const Icon = CAT_ICON[r.category]
  const s = large ? "size-3.5" : "size-[13px]"
  return (
    <div className={cn("flex items-center gap-3 text-muted-foreground", large ? "text-[13px]" : "text-xs")}>
      <span className="flex items-center gap-1">
        <Icon className={s} />
        {r.category}
      </span>
      <span className={cn("flex items-center gap-1", r.reporters > 1 ? "font-bold text-foreground" : "font-medium")}>
        <Users className={s} />
        {r.reporters} pelapor
      </span>
      <span className="ml-auto">{r.time}</span>
    </div>
  )
}

function KanbanCard({ r, onDragStart }: { r: Report; onDragStart: () => void }) {
  const t = TECHS[r.assignee as Tech] ?? { bg: "var(--muted)", fg: "var(--foreground)" }
  const initials = r.tech.split(" ").map((w) => w[0]).join("")
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", r.id)
        onDragStart()
      }}
      className={cn(
        "flex cursor-grab flex-col gap-2.5 rounded-md border bg-card p-3 hover:border-dash hover:shadow-e1 active:cursor-grabbing",
        r.status === "selesai" && "opacity-72",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{r.room}</span>
        <UrgencyBadge urgency={r.urgency} />
      </div>
      <span className="text-sm font-semibold leading-5">{r.title}</span>
      {r.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- foto dari API Rust, bukan aset statis
        <img src={`/api/attachments/${r.photo}`} alt={`Foto kerusakan ${r.room}`} className="h-[92px] w-full rounded-[8px] object-cover" draggable={false} />
      )}
      <Meta r={r} />
      <div className="flex items-center gap-2 border-t pt-2.5">
        <span className="grid size-[22px] place-items-center rounded-full text-[9px] font-bold" style={{ background: t.bg, color: t.fg }}>
          {initials}
        </span>
        <span className="flex-1 text-xs font-medium">{r.tech}</span>
        <span className="font-mono text-[11px] text-subtle-foreground">{r.id}</span>
      </div>
    </div>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" className="flex gap-0.5 rounded-md bg-muted p-[3px]">
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "inline-flex h-8 cursor-pointer items-center rounded-[8px] px-3 text-[13px] font-semibold",
            value === k ? "bg-card shadow-[0_1px_2px_rgba(22,24,26,.1)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Board() {
  const { me } = useStore()
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState("")
  const [justDone, setJustDone] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<"semua" | "saya">("semua")
  const [cat, setCat] = useState<Category | "Semua">("Semua")
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<ReportStatus | null>(null)

  const load = useCallback(() => api<Report[]>("/reports").then(setReports, (e: Error) => setError(e.message)), [])
  useEffect(() => {
    load()
    // laporan baru dari agent masuk tanpa reload
    const t = setInterval(() => document.visibilityState === "visible" && load(), 10000)
    return () => clearInterval(t)
  }, [load])

  // Optimis: kartu langsung pindah, dikembalikan kalau API menolak.
  async function move(id: string, status: ReportStatus) {
    const before = reports
    if (before?.find((r) => r.id === id)?.status === status) return
    setReports((rs) => rs?.map((r) => (r.id === id ? { ...r, status } : r)) ?? rs)
    try {
      const res = await post<{ notified: number }>(`/reports/${id}/status`, { status })
      if (status === "selesai") {
        setJustDone((s) => new Set(s).add(id))
        toast.success(`${id} selesai`, { description: res.notified ? `${res.notified} pelapor sudah dikabari lewat chat.` : "Status tersimpan." })
      }
    } catch (e) {
      setReports(before)
      toast.error((e as Error).message)
    }
  }
  const all = reports ?? []
  const group = (list: Report[]) =>
    COLUMNS.map((c) => {
      const cards = list.filter((r) => r.status === c.key)
      if (c.key !== "selesai") cards.sort((a, b) => RANK[a.urgency] - RANK[b.urgency])
      return { ...c, cards }
    })

  const desktopList = all.filter((r) => (scope === "semua" || r.assignee === me?.id) && (cat === "Semua" || r.category === cat))
  const open = all.filter((r) => r.status !== "selesai")

  return (
    <>
      {/* ---------- desktop ---------- */}
      <div className="hidden h-screen min-h-[720px] flex-col lg:flex">
        <TopBar section="Board Teknisi" />
        <div className="flex flex-none items-center gap-4 px-6 pb-4 pt-5">
          <div className="flex flex-1 flex-col gap-0.5">
            <h1 className="text-[22px] font-bold tracking-[-0.01em]">Laporan kerusakan</h1>
            <span className="text-[13px] text-muted-foreground">
              {open.length} laporan terbuka · {open.reduce((s, r) => s + r.reporters, 0)} pelapor, sudah digabung agent
            </span>
          </div>
          <Segmented value={scope} onChange={setScope} options={[["semua", "Semua teknisi"], ["saya", "Tugas saya"]]} />
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 text-[13px] font-semibold outline-none hover:bg-background focus-visible:ring-[3px] focus-visible:ring-accent">
              <ListFilter className="size-[15px]" />
              Kategori: {cat}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuRadioGroup value={cat} onValueChange={(v) => setCat(v as Category | "Semua")}>
                {(["Semua", ...Object.keys(CAT_ICON)] as const).map((c) => (
                  <DropdownMenuRadioItem key={c} value={c}>
                    {c}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {error && (
          <p role="alert" className="mx-6 mb-3 flex items-center gap-2 rounded-md bg-destructive-soft/60 px-3 py-2 text-[13px] text-destructive">
            <CircleAlert className="size-4" />
            {error}
          </p>
        )}
        <div className={cn("grid min-h-0 flex-1 grid-cols-3 gap-4 px-6 pb-6", !reports && "animate-pulse")}>
          {group(desktopList).map((col) => (
            <section
              key={col.key}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(col.key)
              }}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData("text/plain") || dragId
                if (id) move(id, col.key)
                setOver(null)
                setDragId(null)
              }}
              className={cn("flex min-h-0 flex-col rounded-lg bg-muted transition-shadow", over === col.key && "shadow-[inset_0_0_0_2px_var(--primary)]")}
            >
              <div className="flex items-center gap-2 px-3.5 pb-2.5 pt-3.5">
                <span className="size-2 rounded-full" style={{ background: col.dot }} />
                <h2 className="text-sm font-bold">{col.label}</h2>
                <span className="rounded-full bg-card px-2 py-px text-xs font-bold text-muted-foreground">{col.cards.length}</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-2.5 pb-2.5">
                {col.cards.map((r) => (
                  <KanbanCard key={r.id} r={r} onDragStart={() => setDragId(r.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ---------- mobile: tugas Pak Joko ---------- */}
      <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-background sm:border-x lg:hidden">
        <header className="flex h-14 flex-none items-center gap-2.5 pl-4 pr-3">
          <Mark />
          <span className="flex-1 text-[17px] font-extrabold tracking-[0.06em]">LAYAN</span>
          <AccountPill />
        </header>
        <div className="flex flex-none flex-col gap-0.5 px-4 pb-3 pt-1">
          <h1 className="text-[22px] font-bold tracking-[-0.01em]">Tugas saya</h1>
          <span className="text-[13px] text-muted-foreground">{me?.name} · {me?.unit}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-4 pb-4">
          {group(all.filter((r) => r.assignee === me?.id)).map((g) => (
            <section key={g.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-0.5">
                <span className="size-2 rounded-full" style={{ background: g.dot }} />
                <h2 className="text-sm font-bold">{g.label}</h2>
                <span className="text-xs font-bold text-muted-foreground">{g.cards.length}</span>
              </div>
              {g.cards.map((r) => (
                <div key={r.id} className="flex flex-col gap-2.5 rounded-lg border bg-card p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-semibold">{r.room}</span>
                    <UrgencyBadge urgency={r.urgency} large />
                  </div>
                  <span className="text-[15px] font-semibold leading-[21px]">{r.title}</span>
                  <Meta r={r} large />
                  {r.status === "baru" && (
                    <Button size="lg" onClick={() => move(r.id, "dikerjakan")}>
                      <Play />
                      Mulai kerjakan
                    </Button>
                  )}
                  {r.status === "dikerjakan" && (
                    <Button size="lg" variant="ink" onClick={() => move(r.id, "selesai")}>
                      <Check />
                      Tandai selesai
                    </Button>
                  )}
                  {r.status === "selesai" && (
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ok">
                      <CircleCheck className="size-[15px]" />
                      {justDone.has(r.id) ? "Selesai barusan · pelapor diberi tahu" : `Selesai ${r.updated}`}
                    </span>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
