package me.codewithus.layan.ui

import android.content.Context
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import me.codewithus.layan.data.Api
import me.codewithus.layan.data.ApiException
import me.codewithus.layan.data.Detail
import me.codewithus.layan.data.HistoryItem
import me.codewithus.layan.data.Me
import java.io.IOException

private fun friendly(t: Throwable) = when (t) {
    is ApiException -> t.message ?: "Terjadi kesalahan."
    is IOException -> "Server tidak bisa dihubungi. Cek koneksi internet."
    else -> "Terjadi kesalahan. Coba lagi."
}

@Composable
private fun TopBar(title: String, onBack: () -> Unit, action: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().height(56.dp).padding(start = 4.dp, end = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onBack, Modifier.size(44.dp)) { Icon(Lucide.ArrowLeft, "Kembali", Modifier.size(22.dp)) }
        Text(title, style = t(17, 700), modifier = Modifier.weight(1f))
        action?.invoke()
    }
}

@Composable
private fun Loading() = Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
    CircularProgressIndicator(Modifier.size(28.dp), color = C.primary, strokeWidth = 2.dp)
}

@Composable
private fun ErrorBox(text: String) = Box(Modifier.padding(16.dp).fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(C.destructiveSoft).padding(12.dp)) { ErrorLine(text) }

/* ---------- login ---------- */

@Composable
fun LoginScreen(api: Api, onDone: (Me) -> Unit) {
    var id by remember { mutableStateOf("") }
    var pw by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Column(
        Modifier.fillMaxSize().background(C.bg).statusBarsPadding().navigationBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 40.dp),
        verticalArrangement = Arrangement.spacedBy(28.dp),
    ) {
        Spacer(Modifier.height(40.dp))
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Wordmark()
            Text("Masuk", style = t(30, 700, 36), modifier = Modifier.padding(top = 16.dp))
            Text("Pakai NIM dan password kampus kamu.", style = t(15, line = 22, color = C.mutedFg))
        }
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Field("NIM atau email", id, { id = it; error = null }, keyboard = androidx.compose.ui.text.input.KeyboardType.Email)
            Field("Password", pw, { pw = it; error = null }, password = true, error = error)
            PrimaryButton(
                if (busy) "Memeriksa…" else "Masuk",
                {
                    busy = true
                    scope.launch {
                        runCatching { api.login(id.trim(), pw) }
                            .onSuccess(onDone)
                            .onFailure { error = friendly(it) }
                        busy = false
                    }
                },
                Modifier.fillMaxWidth().padding(top = 8.dp),
                enabled = id.isNotBlank() && pw.isNotEmpty() && !busy,
                height = 48.dp,
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Lucide.ShieldCheck, null, Modifier.size(14.dp), tint = C.mutedFg)
            Text("Setiap langkah tercatat. Keputusan akhir tetap di staf.", style = t(12, color = C.mutedFg))
        }
    }
}

/** Akun staf/teknisi: app ini untuk mahasiswa, arahkan ke web. */
@Composable
fun NotStudentScreen(me: Me, web: String, onLogout: () -> Unit) {
    val ctx = LocalContext.current
    Column(Modifier.fillMaxSize().background(C.bg).statusBarsPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        Wordmark()
        Text("Halo, ${me.name}", style = t(24, 700, 30))
        Text("App ini untuk mahasiswa. Staff Console dan Board Teknisi ada di web, bisa dipasang sebagai aplikasi dari browser.", style = t(15, line = 22, color = C.mutedFg))
        PrimaryButton("Buka $web", { ctx.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(web))) }, Modifier.fillMaxWidth(), icon = Lucide.ExternalLink)
        OutlineButton("Keluar", onLogout, Modifier.fillMaxWidth(), icon = Lucide.LogOut)
    }
}

/* ---------- riwayat ---------- */

