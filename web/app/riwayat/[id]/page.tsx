import { HistoryDetail } from "@/components/layan/history"

export default async function Page({ params }: PageProps<"/riwayat/[id]">) {
  const { id } = await params
  return <HistoryDetail id={decodeURIComponent(id)} />
}
