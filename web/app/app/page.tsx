import { Chat } from "@/components/layan/chat"

// ?q= datang dari landing page: pertanyaan yang diklik mahasiswa, diisikan ke kolom chat
export default async function Page({ searchParams }: PageProps<"/app">) {
  const { q } = await searchParams
  return <Chat initialText={typeof q === "string" ? q.slice(0, 500) : ""} />
}
