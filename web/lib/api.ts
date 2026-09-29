// Client untuk API Rust. Browser selalu lewat /api (di-rewrite Next.js), jadi cookie sesi ikut.

export class ApiError extends Error {}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const json = typeof init?.body === "string"
  const res = await fetch(`/api${path}`, { ...init, headers: json ? { "content-type": "application/json" } : undefined })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.error ?? "Terjadi kesalahan. Coba lagi.")
  return body as T
}

export const post = <T>(path: string, data?: unknown) =>
  api<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) })

export type Card = { kind: string; state: "active" | "submitted" | "skipped" | "cancelled"; data: Record<string, unknown> }

export type ChatMessage = {
  id: number
  sender: "user" | "agent"
  text: string | null
  file: { name: string; size: number } | null
  card: Card | null
  time: string
}

export type AgentEvent =
  | { type: "status"; label: string | null; steps: string[] | null; step: number | null }
  | { type: "message"; message: ChatMessage }
  | { type: "update"; id: number; state: Card["state"] }
  | { type: "error"; message: string }
  | { type: "done" }

/** POST lalu baca respons SSE dari agent, event demi event. */
export async function stream(path: string, data: unknown, onEvent: (e: AgentEvent) => void) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error ?? "Agent tidak bisa dihubungi. Coba lagi.")
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += value
    let end: number
    while ((end = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, end)
      buf = buf.slice(end + 2)
      const payload = block
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n")
      if (payload) onEvent(JSON.parse(payload))
    }
  }
}
