package me.codewithus.layan.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject

/* ---------- baca data card ---------- */

fun JsonObject.s(key: String): String = (this[key] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: ""
fun JsonObject.i(key: String): Int = (this[key] as? kotlinx.serialization.json.JsonPrimitive)?.intOrNull ?: 0
fun JsonObject.b(key: String): Boolean = (this[key] as? kotlinx.serialization.json.JsonPrimitive)?.booleanOrNull ?: false
fun JsonObject.list(key: String): List<JsonObject> = (this[key] as? JsonArray)?.map { it.jsonObject } ?: emptyList()
fun JsonObject.obj(key: String): JsonObject? = this[key] as? JsonObject

/** File yang dipilih dari HP, belum di-upload. */
data class Picked(val name: String, val mime: String, val bytes: ByteArray) {
    val sizeLabel: String get() = if (bytes.size >= 1024 * 1024) "%.1f MB".format(bytes.size / 1048576f).replace('.', ',') else "${bytes.size / 1024} KB"
}

private val pad = Modifier.padding(14.dp)

@Composable
private fun Body(content: @Composable () -> Unit) = Column(pad, verticalArrangement = Arrangement.spacedBy(14.dp)) { content() }

@Composable
private fun Footer(content: @Composable () -> Unit) = Column(Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp)) { content() }

@Composable
fun FileTile(name: String, onPrimary: Boolean = false) {
    val ext = name.substringAfterLast('.', "FILE").uppercase()
    val (fg, bg) = when {
        onPrimary -> Color.White to Color.White.copy(alpha = 0.16f)
        ext == "PDF" -> C.destructive to C.destructiveSoft
        else -> C.mutedFg to C.muted
    }
    Box(Modifier.size(34.dp, 42.dp).clip(RoundedCornerShape(if (onPrimary) 8.dp else 6.dp)).background(bg), contentAlignment = Alignment.Center) {
        Text(ext, style = t(9, 600, mono = true, color = fg))
    }
}

/* ---------- 1 · Form data kurang ---------- */

@Composable
fun FormCard(busy: Boolean, onSubmit: (activity: String, courses: String) -> Unit) {
    var activity by remember { mutableStateOf("") }
    var courses by remember { mutableStateOf("") }
    val valid = activity.isNotBlank() && courses.isNotBlank()
    CardShell("surat", "Lengkapi data kegiatan", right = { Text("2 field", style = t(12, 600, color = C.mutedFg)) }) {
        Body {
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(C.muted).padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(Lucide.CircleCheck, null, tint = C.ok, modifier = Modifier.size(14.dp))
                Text("Nama, NIM, prodi sudah terisi dari profil", style = t(12, color = C.mutedFg))
            }
            Field("Nama kegiatan", activity, { activity = it }, "Contoh: Gemastik 2026")
            Field("Mata kuliah yang terlewat", courses, { courses = it }, "Contoh: Struktur Data, Sistem Digital", helper = "Pisahkan dengan koma. Dosen pengampu aku isi otomatis.")
        }
        Footer { PrimaryButton(if (busy) "Mengirim…" else "Kirim", { onSubmit(activity.trim(), courses.trim()) }, Modifier.fillMaxWidth(), enabled = valid && !busy) }
    }
}

/* ---------- 2 · Upload lampiran ---------- */

