import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

// Logo LAYAN (public/logo.svg): kotak ink + huruf L + titik hijau.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 72 72">
        <rect width="72" height="72" rx="18" fill="#16181A" />
        <path d="M25,19 V51 H47" fill="none" stroke="#F0F0EC" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="51" cy="21" r="7" fill="#0A7A66" />
      </svg>
    ),
    size,
  )
}
