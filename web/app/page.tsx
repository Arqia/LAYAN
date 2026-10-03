import type { Metadata } from "next"
import { Landing } from "@/components/layan/landing"

export const metadata: Metadata = {
  title: "LAYAN | Asisten layanan kampus",
  description: "Ajukan surat akademik (dispensasi, aktif kuliah, magang, dll.), tanya aturan akademik, booking ruang, dan lapor kerusakan lewat satu chat.",
}

export default function Page() {
  return <Landing />
}