@Composable
fun HistoryScreen(api: Api, onBack: () -> Unit, onOpen: (String) -> Unit) {
    var items by remember { mutableStateOf<List<HistoryItem>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var filter by remember { mutableStateOf("semua") }
    LaunchedEffect(Unit) { runCatching { api.requests() }.onSuccess { items = it }.onFailure { error = friendly(it) } }

    Column(Modifier.fillMaxSize().background(C.bg).statusBarsPadding().navigationBarsPadding()) {
        TopBar("Riwayat permintaan", onBack)
        val all = items
        val active = all?.filter { it.active }.orEmpty()
        val done = all?.filterNot { it.active }.orEmpty()
        Row(Modifier.padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("semua" to "Semua", "aktif" to "Aktif ${active.size}", "selesai" to "Selesai").forEach { (k, label) ->
                val on = filter == k
                Text(
                    label, style = t(13, 600, color = if (on) Color.White else C.fg),
                    modifier = Modifier.clip(CircleShape).background(if (on) C.ink else C.card).border(1.dp, if (on) C.ink else C.input, CircleShape).clickable { filter = k }.padding(horizontal = 14.dp, vertical = 9.dp),
                )
            }
        }
        when {
            error != null -> ErrorBox(error!!)
            all == null -> Loading()
            all.isEmpty() -> Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Belum ada permintaan", style = t(16, 700))
                Text("Minta surat atau tanya aturan akademik lewat chat. Semuanya tercatat di sini.", style = t(13, line = 19, color = C.mutedFg), textAlign = TextAlign.Center)
            }
            else -> Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Aktif" to active.takeIf { filter != "selesai" }, "Selesai" to done.takeIf { filter != "aktif" }).forEach { (label, group) ->
                    if (group.isNullOrEmpty()) return@forEach
                    Text(label, style = t(12, 600, color = C.mutedFg), modifier = Modifier.padding(start = 4.dp, top = 8.dp))
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(C.card).border(1.dp, C.border, RoundedCornerShape(14.dp))) {
                        group.forEachIndexed { i, it ->
                            if (i > 0) Box(Modifier.fillMaxWidth().height(1.dp).background(C.border))
                            Row(Modifier.fillMaxWidth().clickable { onOpen(it.id) }.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                WorkerTile(it.worker, 36.dp, if (it.kind == "laporan") Lucide.Wrench else workerIcon(it.worker))
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row {
                                        Text(it.title, style = t(15, 600, 20), modifier = Modifier.weight(1f))
                                        Text(it.time, style = t(12, color = C.mutedFg))
                                    }
                                    Text(it.meta, style = t(13, line = 18, color = C.mutedFg))
                                    StatusBadge(it.status)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private data class Step(val status: String, val label: String?, val note: String)

private fun stepsFor(kind: String): List<Step> = when (kind) {
    "tiket" -> listOf(Step("submitted", null, "Diteruskan ke unit terkait"), Step("done", "Dijawab", "Jawaban dikirim lewat chat"))
    "booking" -> listOf(
        Step("submitted", null, "Lewat chat LAYAN"), Step("needs_info", "Pilih ruang", "Agent cek bentrok dan kapasitas"),
        Step("pending_approval", null, "Ruang ditahan 24 jam, menunggu staf"), Step("approved", "Terkonfirmasi", "Ruang siap dipakai"),
    )
    "laporan" -> listOf(Step("submitted", "Diteruskan ke teknisi", "Laporan dobel digabung otomatis"), Step("processing", "Dikerjakan", "Teknisi sedang menangani"), Step("done", null, "Kamu dikabari lewat chat"))
    else -> listOf(
        Step("submitted", null, "Lewat chat LAYAN"), Step("needs_info", null, "Data kegiatan dan bukti kegiatan"), Step("processing", null, "Syarat dicek, draft surat dibuat"),
        Step("pending_approval", null, "Di staf Layanan Akademik"), Step("approved", null, "Nomor surat terbit"), Step("done", null, "PDF siap diunduh"),
    )
}

@Composable
fun DetailScreen(api: Api, id: String, onBack: () -> Unit, onLetter: (String) -> Unit, onChat: () -> Unit) {
    var d by remember { mutableStateOf<Detail?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(id) { runCatching { api.detail(id) }.onSuccess { d = it }.onFailure { error = friendly(it) } }

    Column(Modifier.fillMaxSize().background(C.bg).statusBarsPadding().navigationBarsPadding()) {
        TopBar("Detail permintaan", onBack)
        val x = d
        when {
            error != null -> ErrorBox(error!!)
            x == null -> Loading()
            else -> {
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(C.card).border(1.dp, C.border, RoundedCornerShape(14.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            WorkerTile(x.worker, 40.dp, if (x.kind == "laporan") Lucide.Wrench else workerIcon(x.worker))
                            Column {
                                Text(x.title, style = t(17, 700))
                                Text(x.id, style = t(12, mono = true, color = C.mutedFg))
                            }
                        }
                        StatusBadge(x.status)
                        Box(Modifier.fillMaxWidth().height(1.dp).background(C.border))
                        x.fields.forEach { (k, v) ->
                            Row {
                                Text(k, style = t(14, color = C.mutedFg), modifier = Modifier.width(104.dp))
                                Text(v, style = t(14, 500), modifier = Modifier.weight(1f))
                            }
                        }
                    }
                    Timeline(x)
                }
                Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlineButton(if (x.status == "approved") "Unduh surat" else "Lihat draft", { onLetter(x.id) }, Modifier.weight(1f), icon = Lucide.FileText, enabled = x.letter != null, height = 48.dp)
                    OutlineButton("Buka chat", onChat, Modifier.weight(1f), icon = Lucide.MessageCircle, height = 48.dp)
                }
            }
        }
    }
}

@Composable
private fun Timeline(d: Detail) {
    val steps = stepsFor(d.kind)
    val rejected = d.status == "rejected"
    val cur = if (rejected) steps.indexOfFirst { it.status == "approved" || it.status == "done" }.coerceAtLeast(0) else steps.indexOfFirst { it.status == d.status }
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(C.card).border(1.dp, C.border, RoundedCornerShape(14.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Status", style = t(14, 700))
        Column {
            steps.forEachIndexed { i, s ->
                val state = when {
                    i < cur || (i == cur && d.status == "done") -> "done"
                    i == cur -> "current"
                    else -> "todo"
                }
                val isReject = rejected && i == cur
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        val ring = when {
                            state == "done" -> C.primary
                            isReject -> C.destructive
                            state == "current" -> C.violetDot
                            else -> C.input
                        }
                        Box(Modifier.padding(top = 3.dp).size(14.dp).clip(CircleShape).background(if (state == "done") C.primary else C.card).border(2.dp, ring, CircleShape))
                        if (i < steps.lastIndex) Box(Modifier.padding(vertical = 2.dp).width(2.dp).height(38.dp).background(if (state == "done") C.primary else C.border))
                    }
                    Column(Modifier.weight(1f).padding(bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        val color = when {
                            isReject -> C.destructive
                            state == "current" -> C.violet
                            state == "todo" -> C.subtle
                            else -> C.fg
                        }
                        Text(if (isReject) "Ditolak" else s.label ?: STATUS_LABEL[s.status].orEmpty(), style = t(14, 600, color = color))
                        Text(if (isReject) d.reject_reason.orEmpty() else s.note, style = t(13, line = 18, color = C.mutedFg))
                    }
                    Text(d.steps[if (isReject) "rejected" else s.status] ?: "–", style = t(12, mono = true, color = C.mutedFg))
                }
            }
        }
    }
}

/* ---------- surat ---------- */

private fun esc(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

/** HTML surat A4 untuk dicetak/simpan PDF lewat dialog cetak Android. */
private fun letterHtml(d: Detail): String {
    val l = d.letter!!
    val sign = if (d.approved_by != null) "<div class='sig ok'>Disetujui digital · ${esc(d.approved_by)}</div>" else "<div class='sig'>TTD setelah approve</div>"
    return """<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 22mm 20mm; }
body { font-family: 'Times New Roman', serif; color: #16181A; font-size: 12pt; line-height: 1.6; }
.kop { display: flex; gap: 12px; align-items: center; border-bottom: 2px solid #16181A; padding-bottom: 10px; }
.logo { width: 44px; height: 44px; border: 1px dashed #8B8F95; font: 8px monospace; display: flex; align-items: center; justify-content: center; color: #6F737A; }
h1 { font-size: 13pt; text-align: center; text-decoration: underline; margin: 22px 0 2px; letter-spacing: .04em; }
.no { text-align: center; font-size: 10pt; color: #5C6066; margin-bottom: 18px; }
table { margin-left: 16px; } td { padding: 0 8px 0 0; }
.ttd { margin-top: 40px; margin-left: auto; width: 200px; }
.sig { border: 1px dashed #8561DE; color: #6A45C4; font: 600 9pt sans-serif; text-align: center; padding: 14px 4px; margin: 6px 0; }
.sig.ok { border: 1px solid #2E9B55; color: #18793C; }
</style></head><body>
<div class="kop"><div class="logo">LOGO</div><div><b>FAKULTAS (NAMA INSTANSI)</b><br><small>Alamat instansi · kop surat placeholder</small></div></div>
<h1>${esc(l.title)}</h1><div class="no">Nomor: ${esc(d.letter_no ?: "terbit setelah disetujui")}</div>
<p>${esc(l.body1)}</p>
<table><tr><td>Nama</td><td>: ${esc(d.student.name)}</td></tr><tr><td>NIM</td><td>: ${esc(d.student.nim ?: "-")}</td></tr><tr><td>Program studi</td><td>: ${esc(d.student.prodi ?: "-")}</td></tr></table>
<p style="text-align: justify">${esc(l.body2)}</p>
<div class="ttd">Kepala Layanan Akademik,$sign<b>(Nama pejabat)</b></div>
</body></html>"""
}

/** Cetak lewat WebView: user bisa pilih "Simpan sebagai PDF". WebView disimpan sampai cetak selesai. */
private var printing: WebView? = null

private fun print(ctx: Context, d: Detail) {
    val web = WebView(ctx)
    web.webViewClient = object : WebViewClient() {
        override fun onPageFinished(view: WebView, url: String?) {
            val pm = ctx.getSystemService(PrintManager::class.java)
            val name = "LAYAN-${d.letter_no ?: d.id}".replace('/', '-')
            pm.print(name, view.createPrintDocumentAdapter(name), PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build())
            printing = null
        }
    }
    web.loadDataWithBaseURL(null, letterHtml(d), "text/html", "utf-8", null)
    printing = web
}

@Composable
fun LetterScreen(api: Api, id: String, onBack: () -> Unit) {
    val ctx = LocalContext.current
    var d by remember { mutableStateOf<Detail?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(id) { runCatching { api.detail(id) }.onSuccess { d = it }.onFailure { error = friendly(it) } }

    Column(Modifier.fillMaxSize().background(C.muted).statusBarsPadding().navigationBarsPadding()) {
        TopBar(d?.letter_no ?: "Surat", onBack) {
            d?.takeIf { it.letter != null }?.let { x -> PrimaryButton("Simpan PDF", { print(ctx, x) }, icon = Lucide.Printer, height = 40.dp) }
        }
        val x = d
        when {
            error != null -> ErrorBox(error!!)
            x == null -> Loading()
            x.letter == null -> Text("Draft surat belum dibuat untuk permintaan ini.", style = t(14, color = C.mutedFg), modifier = Modifier.padding(24.dp))
            else -> Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
                val serif = t(13, line = 20).copy(fontFamily = FontFamily.Serif)
                Column(Modifier.fillMaxWidth().background(Color.White).padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(Modifier.size(34.dp).border(1.dp, C.icon, RoundedCornerShape(4.dp)), contentAlignment = Alignment.Center) { Text("LOGO", style = t(7, mono = true, color = C.subtle)) }
                        Column {
                            Text("FAKULTAS (NAMA INSTANSI)", style = serif.copy(fontSize = 12.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold))
                            Text("Alamat instansi · kop surat placeholder", style = serif.copy(fontSize = 10.sp, color = C.mutedFg))
                        }
                    }
                    Box(Modifier.fillMaxWidth().height(2.dp).background(C.ink))
                    Text(x.letter.title, style = serif.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, textAlign = TextAlign.Center), modifier = Modifier.fillMaxWidth())
                    Text("Nomor: ${x.letter_no ?: "terbit setelah disetujui"}", style = serif.copy(fontSize = 11.sp, color = C.mutedFg, textAlign = TextAlign.Center), modifier = Modifier.fillMaxWidth())
                    Text(x.letter.body1, style = serif)
                    listOf("Nama" to x.student.name, "NIM" to (x.student.nim ?: "-"), "Program studi" to (x.student.prodi ?: "-")).forEach { (k, v) ->
                        Row(Modifier.padding(start = 12.dp)) {
                            Text(k, style = serif, modifier = Modifier.width(110.dp))
                            Text(": $v", style = serif)
                        }
                    }
                    Text(x.letter.body2, style = serif.copy(textAlign = TextAlign.Justify))
                    Column(Modifier.align(Alignment.End).width(180.dp).padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Kepala Layanan Akademik,", style = serif)
                        val ok = x.approved_by != null
                        Text(
                            if (ok) "Disetujui digital · ${x.approved_by}" else "TTD setelah approve",
                            style = t(10, 600, color = if (ok) C.ok else C.violet), textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().border(1.dp, if (ok) Color(0xFF2E9B55) else C.violetDot, RoundedCornerShape(3.dp)).padding(vertical = 14.dp),
                        )
                        Text("(Nama pejabat)", style = serif.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold))
                    }
                }
            }
        }
    }
}
