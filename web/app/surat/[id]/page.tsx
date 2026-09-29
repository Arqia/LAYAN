import { LetterView } from "@/components/layan/letter-view"

export const metadata = { title: "Surat · LAYAN" }

export default async function Page({ params }: PageProps<"/surat/[id]">) {
  const { id } = await params
  return <LetterView id={decodeURIComponent(id)} />
}
