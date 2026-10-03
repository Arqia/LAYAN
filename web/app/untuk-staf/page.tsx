import type { Metadata } from "next"
import { StafView } from "./view"

export const metadata: Metadata = {
  title: "Untuk staf & teknisi | LAYAN",
  description: "Staff Console dan Board Teknisi: agent mengerjakan langkah berulang, staf cukup memutuskan.",
}

export default function Page() {
  return <StafView />
}
