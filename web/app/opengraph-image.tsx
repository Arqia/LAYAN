import { ImageResponse } from "next/og"

// Gambar pratinjau saat link LAYAN dibagikan (WhatsApp, Telegram, X). Dipakai semua halaman.
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "LAYAN, asisten layanan kampus"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#F7F7F5", color: "#16181A" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "#0A7A66", display: "flex", flexDirection: "column", justifyContent: "center", gap: 7, padding: "0 15px" }}>
            <div style={{ height: 6, width: "100%", borderRadius: 3, background: "#FFFFFF" }} />
            <div style={{ height: 6, width: "60%", borderRadius: 3, background: "#FFFFFF" }} />
          </div>
          LAYAN
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>Urus layanan kampus.</div>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, color: "#0A7A66" }}>Lewat satu chat.</div>
        </div>
        <div style={{ fontSize: 30, color: "#5A5F63" }}>Surat akademik · Aturan akademik · Booking ruang · Lapor kerusakan</div>
      </div>
    ),
    size,
  )
}
