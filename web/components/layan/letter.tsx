import { cn } from "@/lib/utils"

export type LetterBody = { title: string; body1: string; body2: string }
export type Student = { name: string; nim: string | null; prodi: string | null }

/**
 * Kertas A4 surat (lebar 420px, selalu putih). Kop, logo, dan TTD masih placeholder.
 * Halaman cetak memperbesarnya dengan CSS `zoom`.
 */
export function LetterPaper({
  letter, student, number, approvedBy, className,
}: {
  letter: LetterBody
  student: Student
  number?: string | null
  approvedBy?: string | null
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex aspect-[1/1.414] w-[420px] flex-col gap-2.5 bg-white px-9 py-[34px] font-serif text-[#16181A] shadow-[0_1px_3px_rgba(22,24,26,.12),0_12px_32px_-16px_rgba(22,24,26,.25)] print:shadow-none",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b-2 border-[#16181A] pb-2.5">
        <span className="grid size-[30px] place-items-center rounded-[4px] border border-dashed border-[#8B8F95] font-mono text-[6px] text-[#6F737A]">LOGO</span>
        <div className="flex flex-col gap-px">
          <span className="text-[10px] font-bold tracking-[.04em]">FAKULTAS (NAMA INSTANSI)</span>
          <span className="text-[7.5px] text-[#5C6066]">Alamat instansi · kop surat placeholder</span>
        </div>
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5 text-center">
        <span className="text-[11px] font-bold tracking-[.04em] underline">{letter.title}</span>
        <span className="text-[8px] text-[#5C6066]">Nomor: {number ?? "terbit setelah disetujui"}</span>
      </div>
      <p className="mt-1.5 text-justify text-[8.5px] leading-[13px]">{letter.body1}</p>
      <div className="grid grid-cols-[70px_1fr] gap-x-2 gap-y-0.5 pl-3 text-[8.5px] leading-[13px]">
        <span>Nama</span>
        <span>: {student.name}</span>
        <span>NIM</span>
        <span>: {student.nim}</span>
        <span>Program studi</span>
        <span>: {student.prodi}</span>
      </div>
      <p className="text-justify text-[8.5px] leading-[13px]">{letter.body2}</p>
      <div className="mt-auto flex w-[130px] flex-col gap-[3px] self-end text-[8.5px] leading-3">
        <span>Kepala Layanan Akademik,</span>
        {approvedBy ? (
          <span className="grid h-[30px] place-items-center rounded-[3px] border border-[#2E9B55] font-sans text-[7px] font-semibold text-[#18793C]">
            Disetujui digital · {approvedBy}
          </span>
        ) : (
          <span className="grid h-[30px] place-items-center rounded-[3px] border border-dashed border-[#8561DE] font-sans text-[7px] font-semibold text-[#6A45C4]">
            TTD setelah approve
          </span>
        )}
        <span className="font-bold">(Nama pejabat)</span>
      </div>
    </div>
  )
}
