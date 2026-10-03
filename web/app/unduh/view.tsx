"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Block, CheckIcon, Logo, SitePage, BTN_DARK, BTN_LINE, useLang } from "@/components/layan/site"

// Dua produk: PWA (semua peran, dari browser) dan App Android (mahasiswa saja, APK dari /api/app/layan.apk).
// QR di public/qr-apk.svg menunjuk ke https://layan.codewithus.me/api/app/layan.apk (dibuat sekali dengan `npx qrcode`).
const T = {
  id: {
    kicker: "Unduh app",
    title: "LAYAN di layar utama HP-mu.",
    sub: "Pilih yang cocok: pasang dari browser tanpa toko aplikasi, atau unduh App Android.",
    pwaTitle: "Dari browser (PWA)",
    pwaSub: "Untuk semua peran: mahasiswa, staf, dan teknisi. Selalu versi terbaru, dan ada pemberitahuan saat pembaruan tersedia.",
    install: "Pasang sekarang", installed: "LAYAN sudah terpasang di perangkat ini.",
    manual: "Pasang manual",
    steps: [["iPhone (Safari)", "Ketuk Bagikan, lalu Tambah ke Layar Utama."], ["Android (Chrome)", "Buka menu titik tiga, lalu Instal aplikasi."], ["Laptop (Chrome, Edge)", "Klik ikon instal di ujung kolom alamat."]],
    apkTitle: "App Android",
    apkSub: "Khusus akun mahasiswa. App menawarkan pembaruan sendiri setiap kali dibuka.",
    scan: "Pindai dengan kamera HP untuk mengunduh",
    download: "Unduh APK",
    latest: "Versi terbaru", checking: "Mengecek versi…", none: "Belum ada rilis yang diterbitkan.",
    unknown: "Saat memasang, Android akan meminta izin instal dari sumber ini. Izinkan untuk melanjutkan.",
    phoneGreet: "Mau urus apa hari ini?", phoneQ: "Proyektor di F2.3 mati.", phoneA: "Laporanmu sudah diteruskan ke teknisi.",
  },
  en: {
    kicker: "Get the app",
    title: "LAYAN on your home screen.",
    sub: "Pick what suits you: install from the browser without an app store, or download the Android app.",
    pwaTitle: "From the browser (PWA)",
    pwaSub: "For every role: students, staff, and technicians. Always the latest version, with a notice when an update is available.",
    install: "Install now", installed: "LAYAN is already installed on this device.",
    manual: "Install manually",
    steps: [["iPhone (Safari)", "Tap Share, then Add to Home Screen."], ["Android (Chrome)", "Open the three-dot menu, then Install app."], ["Laptop (Chrome, Edge)", "Click the install icon at the end of the address bar."]],
    apkTitle: "Android app",
    apkSub: "Student accounts only. The app offers updates by itself every time it opens.",
    scan: "Scan with your phone camera to download",
    download: "Download APK",
    latest: "Latest version", checking: "Checking version…", none: "No release has been published yet.",
    unknown: "While installing, Android asks permission to install from this source. Allow it to continue.",
    phoneGreet: "What do you need today?", phoneQ: "The projector in F2.3 is broken.", phoneA: "Your report has been sent to a technician.",
  },
}

