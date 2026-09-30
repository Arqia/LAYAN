import Link from "next/link"

// Placeholder landing page. Diganti tim frontend (lihat PLAN.md, job desk FE-2).
export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-6 px-5 py-10">
      <h1 className="text-[30px] font-bold leading-9 tracking-[-0.02em]">LAYAN</h1>
      <p className="text-muted-foreground">Satu loket chat untuk mengurus layanan kampus sampai selesai.</p>
      <Link href="/login" className="font-semibold text-primary">
        Masuk
      </Link>
    </main>
  )
}
