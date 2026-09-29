import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A7A66" }}>
        <div style={{ width: 54, height: 54, background: "#FFFFFF", borderRadius: 15 }} />
      </div>
    ),
    size,
  )
}
