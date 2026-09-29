import type { Metadata } from "next"
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"
import { cookies } from "next/headers"
import { ThemeProvider } from "next-themes"
import { fetchMe } from "@/lib/session"
import { StoreProvider } from "@/components/layan/store"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] })
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500", "600"] })

export const metadata: Metadata = {
  title: "LAYAN",
  description: "Satu loket chat untuk mengurus layanan kampus sampai selesai.",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies()
  const me = jar.has("layan_session") ? await fetchMe(jar.toString()).catch(() => null) : null
  return (
    <html lang="id" suppressHydrationWarning className={`${jakarta.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <StoreProvider me={me}>{children}</StoreProvider>
          <Toaster position="bottom-right" offset={24} />
        </ThemeProvider>
      </body>
    </html>
  )
}
