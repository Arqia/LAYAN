"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Me } from "@/lib/data"

// User yang login, diambil sekali di root layout. Data lain diambil langsung dari API.
const Ctx = createContext<{ me: Me | null }>({ me: null })

export function StoreProvider({ me, children }: { me: Me | null; children: ReactNode }) {
  return <Ctx.Provider value={{ me }}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
