# Tugas Boas: Landing page dan halaman publik

Prioritas: **Tinggi**. Aturan wajib: [`AGENTS.md`](../../AGENTS.md). Branch: `boas/landing`.

## Wilayah file

Boleh diubah:
- `web/components/layan/landing.tsx`, `web/components/layan/student-flows.tsx`, `web/components/layan/site.tsx`
- `web/app/page.tsx`, `web/app/{faq,unduh,status,keamanan,untuk-staf}/**`, dan halaman baru `web/app/untuk-teknisi/**`
- `web/proxy.ts`: **hanya** menambah `"/untuk-teknisi"` ke set `PUBLIC`. Tanpa itu, halaman baru meminta login.

**Tidak boleh** menyentuh hal lain: `/app`, `/staf`, `/teknisi`, `/admin`, `/login`, `chat.tsx`, `staff-console.tsx`, `board.tsx`,
`app-bar.tsx`, `primitives.tsx`, `globals.css`, `api/`. Kalau merasa perlu, tanya Arva dulu.

## Kondisi sekarang (sudah dicek di kode)

- Landing ([landing.tsx](../../web/components/layan/landing.tsx)) urutannya: Hero, `StudentFlows`, Layanan, Cara kerja, Penutup, Footer.
- Nav melayang ("dynamic island") berisi: Logo, link Layanan / Cara Kerja / App, saklar Animasi, `ThemeToggle`, ID/EN, tombol Masuk.
  Di bawah 1080px berubah menjadi menu.
- Footer `SiteFooter` di [site.tsx](../../web/components/layan/site.tsx) punya kolom Produk, Bantuan, Lainnya. Footer ini **dipakai juga** di semua
  halaman publik (`/faq`, `/unduh`, `/status`, `/keamanan`, `/untuk-staf`), jadi perubahannya ikut ke sana. Itu memang diharapkan.
- `/untuk-staf` saat ini berisi gambaran umum staf **dan** teknisi (tabel "Dulu vs LAYAN", contoh Staff Console, contoh Board).
- `/unduh` sudah menjelaskan pemasangan PWA (iPhone Safari, Android Chrome, laptop Chrome/Edge) dan App Android (APK).
- `/faq` sudah ada.

## A. Tombol panduan di bawah StudentFlows (±1 jam)

1. Tepat setelah `<StudentFlows />`, tambahkan dua tombol:
   - **Panduan untuk Staf** → `/untuk-staf`
   - **Panduan untuk Teknisi** → `/untuk-teknisi`
2. Pakai gaya tombol landing yang sudah ada (`BTN_LINE`/`BTN_DARK`). Dua bahasa (ID/EN). Ikut animasi reveal (`data-reveal`) seperti elemen lain.

## B. Halaman tutorial Staf dan Teknisi (±4 jam)

1. **`/untuk-staf` diubah menjadi tutorial staf.** Bagian Board di halaman ini dipindah ke `/untuk-teknisi`.
   Langkah tutorial:
   1. Masuk dengan akun staf.
   2. Buka **Antrean**.
   3. Pilih permintaan.
   4. Baca hasil cek syarat, lampiran, dan preview surat.
   5. **Setujui**, **Tolak** (alasan wajib), atau **Balas** (tiket).
   6. Gunakan **Batalkan** untuk membatalkan keputusan.
   7. Lihat **Metrik**.
2. **`/untuk-teknisi` halaman baru, tutorial teknisi.** Langkah tutorial:
   1. Masuk dengan akun teknisi.
   2. Laporan masuk di kolom **Baru**.
   3. **Terima**.
   4. Kerjakan.
   5. **Tandai selesai** (pelapor otomatis dikabari lewat chat), atau **Eskalasi** dengan alasan kalau sarana rusak berat.
   6. **Rekap bulanan** untuk laporan per ruang, bisa disimpan sebagai PDF.
3. Label tombol di tutorial harus **persis** sama dengan label di aplikasi. Daftar label ada di [`docs/tugas/arqia.md`](arqia.md) (Arqia sedang
   mengubah `/staf` dan `/teknisi`). Tulis kerangka dan teks dulu. Ilustrasi/tangkapan layar final dibuat setelah PR Arqia di-merge.
