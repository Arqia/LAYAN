import type { Metadata } from "next"
import { KeamananView } from "./view"

export const metadata: Metadata = {
  title: "Keamanan & sumber | LAYAN",
  description: "Dari mana jawaban LAYAN berasal, batas yang dipegang AI, dan bagaimana data mahasiswa dijaga.",
}

export default function Page() {
  return <KeamananView />
}
