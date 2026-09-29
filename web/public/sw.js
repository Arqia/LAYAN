// Service worker LAYAN: kalau navigasi gagal karena offline, tampilkan halaman /offline.
// Data (chat, antrean) tidak di-cache supaya tidak ada info basi.
const CACHE = "layan-v1"

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/offline")))
  self.skipWaiting()
})

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return
  e.respondWith(fetch(e.request).catch(() => caches.match("/offline")))
})
