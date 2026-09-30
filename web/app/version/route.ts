// Id build yang sedang berjalan. UpdateNotifier membandingkannya dengan id yang tertanam di JS klien.
export const dynamic = "force-dynamic"

export function GET() {
  return Response.json({ v: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" }, { headers: { "Cache-Control": "no-store" } })
}