@Composable
fun UploadCard(picked: Picked?, error: String?, busy: Boolean, onPick: () -> Unit, onUpload: () -> Unit) {
    CardShell("surat", "Bukti kegiatan", right = { if (picked == null) StatusBadge("needs_info") else Text("PDF, JPG, PNG · 5 MB", style = t(12, color = C.mutedFg)) }) {
        Column(pad, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (picked != null) {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(C.bg).border(1.dp, C.border, RoundedCornerShape(12.dp)).padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    FileTile(picked.name)
                    Column(Modifier.weight(1f)) {
                        Text(picked.name, style = t(14, 600), maxLines = 1)
                        Text("${picked.sizeLabel} · siap di-upload", style = t(12, color = C.mutedFg))
                    }
                }
            } else {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(C.bg).border(1.5.dp, C.dash, RoundedCornerShape(12.dp)).clickable(onClick = onPick).padding(vertical = 22.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Box(Modifier.size(40.dp).clip(RoundedCornerShape(11.dp)).background(C.card).border(1.dp, C.border, RoundedCornerShape(11.dp)), contentAlignment = Alignment.Center) {
                        Icon(Lucide.Upload, null, Modifier.size(20.dp))
                    }
                    Text("Pilih file atau ambil foto", style = t(15, 600))
                    Text("PDF, JPG, PNG · maks 5 MB", style = t(12, color = C.mutedFg))
                }
            }
            error?.let { ErrorLine(it) }
        }
        Footer {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (picked != null) OutlineButton("Ganti file", onPick, Modifier.weight(1f))
                PrimaryButton(if (busy) "Mengupload…" else "Upload", onUpload, Modifier.weight(1f), icon = Lucide.Upload, enabled = picked != null && !busy)
            }
        }
    }
}

/* ---------- 3 · Cek syarat ---------- */

@Composable
fun ChecksCard(d: JsonObject) {
    val checks = d.list("checks")
    val failed = checks.count { !it.b("ok") }
    CardShell("surat", "Hasil cek syarat", right = {
        Text(if (failed > 0) "$failed belum terpenuhi" else "${checks.size} dari ${checks.size}", style = t(12, 600, color = if (failed > 0) C.destructive else C.ok))
    }) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 6.dp)) {
            checks.forEachIndexed { i, c ->
                if (i > 0) Box(Modifier.fillMaxWidth().height(1.dp).background(C.border))
                Row(Modifier.padding(vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    val ok = c.b("ok")
                    Box(Modifier.size(20.dp).clip(CircleShape).background(if (ok) C.okBg else C.destructiveSoft), contentAlignment = Alignment.Center) {
                        Icon(if (ok) Lucide.Check else Lucide.X, null, tint = if (ok) C.ok else C.destructive, modifier = Modifier.size(12.dp))
                    }
                    Column {
                        Text(c.s("label"), style = t(14, 600))
                        Text(c.s("note"), style = t(12, line = 17, color = if (ok) C.mutedFg else C.destructive))
                    }
                }
            }
        }
        d.obj("footer")?.let {
            Box(Modifier.fillMaxWidth().height(1.dp).background(C.border))
            Text(it.s("note"), style = t(13, line = 18, color = C.soft), modifier = Modifier.fillMaxWidth().background(C.bg).padding(horizontal = 14.dp, vertical = 12.dp))
        }
    }
}

/* ---------- 4 · Preview draft ---------- */

@Composable
fun DraftCard(d: JsonObject, onOpen: (String) -> Unit) {
    CardShell("surat", "Draft surat") {
        Row(pad, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            // miniatur kertas surat
            Column(
                Modifier.size(92.dp, 128.dp).clip(RoundedCornerShape(4.dp)).background(Color.White).border(1.dp, C.border, RoundedCornerShape(4.dp)).padding(horizontal = 9.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Box(Modifier.fillMaxWidth().height(3.dp).background(C.dash))
                Box(Modifier.fillMaxWidth(0.6f).height(3.dp).background(C.fg).align(Alignment.CenterHorizontally))
                listOf(1f, 1f, 0.8f, 1f, 1f, 0.65f).forEach { Box(Modifier.fillMaxWidth(it).height(2.dp).background(C.input)) }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(d.s("title"), style = t(15, 700, 20))
                Text(d.s("meta"), style = t(13, line = 18, color = C.mutedFg))
                Text("Draft · 1 halaman", style = t(12, mono = true, color = C.mutedFg))
                StatusBadge("pending_approval")
            }
        }
        Footer { OutlineButton("Lihat surat", { onOpen(d.s("request_id")) }, Modifier.fillMaxWidth(), icon = Lucide.Eye) }
    }
}

/* ---------- 5 · Jawaban helpdesk ---------- */

@Composable
fun AnswerCard(d: JsonObject, ticketed: Boolean, busy: Boolean, onTicket: () -> Unit) {
    CardShell("helpdesk", "Jawaban") {
        Column(pad, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(d.s("headline"), style = t(22, 700, 28))
            Text(d.s("explanation"), style = t(14, line = 21, color = C.soft))
        }
        Row(
            Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp).fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(C.bg).border(1.dp, C.border, RoundedCornerShape(10.dp)).padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Icon(Lucide.Quote, null, tint = WORKER.getValue("helpdesk").first, modifier = Modifier.size(16.dp))
            Column {
                Text(d.s("source_title"), style = t(13, 600))
                Text(d.s("source_section"), style = t(12, color = C.mutedFg))
            }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(C.border))
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), horizontalArrangement = Arrangement.End) {
            OutlineButton(if (ticketed) "Tiket dibuat" else "Masih bingung? Buat tiket", onTicket, enabled = !ticketed && !busy, height = 40.dp)
        }
    }
}

