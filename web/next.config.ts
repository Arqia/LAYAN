import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // ada package-lock.json nyasar di C:\Users\ARVA, kunci root ke folder ini
  turbopack: { root: __dirname },
  // Browser memanggil /api di domain yang sama, jadi cookie sesi tidak lintas domain.
  // Header keamanan dasar (panduan PWA Next.js)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ]
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://127.0.0.1:8080"}/api/:path*` }]
  },
}

export default nextConfig
