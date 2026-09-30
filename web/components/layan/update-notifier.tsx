"use client"

import { useEffect } from "react"
import { toast } from "sonner"

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID
const INTERVAL = 5 * 60 * 1000

/** Cek versi server saat tab dibuka lagi dan tiap 5 menit. Kalau beda, tawarkan muat ulang (tidak dipaksa: pengguna bisa sedang mengetik). */
export function UpdateNotifier() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !BUILD_ID) return
    let shown = false
    const check = async () => {
      if (shown || document.visibilityState !== "visible") return
      try {
        const { v } = await fetch("/version", { cache: "no-store" }).then((r) => r.json())
        if (v === BUILD_ID) return
        shown = true
        toast("Versi baru tersedia", {
          description: "Muat ulang untuk memakai pembaruan terbaru.",
          duration: Infinity,
          action: { label: "Muat ulang", onClick: () => location.reload() },
        })
      } catch {
        // offline atau server sedang restart: coba lagi di putaran berikutnya
      }
    }
    const id = setInterval(check, INTERVAL)
    document.addEventListener("visibilitychange", check)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", check)
    }
  }, [])
  return null
}
