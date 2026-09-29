"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  ArrowDownWideNarrow, Bot, Check, ExternalLink, Inbox, Maximize2, MousePointerClick, Pencil, RotateCcw, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { PEOPLE, QUEUE, type QueueItem } from "@/lib/data"
import { TopBar } from "./app-bar"
import { StatusBadge, WorkerTile } from "./primitives"
import { useStore } from "./store"

const TABS = [
  ["semua", "Semua"],
  ["surat", "Surat"],
  ["tiket", "Tiket"],
  ["booking", "Booking"],
] as const
type Tab = (typeof TABS)[number][0]

const EDIT_LABEL = { surat: "Edit draft", helpdesk: "Balas", fasilitas: "Ubah jadwal" }

// Catatan: editor draft, viewer PDF, dan file lampiran belum ada di demo
const notInDemo = () => toast("Belum tersedia di demo", { description: "Butuh backend dokumen." })

function Metric({ label, value, note, noteClass, valueClass }: { label: string; value: React.ReactNode; note: string; noteClass?: string; valueClass?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 rounded-[12px] border bg-card px-4 py-3.5">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("text-[26px] font-bold leading-[30px] tracking-[-0.02em]", valueClass)}>{value}</span>
      </div>
      <span className={cn("pb-1 text-xs text-muted-foreground", noteClass)}>{note}</span>
    </div>
  )
}