/* ---------- 6 · Tiket ---------- */

@Composable
fun TicketCard(d: JsonObject, onHistory: () -> Unit) {
    CardShell("helpdesk", "Tiket dibuat", icon = Lucide.Ticket, right = { StatusBadge("submitted") }) {
        Body {
            Text(d.s("ticket_id"), style = t(18, 600, mono = true))
            KeyValue(listOf("Kategori" to { KeyText(d.s("category")) }, "Unit tujuan" to { KeyText(d.s("unit")) }, "Perkiraan" to { KeyText(d.s("eta")) }))
        }
        Footer { OutlineButton("Lihat di riwayat", onHistory, Modifier.fillMaxWidth(), icon = Lucide.History) }
    }
}

/* ---------- 7 · Pilihan ruangan ---------- */

@Composable
fun RoomsCard(d: JsonObject, busy: Boolean, onPick: (String) -> Unit) {
    val options = d.list("options")
    var sel by remember { mutableStateOf(options.firstOrNull()?.s("code") ?: "") }
    CardShell("fasilitas", "Pilih ruangan", right = { Text(d.s("date_label"), style = t(12, color = C.mutedFg)) }) {
        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { r ->
                val on = r.s("code") == sel
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                        .background(if (on) C.accent else C.card)
                        .border(if (on) 2.dp else 1.dp, if (on) C.primary else C.border, RoundedCornerShape(12.dp))
                        .clickable(role = Role.RadioButton) { sel = r.s("code") }
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(Modifier.size(20.dp).clip(CircleShape).border(if (on) 2.dp else 1.5.dp, if (on) C.primary else C.dash, CircleShape), contentAlignment = Alignment.Center) {
                        if (on) Box(Modifier.size(10.dp).clip(CircleShape).background(C.primary))
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row {
                            Text(r.s("code"), style = t(15, 600, mono = true), modifier = Modifier.weight(1f))
                            Text(r.s("time"), style = t(13, 600, color = if (r.b("shifted")) C.warn else C.fg))
                        }
                        Text("${r.s("cap")} · ${r.s("fac")}", style = t(12, line = 17, color = C.mutedFg))
                    }
                }
            }
        }
        Footer { PrimaryButton("Pilih $sel", { onPick(sel) }, Modifier.fillMaxWidth(), enabled = sel.isNotEmpty() && !busy) }
    }
}

/* ---------- 8 · Booking ditahan ---------- */

