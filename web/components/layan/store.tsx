"use client"

import { createContext, useCallback, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import type { Me } from "@/lib/data"
import type { Room } from "./action-cards"

/*
 * State bersama di root layout: user yang login + state demo chat/keputusan.
 * Catatan: chat & keputusan masih in-memory (hilang saat reload), pindah ke API di hari 2–3.
 */

export type CardKind = "form" | "upload" | "checks" | "draft" | "answer" | "ticket" | "rooms" | "held" | "report" | "done"
export type FileInfo = { name: string; size: number }

export type Msg =
  | { id: string; from: "time"; text: string }
  | { id: string; from: "user"; text?: string; file?: FileInfo; failed?: boolean }
  | { id: string; from: "agent"; text?: string; card?: CardKind; state?: "active" | "submitted" | "cancelled"; room?: Room }

export type AgentStatus = { label: string; steps?: string[]; step?: number } | null
export type Decision = { kind: "ok" | "no"; reason?: string }

type Store = {
  me: Me | null
  messages: Msg[]
  setMessages: Dispatch<SetStateAction<Msg[]>>
  agent: AgentStatus
  setAgent: Dispatch<SetStateAction<AgentStatus>>
  decisions: Record<string, Decision>
  decide: (id: string, d: Decision) => void
  undo: (id: string) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ me, children }: { me: Me | null; children: ReactNode }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [agent, setAgent] = useState<AgentStatus>(null)
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const decide = useCallback((id: string, d: Decision) => setDecisions((s) => ({ ...s, [id]: d })), [])
  const undo = useCallback(
    (id: string) =>
      setDecisions((s) => {
        const next = { ...s }
        delete next[id]
        return next
      }),
    [],
  )
  return (
    <Ctx.Provider value={{ me, messages, setMessages, agent, setAgent, decisions, decide, undo }}>{children}</Ctx.Provider>
  )
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error("useStore harus di dalam StoreProvider")
  return s
}