function Toast({ ok, title, sub, onUndo }: { ok: boolean; title: string; sub: string; onUndo: () => void }) {
  return (
    <div className="flex w-[400px] animate-toast-in items-start gap-3 rounded-lg bg-[#16181A] py-3.5 pl-4 pr-3.5 text-white shadow-toast">
      <span className={cn("mt-px grid size-[22px] flex-none place-items-center rounded-full text-[#16181A]", ok ? "bg-[#34C3A5]" : "bg-[#FF8A80]")}>
        {ok ? <Check className="size-[13px]" strokeWidth={3} /> : <X className="size-[13px]" strokeWidth={3} />}
      </span>
      <div className="flex flex-1 flex-col gap-[3px]">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[13px] leading-[18px] text-[#C4C9CD]">{sub}</span>
      </div>
      <button type="button" onClick={onUndo} className="flex-none cursor-pointer px-1 py-0.5 text-[13px] font-bold text-[#34C3A5] hover:underline">
        Batalkan
      </button>
    </div>
  )
}

function Detail({ item, onApprove, onReject }: { item: QueueItem; onApprove: () => void; onReject: () => void }) {
  const p = PEOPLE[item.person]
  const last = item.timeline.length - 1
  return (
    <>
      <div className="flex flex-none items-center gap-4 border-b px-6 py-[18px]">
        <WorkerTile worker={item.worker} size={44} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-[-0.01em]">{item.type}</h2>
            <StatusBadge status="pending_approval" />
          </div>
          <span className="text-[13px] text-muted-foreground">
            {p.name} · <span className="font-mono text-xs">{p.nim}</span> · {p.prodi} · masuk {item.time}
          </span>
        </div>
        <div className="flex flex-none gap-2">
          <Button variant="outline" className="px-3.5" onClick={notInDemo}>
            <Pencil />
            {EDIT_LABEL[item.worker]}
          </Button>
          <Button variant="destructive-outline" className="px-3.5" onClick={onReject}>
            <X />
            Reject
          </Button>
          <Button className="px-[18px]" onClick={onApprove}>
            <Check />
            Approve
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-7 overflow-auto p-6">
          <section className="flex flex-col gap-2.5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Bot className="size-4" />
              Ringkasan dari agent
            </h3>
            <p className="max-w-[640px] text-pretty text-[15px] leading-6">{item.summary}</p>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="text-sm font-bold">Hasil cek syarat</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
              {item.checks.map((c) => (
                <div
                  key={c.label}
                  className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5", c.ok ? "bg-card" : "border-destructive-border bg-destructive-soft/40")}
                >
                  <span className={cn("grid size-5 flex-none place-items-center rounded-full [&_svg]:size-3", c.ok ? "bg-ok-bg text-ok" : "bg-destructive-soft text-destructive")}>
                    {c.ok ? <Check /> : <X />}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold">{c.label}</span>
                    <span className={cn("text-xs", c.ok ? "text-muted-foreground" : "text-destructive")}>{c.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {item.attachments.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h3 className="text-sm font-bold">Lampiran</h3>
              <div className="flex flex-wrap gap-2">
                {item.attachments.map((f) => (
                  <button key={f.name} type="button" onClick={notInDemo} className="flex w-[260px] cursor-pointer items-center gap-3 rounded-[12px] border p-2.5 text-left hover:border-primary">
                    <div className="relative flex h-[60px] w-12 flex-none flex-col gap-[3px] rounded-[6px] border bg-background px-[5px] py-1.5">
                      <span className="h-1.5 w-[70%] rounded-[1px] bg-dash" />
                      <span className="h-0.5 bg-input" />
                      <span className="h-0.5 bg-input" />
                      <span className="h-0.5 w-[60%] bg-input" />
                      <span className="absolute bottom-1 left-1 rounded-[3px] bg-[#B3261E] px-[3px] py-px font-mono text-[7px] font-semibold text-white">
                        {f.name.split(".").pop()?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-semibold">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{f.meta}</span>
                    </div>
                    <ExternalLink className="size-4 flex-none text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {item.pdf && (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Preview draft surat</h3>
                <button type="button" onClick={notInDemo} className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-primary-hover">
                  <Maximize2 className="size-3.5" />
                  Buka PDF
                </button>
              </div>
              <div className="flex justify-center rounded-[12px] bg-muted p-6">
                {/* kertas A4, selalu putih; kop/logo/TTD placeholder */}
                <div className="flex aspect-[1/1.414] w-[420px] flex-col gap-2.5 bg-white px-9 py-[34px] font-serif text-[#16181A] shadow-[0_1px_3px_rgba(22,24,26,.12),0_12px_32px_-16px_rgba(22,24,26,.25)]">
                  <div className="flex items-center gap-2.5 border-b-2 border-[#16181A] pb-2.5">
                    <span className="grid size-[30px] place-items-center rounded-[4px] border border-dashed border-[#8B8F95] font-mono text-[6px] text-[#6F737A]">LOGO</span>
                    <div className="flex flex-col gap-px">
                      <span className="text-[10px] font-bold tracking-[.04em]">FAKULTAS (NAMA INSTANSI)</span>
                      <span className="text-[7.5px] text-[#5C6066]">Alamat instansi · kop surat placeholder</span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-0.5 text-center">
                    <span className="text-[11px] font-bold tracking-[.04em] underline">{item.pdf.title}</span>
                    <span className="text-[8px] text-[#5C6066]">Nomor: terbit setelah disetujui</span>
                  </div>
                  <p className="mt-1.5 text-justify text-[8.5px] leading-[13px]">{item.pdf.body1}</p>
                  <div className="grid grid-cols-[70px_1fr] gap-x-2 gap-y-0.5 pl-3 text-[8.5px] leading-[13px]">
                    <span>Nama</span><span>: {p.name}</span>
                    <span>NIM</span><span>: {p.nim}</span>
                    <span>Program studi</span><span>: {p.prodi}</span>
                  </div>
                  <p className="text-justify text-[8.5px] leading-[13px]">{item.pdf.body2}</p>
                  <div className="mt-auto flex w-[130px] flex-col gap-[3px] self-end text-[8.5px] leading-3">
                    <span>Kepala Layanan Akademik,</span>
                    <span className="grid h-[30px] place-items-center rounded-[3px] border border-dashed border-[#8561DE] font-sans text-[7px] font-semibold text-[#6A45C4]">TTD setelah approve</span>
                    <span className="font-bold">(Nama pejabat)</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 overflow-auto border-l bg-panel p-6">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-bold">Timeline aksi agent</h3>
            <span className="text-xs text-muted-foreground">{item.timeline.length} aksi · tercatat di audit log</span>
          </div>
          <ol className="flex flex-col">
            {item.timeline.map((t, i) => (
              <li key={i} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className="mt-[3px] size-3 flex-none rounded-full border-2"
                    style={i === last ? { background: "var(--status-pending_approval-dot)", borderColor: "var(--status-pending_approval-dot)" } : { background: "var(--card)", borderColor: "var(--status-approved-dot)" }}
                  />
                  <span className="my-[3px] w-[1.5px] flex-1 bg-border" />
                </div>
                <div className="flex min-w-0 flex-col gap-[3px] pb-[18px]">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{t.time}</span>
                    <span className="truncate font-mono text-[13px] font-semibold">{t.tool}</span>
                  </div>
                  <span className="text-[13px] leading-[18px] text-soft-foreground">{t.result}</span>
                </div>
              </li>
            ))}
            <li className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
              <div className="flex justify-center">
                <span className="mt-[3px] size-3 rounded-full border-2 border-dashed border-violet-dot bg-card" />
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[13px] font-semibold text-violet">Menunggu keputusan staf</span>
                <span className="text-xs text-muted-foreground">Approve, reject, atau edit draft</span>
              </div>
            </li>
          </ol>
        </aside>
      </div>
    </>
  )
}

export function StaffConsole() {
  const { decisions, decide, undo } = useStore()
  const live = QUEUE.filter((q) => !decisions[q.id])
  const [tab, setTab] = useState<Tab>("semua")
  const [selected, setSelected] = useState<string | null>(() => live[0]?.id ?? null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState("")

  const visible = live.filter((q) => tab === "semua" || q.tab === tab)
  const cur = live.find((q) => q.id === selected)
  const first = cur ? PEOPLE[cur.person].name.split(" ")[0] : "mahasiswa"
  const oldest = Math.max(0, ...live.map((q) => q.mins))
  const counts = { semua: live.length, surat: 0, tiket: 0, booking: 0 }
  live.forEach((q) => counts[q.tab]++)

  function finish(kind: "ok" | "no") {
    if (!cur) return
    const name = PEOPLE[cur.person].name.split(" ")[0]
    decide(cur.id, { kind, reason: kind === "no" ? reason.trim() : undefined })
    setSelected(visible.find((q) => q.id !== cur.id)?.id ?? null)
    setRejectOpen(false)
    setReason("")
    const id = cur.id
    toast.custom(
      (t) => (
        <Toast
          ok={kind === "ok"}
          title={`${cur.type} ${name} ${kind === "ok" ? "disetujui" : "ditolak"}`}
          sub={kind === "ok" ? cur.toastSub : `Alasan sudah dikirim ke ${name} lewat chat.`}
          onUndo={() => {
            toast.dismiss(t)
            undo(id)
            setSelected(id)
          }}
        />
      ),
      { duration: 6000 },
    )
  }

  const chips = [
    { label: "Lampiran tidak valid", text: `Lampiran belum menunjukkan nama ${first} sebagai peserta. Upload surat undangan atau pengumuman yang mencantumkan nama, lalu ajukan ulang.` },
    { label: "Data tidak sesuai", text: "Tanggal kegiatan di permintaan berbeda dengan lampiran. Cek ulang tanggal, lalu ajukan ulang lewat chat." },
    { label: "Di luar ketentuan", text: "Permintaan ini di luar ketentuan yang berlaku. Silakan datang ke Layanan Akademik di jam kerja untuk dibantu." },
  ]

  return (
    <div className="flex min-h-screen min-w-[1280px] flex-col">
      <TopBar section="Staff Console" themeToggle />

      <div className="grid flex-none grid-cols-4 gap-3 px-6 pt-5">
        <Metric label="Permintaan hari ini" value="38" note="Surat 17 · Tiket 12 · Booking 9" />
        <Metric label="Rata-rata waktu proses" value={<>6<span className="ml-[3px] text-[15px] font-semibold text-muted-foreground">mnt</span></>} note="masuk sampai siap diputuskan" />
        <Metric label="Selesai otomatis" value="68%" note="26 dari 38 tanpa staf" noteClass="font-semibold text-ok" />
        <Metric
          label="Menunggu persetujuan"
          value={live.length}
          valueClass="text-violet"
          note={live.length === 0 ? "tidak ada antrean" : oldest >= 600 ? "tertua sejak kemarin" : `tertua ${oldest} menit`}
        />
      </div>

      <div className="grid h-[max(720px,calc(100vh-160px))] flex-1 grid-cols-[400px_minmax(0,1fr)] gap-4 px-6 pb-6 pt-4">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as Tab)
              setSelected(live.find((q) => v === "semua" || q.tab === v)?.id ?? null)
            }}
            className="gap-3 border-b px-4 pt-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Approval queue</h2>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowDownWideNarrow className="size-3.5" />
                Terbaru
              </span>
            </div>
            <TabsList variant="line" className="h-auto gap-1 p-0">
              {TABS.map(([k, label]) => (
                <TabsTrigger
                  key={k}
                  value={k}
                  className="h-[38px] flex-none gap-1.5 rounded-none px-2.5 text-[13px] font-semibold text-muted-foreground after:hidden data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_var(--primary)]! dark:data-[state=active]:border-transparent"
                >
                  {label}
                  <span
                    className={cn(
                      "inline-grid h-[18px] min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold",
                      tab === k ? "bg-ink text-ink-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {counts[k]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="min-h-0 flex-1 overflow-auto">
            {visible.map((q) => {
              const on = q.id === selected
              return (
                <button
                  key={q.id}
                  type="button"
                  aria-current={on || undefined}
                  onClick={() => setSelected(q.id)}
                  className={cn(
                    "grid w-full cursor-pointer grid-cols-[32px_minmax(0,1fr)] gap-3 border-b px-4 py-3.5 text-left",
                    on ? "bg-accent shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-background",
                  )}
                >
                  <WorkerTile worker={q.worker} size={32} />
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{PEOPLE[q.person].name}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{q.time}</span>
                    </span>
                    <span className="text-xs font-semibold" style={{ color: `var(--worker-${q.worker})` }}>{q.type}</span>
                    <span className="truncate text-[13px] text-soft-foreground">{q.line}</span>
                  </span>
                </button>
              )
            })}
            {visible.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
                <span className="grid size-12 place-items-center rounded-lg bg-accent text-primary">
                  <Inbox className="size-6" />
                </span>
                <span className="text-base font-bold">Queue bersih</span>
                <span className="max-w-[260px] text-pretty text-[13px] leading-[19px] text-muted-foreground">
                  Semua permintaan sudah diputuskan. Item baru dari agent akan muncul di sini.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => {
                    QUEUE.forEach((q) => undo(q.id))
                    setTab("semua")
                    setSelected(QUEUE[0].id)
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  Muat ulang demo
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
          {cur ? (
            <Detail item={cur} onApprove={() => finish("ok")} onReject={() => setRejectOpen(true)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 p-10 text-center text-muted-foreground">
              <span className="grid size-12 place-items-center rounded-lg bg-muted">
                <MousePointerClick className="size-[22px] text-icon" />
              </span>
              <span className="text-[15px] font-semibold text-foreground">Belum ada item dipilih</span>
              <span className="text-[13px]">Detail permintaan, cek syarat, dan audit log tampil di sini.</span>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={rejectOpen && !!cur}
        onOpenChange={(o) => {
          setRejectOpen(o)
          if (!o) setReason("")
        }}
      >
        <DialogContent showCloseButton={false} className="w-[500px] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[16px] border-0 p-0 shadow-e2 sm:max-w-[500px]">
          <div className="flex flex-col gap-1.5 px-6 pt-[22px]">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-lg font-bold">Tolak {cur?.type}?</DialogTitle>
              <button type="button" aria-label="Tutup" onClick={() => setRejectOpen(false)} className="-mr-2 -mt-1.5 grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <DialogDescription className="text-sm leading-5 text-muted-foreground">
              Alasan dikirim ke {first} lewat chat, bersama langkah berikutnya.
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-3 px-6 py-[18px]">
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button key={c.label} type="button" onClick={() => setReason(c.text)} className="inline-flex h-[30px] cursor-pointer items-center rounded-full border border-input px-3 text-[13px] font-medium hover:bg-muted">
                  {c.label}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">
                Alasan penolakan <span className="text-destructive">*</span>
              </span>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tulis alasan dan apa yang perlu dilakukan mahasiswa" />
              <span className="text-xs text-muted-foreground">Wajib diisi. Minimal sebut alasan dan langkah berikutnya.</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t bg-background px-6 py-3.5">
            <Button variant="ghost" className="px-3.5" onClick={() => setRejectOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" disabled={!reason.trim()} onClick={() => finish("no")}>
              Tolak permintaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
