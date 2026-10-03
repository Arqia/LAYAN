import type { LucideIcon } from "lucide-react"
import { BookOpen, Building2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_LABEL, type Status, type Urgency, type Worker } from "@/lib/data"

/** Mark LAYAN: logo resmi (kotak ink + huruf L + titik hijau). Lihat `public/logo.svg`. */
export function Mark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex flex-none", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden>
        <rect width="72" height="72" rx="18" fill="#16181A" />
        <path d="M25,19 V51 H47" fill="none" stroke="#F0F0EC" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="51" cy="21" r="7" fill="#0A7A66" />
      </svg>
    </span>
  )
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Mark />
      <span className="text-[17px] font-extrabold tracking-[0.06em]">LAYAN</span>
    </span>
  )
}

/** Avatar agent: kotak ink + isi #34C3A5. */
export function AgentAvatar({ size = 28 }: { size?: number }) {
  const big = size > 32
  return (
    <span
      className={cn("grid flex-none place-items-center bg-ink", big ? "rounded-[13px]" : "rounded-[8px]")}
      style={{ width: size, height: size }}
    >
      <span
        className={cn("bg-[#34C3A5] dark:bg-[#0A7A66]", big ? "rounded-[4px]" : "rounded-[2.5px]")}
        style={{ width: big ? 14 : 9, height: big ? 14 : 9 }}
      />
    </span>
  )
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full py-[3px] pl-2 pr-2.5 text-xs font-semibold leading-[18px]",
        className,
      )}
      style={{ color: `var(--status-${status})`, background: `var(--status-${status}-bg)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: `var(--status-${status}-dot)` }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

export const WORKER_ICON: Record<Worker, LucideIcon> = {
  surat: FileText,
  helpdesk: BookOpen,
  fasilitas: Building2,
}

const TILE = {
  24: "size-6 rounded-[7px] [&_svg]:size-3.5",
  28: "size-7 rounded-[8px] [&_svg]:size-[15px]",
  32: "size-8 rounded-[9px] [&_svg]:size-4",
  36: "size-9 rounded-[10px] [&_svg]:size-[18px]",
  40: "size-10 rounded-[11px] [&_svg]:size-5",
  44: "size-11 rounded-[12px] [&_svg]:size-[22px]",
} as const

/** Tile ikon worker. Ikon + aksen kecil, tidak pernah blok warna penuh. */
export function WorkerTile({
  worker,
  icon,
  size = 24,
  className,
}: {
  worker: Worker
  icon?: LucideIcon
  size?: keyof typeof TILE
  className?: string
}) {
  const Icon = icon ?? WORKER_ICON[worker]
  return (
    <span
      className={cn("grid flex-none place-items-center", TILE[size], className)}
      style={{ color: `var(--worker-${worker})`, background: `var(--worker-${worker}-bg)` }}
    >
      <Icon />
    </span>
  )
}

const URGENCY = {
  Rendah: { fg: "var(--status-submitted)", bg: "var(--status-submitted-bg)", bars: 1 },
  Sedang: { fg: "var(--status-needs_info)", bg: "var(--status-needs_info-bg)", bars: 2 },
  Tinggi: { fg: "var(--status-rejected)", bg: "var(--status-rejected-bg)", bars: 3 },
}

/** Urgensi pakai ikon 3 bar + teks agar tidak tertukar dengan status. */
export function UrgencyBadge({ urgency, large }: { urgency: Urgency; large?: boolean }) {
  const u = URGENCY[urgency]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] rounded-sm px-2 py-0.5 font-bold tracking-[.02em]",
        large ? "text-xs" : "text-[11px]",
      )}
      style={{ color: u.fg, background: u.bg }}
    >
      <span className="flex items-end gap-[1.5px]" aria-hidden>
        {[5, 8, 11].map((h, i) => (
          <span
            key={h}
            className="w-[3px] rounded-[1px] bg-current"
            style={{ height: h, opacity: i < u.bars ? 1 : 0.3 }}
          />
        ))}
      </span>
      {urgency}
    </span>
  )
}

export function TypingDots() {
  return (
    <span className="inline-flex h-3.5 items-center gap-1" aria-label="Agent sedang bekerja">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-typing rounded-full bg-primary"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  )
}

/** Tile tipe file (PDF merah, lainnya netral). */
export function FileTypeTile({ name, onPrimary }: { name: string; onPrimary?: boolean }) {
  const ext = name.split(".").pop()?.toUpperCase() ?? "FILE"
  return (
    <span
      className={cn(
        "grid h-[42px] w-[34px] flex-none place-items-center rounded-[6px] font-mono text-[9px] font-semibold",
        onPrimary ? "rounded-[8px] bg-white/15" : ext === "PDF" ? "bg-destructive-soft text-destructive" : "bg-muted text-muted-foreground",
      )}
    >
      {ext}
    </span>
  )
}

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.round(bytes / 1024)} KB`
}
