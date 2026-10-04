"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CircleAlert, ShieldCheck } from "lucide-react"
import { Field } from "@/components/layan/action-cards"
import { ThemeToggle } from "@/components/layan/app-bar"
import { Wordmark } from "@/components/layan/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HOME, type Me } from "@/lib/data"

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return setError(body.error ?? "Belum bisa masuk. Coba lagi.")
      const next = new URLSearchParams(window.location.search).get("next")
      // hanya path internal, cegah open redirect
      const safe = next?.startsWith("/") && !next.startsWith("//") ? next : null
      // reload penuh supaya layout mengambil sesi baru
      window.location.assign(safe ?? HOME[(body.user as Me).role])
    } catch {
      setError("Server tidak bisa dihubungi. Pastikan API sudah jalan.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center gap-8 px-5 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-md pr-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />
          Beranda
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-col gap-3">
        <Wordmark />
        <h1 className="mt-4 text-[30px] font-bold leading-9 tracking-[-0.02em]">Masuk</h1>
        <p className="text-pretty text-[15px] leading-[22px] text-muted-foreground">
          Mahasiswa pakai NIM. Staf dan teknisi pakai email kampus.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="NIM atau email"
          name="username"
          autoComplete="username"
          inputMode="email"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Password</span>
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={!!error || undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <span role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <CircleAlert className="size-3.5 flex-none" />
              {error}
            </span>
          )}
        </label>
        <Button type="submit" size="lg" className="mt-2 w-full active:scale-[0.98]" disabled={loading || !identifier.trim() || !password}>
          {loading ? "Memeriksa…" : "Masuk"}
        </Button>
      </form>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 flex-none" />
        Setiap langkah tercatat. Keputusan akhir tetap di staf.
      </p>
    </main>
  )
}
