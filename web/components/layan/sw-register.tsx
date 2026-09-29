"use client"

import { useEffect } from "react"

/** Daftarkan service worker di produksi saja, supaya tidak mengganggu hot reload. */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])
  return null
}