@Composable
fun HeldCard(d: JsonObject, busy: Boolean, onCancel: () -> Unit) {
    CardShell("fasilitas", "Booking ditahan", icon = Lucide.CalendarClock) {
        Row(pad, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Column(Modifier.width(64.dp).clip(RoundedCornerShape(10.dp)).border(1.dp, C.border, RoundedCornerShape(10.dp)), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(d.s("dn"), style = t(11, 700, color = Color.White), modifier = Modifier.fillMaxWidth().background(Color(0xFFB4541A)).padding(vertical = 3.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                Text(d.s("dd"), style = t(24, 700, 28))
                Text(d.s("mm"), style = t(11, color = C.mutedFg), modifier = Modifier.padding(bottom = 5.dp))
            }
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(d.s("code"), style = t(18, 600, mono = true))
                Text(d.s("time"), style = t(14, 500))
                Text("${d.s("purpose")} · ${d.i("people")} orang", style = t(12, color = C.mutedFg))
            }
        }
        Row(
            Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp).fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(C.violetBg).padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Icon(Lucide.Hourglass, null, tint = C.hold, modifier = Modifier.size(16.dp))
            Text("Ditahan 24 jam, menunggu konfirmasi. Lepas otomatis ${d.s("until")} kalau belum dikonfirmasi.", style = t(13, line = 18, color = C.hold))
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(C.border))
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.End) {
            GhostButton("Batalkan booking", onCancel, color = C.destructive, enabled = !busy)
        }
    }
}

/* ---------- 9 · Laporan kerusakan ---------- */

fun categoryIcon(c: String) = when (c) {
    "Listrik" -> Lucide.Zap
    "AC" -> Lucide.Snowflake
    "Proyektor" -> Lucide.Projector
    "Jaringan" -> Lucide.Wifi
    "Kebersihan" -> Lucide.SprayCan
    else -> Lucide.CircleEllipsis
}

@Composable
fun ReportCard(d: JsonObject, photos: Int, error: String?, busy: Boolean, onPhoto: () -> Unit) {
    CardShell("fasilitas", "Laporan kerusakan", icon = Lucide.Wrench, right = { Text(d.s("report_id"), style = t(12, mono = true, color = C.mutedFg)) }) {
        KeyValue(
            listOf(
                "Ruang" to { KeyText(d.s("room"), mono = true) },
                "Kategori" to {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(categoryIcon(d.s("category")), null, Modifier.size(14.dp))
                        KeyText(d.s("category"))
                    }
                },
                "Urgensi" to { UrgencyBadge(d.s("urgency")) },
                "Teknisi" to {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(Modifier.size(22.dp).clip(CircleShape).background(C.muted).border(1.dp, C.border, CircleShape), contentAlignment = Alignment.Center) {
                            Text(d.s("initials"), style = t(10, 700))
                        }
                        KeyText(d.s("tech"))
                    }
                },
            ),
            pad,
        )
        if (d.i("reporters") > 1) {
            Text(
                "${d.i("reporters")} orang melaporkan hal yang sama. " + if (d.b("merged")) "Laporanmu aku gabungkan." else "Laporan sudah digabung.",
                style = t(13, 600, 18),
                modifier = Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp).fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(C.muted).padding(horizontal = 12.dp, vertical = 10.dp),
            )
        }
        Footer {
            OutlineButton(if (busy) "Mengupload…" else if (photos > 0) "$photos foto ditambahkan" else "Tambah foto", onPhoto, Modifier.fillMaxWidth(), icon = Lucide.Camera, enabled = !busy)
            error?.let { Box(Modifier.padding(top = 8.dp)) { ErrorLine(it) } }
        }
    }
}

/* ---------- 10 · Surat selesai ---------- */

@Composable
fun DoneCard(d: JsonObject, onOpen: (String) -> Unit) {
    CardShell("surat", "Surat selesai", icon = Lucide.FileCheck2, right = { StatusBadge("approved") }) {
        Column(pad, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Nomor surat", style = t(12, color = C.mutedFg))
            Text(d.s("letter_no"), style = t(18, 600, mono = true))
            Text("${d.s("title")} · disetujui ${d.s("approved_by")}, ${d.s("approved_at")}", style = t(13, color = C.mutedFg), modifier = Modifier.padding(top = 6.dp))
        }
        Footer { PrimaryButton("Unduh PDF", { onOpen(d.s("request_id")) }, Modifier.fillMaxWidth(), icon = Lucide.Download) }
    }
}
