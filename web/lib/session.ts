import type { Me } from "./data"

/** Alamat API Rust dari sisi server Next.js. Browser selalu lewat rewrite `/api`. */
export const API_URL = process.env.API_URL ?? "http://127.0.0.1:8080"

/**
 * Ambil user dari cookie sesi. `null` = belum login / sesi habis.
 * Melempar error kalau API tidak bisa dihubungi, supaya cookie tidak ikut dihapus.
 */
export async function fetchMe(cookie: string): Promise<Me | null> {
  const res = await fetch(`${API_URL}/api/me`, { headers: { cookie }, cache: "no-store" })
  return res.ok ? res.json() : null
}
