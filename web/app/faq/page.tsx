import type { Metadata } from "next"
import { FaqView } from "./view"

export const metadata: Metadata = {
  title: "FAQ | LAYAN",
  description: "Pertanyaan yang sering muncul tentang LAYAN: akun, layanan, jawaban AI, ruang, dan lampiran.",
}

export default function Page() {
  return <FaqView />
}
