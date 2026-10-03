import { ImageResponse } from "next/og"

// Ikon PWA dari logo LAYAN (public/logo.svg). Maskable dikecilkan ke zona aman 72%.
export async function GET(req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params
  const px = size === "512" ? 512 : 192
  const maskable = new URL(req.url).searchParams.has("maskable")
  const art = Math.round(px * (maskable ? 0.72 : 1))
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#16181A" }}>
        <svg width={art} height={art} viewBox="0 0 72 72">
          <rect width="72" height="72" rx="18" fill="#16181A" />
          <path d="M25,19 V51 H47" fill="none" stroke="#F0F0EC" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="51" cy="21" r="7" fill="#0A7A66" />
        </svg>
      </div>
    ),
    { width: px, height: px },
  )
}
