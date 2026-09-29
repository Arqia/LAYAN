import { ImageResponse } from "next/og"

// Ikon PWA digambar dari kode: kotak primary + kotak putih (mark LAYAN). Tanpa file gambar.
export async function GET(req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params
  const px = size === "512" ? 512 : 192
  const maskable = new URL(req.url).searchParams.has("maskable")
  const inner = Math.round(px * (maskable ? 0.24 : 0.32))
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A7A66", borderRadius: maskable ? 0 : px * 0.22 }}>
        <div style={{ width: inner, height: inner, background: "#FFFFFF", borderRadius: inner * 0.28 }} />
      </div>
    ),
    { width: px, height: px },
  )
}
