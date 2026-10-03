import type { Metadata } from "next"
import { UnduhView } from "./view"

export const metadata: Metadata = {
  title: "Unduh app | LAYAN",
  description: "Pasang LAYAN dari browser sebagai PWA atau unduh App Android.",
}

export default function Page() {
  return <UnduhView />
}