4. Pakai `SitePage` + `Block` dari `site.tsx`, contoh tampilan pakai pola yang sudah ada di `/untuk-staf`. Teks dua bahasa.
5. Tambahkan `"/untuk-teknisi"` ke `PUBLIC` di `web/proxy.ts`, dan tambahkan link-nya ke nav `SitePage`.

## C. Footer (±30 menit)

1. Hapus kolom **Produk** dan **Bantuan** dari `SiteFooter`.
2. Kolom **Lainnya** bergeser ke kiri, tepat di sebelah blok logo + tagline. Grid disesuaikan supaya tidak ada ruang kosong.
3. Baris bawah (© 2026 LAYAN dan catatan pedoman) tetap.

## D. Nav: FAQ dan tombol Unduh per platform (±4 jam)

1. Tambahkan link **FAQ** (→ `/faq`) ke nav landing, di desktop dan di menu HP.
2. **Tombol Unduh dipisah** dari pill nav: tombol bulat sendiri dengan ikon unduh, berdiri di sebelah pill nav (di luar pill), dan ikut
   mengecil saat scroll seperti pill-nya. Di HP tombol tetap terlihat di sebelah tombol menu.
3. Klik tombol Unduh membuka panel pilihan platform: **Apple**, **Android**, **Windows**, **Linux**.
   - Platform pengunjung dideteksi (`navigator.userAgent`) dan disorot lebih dulu, tapi semua tetap bisa dipilih.
   - Panel: `Dialog` dari `components/ui`, atau popover dengan fokus/Esc yang benar.
4. Isi tiap platform (**hanya fakta ini, jangan mengarang**):

   | Platform | Isi |
   |---|---|
   | Apple (iPhone/iPad) | Tidak ada app di App Store. Pasang sebagai PWA: buka di Safari, ketuk **Bagikan**, lalu **Tambah ke Layar Utama** |
   | Apple (Mac) | PWA lewat Chrome/Edge (ikon instal di kolom alamat), atau Safari: menu **File**, lalu **Add to Dock** |
   | Android | Tombol **Unduh APK** → `/api/app/layan.apk` (App Android, khusus mahasiswa). Alternatif: PWA lewat Chrome, menu ⋮, lalu **Instal aplikasi** |
   | Windows | Tidak ada installer .exe. PWA lewat Chrome/Edge: klik ikon instal di ujung kolom alamat |
   | Linux | Tidak ada .deb/.AppImage. PWA lewat Chrome/Chromium/Edge: klik ikon instal di kolom alamat |

   Tiap pilihan punya link "Selengkapnya" ke `/unduh`. Di `/unduh`, susun ulang isinya menjadi 4 bagian platform yang sama.
5. Ikon platform:
   - Boleh SVG inline logo brand dari sumber berlisensi bebas (sebutkan sumbernya di PR).
   - Kalau tidak ada, pakai ikon `lucide-react` (`Smartphone`, `Laptop`, `Monitor`) + nama platform.
   - Jangan menambah paket ikon.
6. Teks dua bahasa. Hormati saklar Animasi.

## Tambahan dari Arva

1. Tambahkan pertanyaan di `/faq`: "Apakah ada app untuk iPhone/Windows/Linux?" Jawabannya mengikuti tabel D4.
2. Cek seluruh landing di 375px: tidak ada scroll horizontal, nav + tombol Unduh + menu muat.
3. Semua elemen baru jalan di mode gelap dan saat saklar Animasi mati.

## Kriteria selesai

- [ ] A–D dan tambahan selesai. Tidak ada file di luar wilayah yang berubah (kecuali satu baris `proxy.ts`).
- [ ] Tidak ada klaim produk di luar fakta `AGENTS.md` bagian 2. Tidak ada link ke App Store/Play Store/installer.
- [ ] Tidak ada warna/hex di luar token, tidak ada dependency baru, semua teks ada versi ID dan EN.
- [ ] `npm run lint` dan `npm run build` lulus. Dicek terang + gelap, 375px + 1440px.
