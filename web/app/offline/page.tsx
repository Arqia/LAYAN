import { WifiOff } from "lucide-react"
import { Wordmark } from "@/components/layan/primitives"

export const metadata = { title: "Offline · LAYAN" }

// Ditampilkan service worker saat halaman dibuka tanpa koneksi.
export default function Offline() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[400px] flex-col justify-center gap-6 px-5">
      <Wordmark />
      <span className="grid size-12 place-items-center rounded-lg bg-destructive-soft text-destructive">
        <WifiOff className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.01em]">Kamu sedang offline</h1>
        <p className="text-pretty text-[15px] leading-[22px] text-muted-foreground">
          Progres permintaanmu aman di server. Buka lagi LAYAN setelah koneksi kembali.
        </p>
      </div>
    </main>
  )
}