type Release = { versionName: string; notes?: string; sha256?: string } | null
const noop = () => () => {}
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function UnduhView() {
  const lang = useLang()
  const t = T[lang]
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const standalone = useSyncExternalStore(noop, () => matchMedia("(display-mode: standalone)").matches, () => false)
  const [justInstalled, setInstalled] = useState(false)
  const installed = standalone || justInstalled
  const [release, setRelease] = useState<Release | undefined>(undefined)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPrompt)
    }
    const onInstalled = () => (setInstalled(true), setPrompt(null))
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    fetch("/api/app/latest").then((r) => (r.ok ? r.json() : null)).then(setRelease, () => setRelease(null))
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    if ((await prompt.userChoice).outcome === "accepted") setInstalled(true)
    setPrompt(null)
  }

  return (
    <SitePage lang={lang} kicker={t.kicker} title={t.title} sub={t.sub}>
      <Block title={t.pwaTitle} sub={t.pwaSub}>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-6">
            {installed ? (
              <p className="m-0 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-[15px] font-medium text-accent-foreground">
                <CheckIcon size={16} /> {t.installed}
              </p>
            ) : (
              prompt && <button type="button" onClick={install} className={`${BTN_DARK} self-start`}>{t.install}</button>
            )}
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[.08em] text-subtle-foreground">{t.manual}</span>
              <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
                {t.steps.map(([device, how], i) => (
                  <li key={device} className="flex flex-col gap-2 rounded-[20px] border bg-card p-5">
                    <span className="font-mono text-xs text-primary">0{i + 1}</span>
                    <span className="text-[16px] font-semibold">{device}</span>
                    <span className="text-[14.5px] leading-relaxed text-muted-foreground">{how}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <Phone t={t} />
        </div>
      </Block>

      <Block title={t.apkTitle} sub={t.apkSub}>
        <div className="grid items-center gap-8 rounded-[28px] border bg-card p-[clamp(20px,3vw,36px)] md:grid-cols-[auto_1fr]">
          <figure className="m-0 flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG statis kecil, tidak perlu optimasi gambar */}
            <img src="/qr-apk.svg" alt={t.scan} width={184} height={184} className="rounded-2xl border p-2" />
            <figcaption className="max-w-[184px] text-center text-[12.5px] text-muted-foreground">{t.scan}</figcaption>
          </figure>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-[.08em] text-subtle-foreground">{t.latest}</span>
              {release === undefined ? (
                <span className="text-[15px] text-muted-foreground">{t.checking}</span>
              ) : release ? (
                <>
                  <span className="text-[22px] font-semibold tracking-[-.02em]">v{release.versionName}</span>
                  {release.notes && <span className="text-[14.5px] text-soft-foreground">{release.notes}</span>}
                  {release.sha256 && <span className="font-mono text-[11.5px] text-subtle-foreground">SHA-256 {release.sha256.slice(0, 16)}…</span>}
                </>
              ) : (
                <span className="text-[15px] text-muted-foreground">{t.none}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="/api/app/layan.apk" download className={release === null ? `${BTN_LINE} pointer-events-none opacity-50` : BTN_DARK} aria-disabled={release === null}>{t.download}</a>
            </div>
            <p className="m-0 max-w-[560px] border-l-2 border-input pl-4 text-[13.5px] text-muted-foreground">{t.unknown}</p>
          </div>
        </div>
      </Block>
    </SitePage>
  )
}

/** Bingkai HP berisi potongan chat, supaya terlihat seperti apa LAYAN setelah dipasang. */
function Phone({ t }: { t: (typeof T)["id"] }) {
  return (
    <div aria-hidden className="mx-auto w-[260px] rounded-[44px] border-[10px] border-ink bg-ink shadow-[0_50px_100px_-40px_rgba(22,24,26,.55)]">
      <div className="relative flex h-[500px] flex-col overflow-hidden rounded-[34px] bg-background">
        <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" />
        <div className="mt-9 flex items-center gap-2 border-b px-4 pb-3">
          <Logo size={24} />
          <span className="text-[13px] font-semibold">LAYAN</span>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-2.5 p-3.5">
          <span className="text-[17px] font-semibold leading-tight tracking-[-.02em]">{t.phoneGreet}</span>
          <span className="self-end max-w-[85%] rounded-[16px_16px_5px_16px] bg-ink px-3 py-2 text-[12.5px] text-ink-foreground">{t.phoneQ}</span>
          <span className="self-start max-w-[90%] rounded-[16px_16px_16px_5px] bg-muted px-3 py-2 text-[12.5px]">{t.phoneA}</span>
        </div>
        <div className="m-3 mt-0 flex h-10 items-center justify-end rounded-xl border bg-panel px-1.5">
          <span className="size-7 rounded-lg bg-ink" />
        </div>
      </div>
    </div>
  )
}
