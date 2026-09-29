import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LAYAN · Digital Campus Worker",
    short_name: "LAYAN",
    description: "Satu loket chat untuk mengurus layanan kampus sampai selesai.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F7F5",
    theme_color: "#0A7A66",
    lang: "id",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512?maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
