import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // ada package-lock.json nyasar di C:\Users\ARVA, kunci root ke folder ini
  turbopack: { root: __dirname },
  // Browser memanggil /api di domain yang sama, jadi cookie sesi tidak lintas domain.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://127.0.0.1:8080"}/api/:path*` }]
  },
}

export default nextConfig
