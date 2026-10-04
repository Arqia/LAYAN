"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, CircleAlert, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { ThemeToggle } from "./app-bar"
import { LetterPaper, type LetterBody, type Student } from "./letter"
import { StatusBadge } from "./primitives"
import type { Status } from "@/lib/data"

type Detail = { id: string; status: Status; letter: LetterBody | null; letter_no: string | null; approved_by: string | null; student: Student }

/** Halaman surat. "Simpan PDF" memakai dialog cetak browser, tanpa library PDF. */
export function LetterView({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    api<Detail>(`/requests/${encodeURIComponent(id)}`).then(setD, (e: Error) => setError(e.message))
  }, [id])

  return (
    <main className="flex min-h-[100dvh] flex-col items-center gap-5 bg-muted px-4 py-5 print:block print:bg-white print:p-0">
      <div className="flex w-full max-w-[794px] items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" aria-label="Kembali" onClick={() => history.back()}>
          <ArrowLeft className="size-[22px]" />
        </Button>
        <div className="flex flex-1 flex-col">
          <span className="font-mono text-[13px] font-semibold">{d?.letter_no ?? id}</span>
          {d && <StatusBadge status={d.status} />}
        </div>
        <Button onClick={() => window.print()} disabled={!d?.letter}>
          <Printer />
          Simpan PDF
        </Button>
        <ThemeToggle />
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {error}
        </p>
      )}
      {d && !d.letter && <p className="text-sm text-muted-foreground">Draft surat belum dibuat untuk permintaan ini.</p>}
      {!d && !error && <div className="aspect-[1/1.414] w-full max-w-[794px] animate-pulse bg-card" />}
      {d?.letter && (
        <LetterPaper
          letter={d.letter}
          student={d.student}
          number={d.letter_no}
          approvedBy={d.approved_by}
          className="[zoom:0.85] sm:[zoom:1.89] print:[zoom:1.89]"
        />
      )}
    </main>
  )
}
