package me.codewithus.layan.ui

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import me.codewithus.layan.data.AgentEvent
import me.codewithus.layan.data.Api
import me.codewithus.layan.data.ApiException
import me.codewithus.layan.data.ChatMessage
import me.codewithus.layan.data.Me
import java.io.IOException

private const val MAX_UPLOAD = 5 * 1024 * 1024

class ChatVM(private val api: Api) : ViewModel() {
    var messages by mutableStateOf<List<ChatMessage>?>(null)
    var status by mutableStateOf<AgentEvent.Status?>(null)
    var busy by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    /** File terpilih per card upload/laporan, belum dikirim. */
    val picked = mutableStateMapOf<Long, Picked>()
    val cardError = mutableStateMapOf<Long, String>()
    val photos = mutableStateMapOf<Long, Int>()

    init {
        refresh()
    }

    fun refresh() = viewModelScope.launch {
        if (busy) return@launch
        runCatching { api.chat() }
            .onSuccess { messages = it }
            .onFailure { if (messages == null) { messages = emptyList(); error = friendly(it) } }
    }

    private fun run(flow: Flow<AgentEvent>) = viewModelScope.launch {
        busy = true
        error = null
        try {
            flow.collect { e ->
                when (e) {
                    is AgentEvent.Status -> status = e
                    AgentEvent.Idle -> status = null
                    is AgentEvent.Message -> if (messages?.none { it.id == e.message.id } != false) messages = (messages ?: emptyList()) + e.message
                    is AgentEvent.Update -> messages = messages?.map { m -> if (m.id == e.id && m.card != null) m.copy(card = m.card.copy(state = e.state)) else m }
                    is AgentEvent.Failed -> error = e.message
                }
            }
        } catch (t: Throwable) {
            error = friendly(t)
        } finally {
            busy = false
            status = null
        }
    }

    fun send(text: String) = run(api.send(text))

    fun act(id: Long, action: String, payload: kotlinx.serialization.json.JsonObject = buildJsonObject {}) = run(api.action(id, action, payload))

    /** Upload file untuk card upload (action "upload") atau laporan (action "photo"). */
    fun upload(messageId: Long, reportId: String? = null) = viewModelScope.launch {
        val f = picked[messageId] ?: return@launch
        busy = true
        cardError.remove(messageId)
        val id = try {
            api.upload(f.name, f.mime, f.bytes)
        } catch (t: Throwable) {
            cardError[messageId] = friendly(t)
            busy = false
            return@launch
        }
        busy = false
        picked.remove(messageId)
        if (reportId != null) {
            photos[messageId] = (photos[messageId] ?: 0) + 1
            act(messageId, "photo", buildJsonObject { put("report_id", reportId); put("attachment_id", id) })
        } else {
            act(messageId, "upload", buildJsonObject { put("attachment_id", id) })
        }
    }

    private fun friendly(t: Throwable) = when (t) {
        is ApiException -> t.message ?: "Terjadi kesalahan."
        is IOException -> "Koneksi terputus. Progres kamu aman, coba lagi."
        else -> "Terjadi kesalahan. Coba lagi."
    }
}

/** Baca file pilihan user: nama, tipe, isi. Null + pesan kalau tidak valid. */
private fun readPicked(ctx: Context, uri: Uri, imagesOnly: Boolean): Pair<Picked?, String?> {
    val cr = ctx.contentResolver
    val mime = cr.getType(uri) ?: ""
    val allowed = if (imagesOnly) listOf("image/jpeg", "image/png") else listOf("application/pdf", "image/jpeg", "image/png")
    if (mime !in allowed) return null to if (imagesOnly) "Foto harus JPG atau PNG." else "Format belum didukung. Pakai PDF, JPG, atau PNG."
    val name = cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(0) else null } ?: "lampiran"
    val bytes = cr.openInputStream(uri)?.use { it.readBytes() } ?: return null to "File tidak bisa dibaca."
    if (bytes.size > MAX_UPLOAD) return null to "File lebih dari 5 MB. Kecilkan dulu atau foto ulang."
    return Picked(name, mime, bytes) to null
}

@Composable
private fun rememberOnline(): Boolean {
    val ctx = LocalContext.current
    val cm = remember { ctx.getSystemService(ConnectivityManager::class.java) }
    var online by remember { mutableStateOf(cm.activeNetwork != null) }
    DisposableEffect(cm) {
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { online = true }
            override fun onLost(network: Network) { online = cm.activeNetwork != null && cm.activeNetwork != network }
        }
        cm.registerDefaultNetworkCallback(cb)
        onDispose { cm.unregisterNetworkCallback(cb) }
    }
    return online
}

private data class Shortcut(val worker: String, val title: String, val sub: String, val prompt: String)

private val SHORTCUTS = listOf(
    Shortcut("surat", "Minta surat", "Aktif kuliah, dispensasi", "Kak, aku mau minta surat izin lomba tanggal 10–12 Oktober"),
    Shortcut("helpdesk", "Tanya aturan akademik", "SKS, cuti, nilai. Lengkap dengan sumber", "Batas maksimal SKS kalau IP semester lalu 3,2 berapa?"),
    Shortcut("fasilitas", "Lapor kerusakan / booking ruangan", "Cek bentrok, langsung ke teknisi", "Mau booking ruang rapat Jumat 13.00–15.00, 20 orang"),
)

@Composable
fun ChatScreen(api: Api, me: Me, onHistory: () -> Unit, onLetter: (String) -> Unit, onLogout: () -> Unit) {
    val vm: ChatVM = viewModel { ChatVM(api) }
    val ctx = LocalContext.current
    val online = rememberOnline()
    var text by remember { mutableStateOf("") }
    val list = rememberLazyListState()
    val messages = vm.messages

    // Keputusan staf dan laporan selesai masuk sebagai pesan baru: cek tiap 5 detik selama layar aktif.
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while (true) {
                delay(5000)
                vm.refresh()
            }
        }
    }
    LaunchedEffect(messages?.size, vm.status) {
        val n = (messages?.size ?: 0) + (if (vm.status != null) 1 else 0)
        if (n > 0) list.animateScrollToItem(n - 1)
    }

    // Pemilih file: target = (message id, hanya gambar?)
    var target by remember { mutableStateOf<Pair<Long, Boolean>?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        val (id, imagesOnly) = target ?: return@rememberLauncherForActivityResult
        if (uri == null) return@rememberLauncherForActivityResult
        val (file, err) = readPicked(ctx, uri, imagesOnly)
        if (file != null) {
            vm.picked[id] = file
            vm.cardError.remove(id)
            if (imagesOnly) vm.upload(id, messages?.firstOrNull { it.id == id }?.card?.data?.s("report_id"))
        } else if (err != null) {
            vm.cardError[id] = err
        }
    }
    fun pick(id: Long, imagesOnly: Boolean) {
        target = id to imagesOnly
        picker.launch(if (imagesOnly) "image/*" else "*/*")
    }

    val uploadCard = messages?.lastOrNull { it.card?.kind == "upload" && it.card.state == "active" }
    val empty = messages?.isEmpty() == true

    Column(Modifier.fillMaxSize().background(C.bg).statusBarsPadding().navigationBarsPadding().imePadding()) {
        // header
        Row(Modifier.fillMaxWidth().height(56.dp).padding(start = 16.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Mark()
            Text("LAYAN", style = t(17, 800), modifier = Modifier.weight(1f))
            AccountPill(me, onLogout)
            IconButton(onHistory, Modifier.size(44.dp)) { Icon(Lucide.History, "Riwayat permintaan", Modifier.size(21.dp)) }
        }
        if (!empty) Box(Modifier.fillMaxWidth().height(1.dp).background(C.border))
        if (!online) {
            Row(Modifier.fillMaxWidth().background(C.destructiveSoft).padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Lucide.WifiOff, null, tint = Color(0xFF8C1D17), modifier = Modifier.size(16.dp))
                Text("Koneksi terputus. Progres kamu aman. Aku sambungkan ulang otomatis.", style = t(13, line = 18, color = Color(0xFF8C1D17)))
            }
        }

        Box(Modifier.weight(1f).fillMaxWidth()) {
            when {
                messages == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).size(28.dp), color = C.primary, strokeWidth = 2.dp)
                empty -> EmptyState(me) { if (online && !vm.busy) vm.send(it) }
                else -> LazyColumn(state = list, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize()) {
                    items(messages, key = { it.id }) { m ->
                        Message(m, vm, onPick = ::pick, onHistory = onHistory, onLetter = onLetter)
                    }
                    vm.status?.let { s -> item(key = "typing") { Typing(s) } }
                }
            }
        }

        vm.error?.let {
            Row(Modifier.fillMaxWidth().background(C.destructiveSoft.copy(alpha = 0.6f)).padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Lucide.CircleAlert, null, tint = C.destructive, modifier = Modifier.size(16.dp))
                Text(it, style = t(13, line = 18, color = C.destructive), modifier = Modifier.weight(1f))
                Text("Tutup", style = t(13, 600, color = C.destructive), modifier = Modifier.clickable { vm.error = null })
            }
        }

        // input bar
        Box(Modifier.fillMaxWidth().height(1.dp).background(C.border))
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val canAttach = uploadCard != null && online
            Box(
                Modifier.size(44.dp).clip(CircleShape).background(C.card).border(1.dp, C.input, CircleShape)
                    .clickable(enabled = canAttach) { uploadCard?.let { pick(it.id, false) } },
                contentAlignment = Alignment.Center,
            ) { Icon(Lucide.Paperclip, "Lampirkan file", Modifier.size(20.dp), tint = if (canAttach) C.fg else C.icon) }
            val send = { if (text.isNotBlank() && online && !vm.busy) { vm.send(text.trim()); text = "" } }
            BasicTextField(
                text, { if (it.length <= 2000) text = it },
                enabled = online,
                textStyle = t(15, color = C.fg),
                cursorBrush = SolidColor(C.primary),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { send() }),
                modifier = Modifier.weight(1f),
                decorationBox = { inner ->
                    Box(
                        Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(22.dp)).background(if (online) C.card else C.muted).border(1.dp, C.input, RoundedCornerShape(22.dp)).padding(horizontal = 16.dp, vertical = 11.dp),
                    ) {
                        if (text.isEmpty()) Text(if (!online) "Menunggu koneksi…" else if (empty) "Tulis permintaanmu…" else "Tulis pesan…", style = t(15, color = C.subtle))
                        inner()
                    }
                },
            )
            val ready = text.isNotBlank() && online && !vm.busy
            Box(
                Modifier.size(44.dp).clip(CircleShape).background(if (ready) C.primary else C.border).clickable(enabled = ready) { send() },
                contentAlignment = Alignment.Center,
            ) { Icon(Lucide.ArrowUp, "Kirim", Modifier.size(20.dp), tint = if (ready) Color.White else C.icon) }
        }
    }
}

@Composable
private fun AccountPill(me: Me, onLogout: () -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        Row(
            Modifier.height(32.dp).clip(CircleShape).background(C.card).border(1.dp, C.input, CircleShape).clickable { open = true }.padding(start = 12.dp, end = 10.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(me.name.substringBefore(' '), style = t(13, 600))
            Icon(Lucide.ChevronDown, null, Modifier.size(14.dp), tint = C.mutedFg)
        }
        DropdownMenu(open, { open = false }) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text(me.name, style = t(13, 600))
                Text(me.nim ?: me.email, style = t(12, color = C.mutedFg))
            }
            DropdownMenuItem(text = { Text("Keluar", style = t(14)) }, leadingIcon = { Icon(Lucide.LogOut, null, Modifier.size(16.dp)) }, onClick = { open = false; onLogout() })
        }
    }
}

@Composable
private fun EmptyState(me: Me, onPick: (String) -> Unit) {
    Column(Modifier.fillMaxSize().padding(start = 20.dp, end = 20.dp, top = 40.dp, bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(28.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            AgentAvatar(44.dp)
            Text("Halo, ${me.name.substringBefore(' ')}", style = t(30, 700, 36), modifier = Modifier.padding(top = 8.dp))
            Text("Mau urus apa hari ini? Ceritakan saja, aku kerjakan sampai selesai.", style = t(16, line = 24, color = C.mutedFg))
        }
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SHORTCUTS.forEach { s ->
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 68.dp).clip(RoundedCornerShape(14.dp)).background(C.card).border(1.dp, C.border, RoundedCornerShape(14.dp)).clickable { onPick(s.prompt) }.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    WorkerTile(s.worker, 40.dp)
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(s.title, style = t(15, 600))
                        Text(s.sub, style = t(13, color = C.mutedFg))
                    }
                    Icon(Lucide.ChevronRight, null, Modifier.size(18.dp), tint = C.icon)
                }
            }
        }
        Spacer(Modifier.weight(1f))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Icon(Lucide.ShieldCheck, null, Modifier.size(14.dp), tint = C.mutedFg)
            Spacer(Modifier.width(8.dp))
            Text("Setiap langkah tercatat. Keputusan akhir tetap di staf.", style = t(12, color = C.mutedFg))
        }
    }
}

@Composable
private fun AgentRow(content: @Composable () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        AgentAvatar()
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) { content() }
    }
}

@Composable
private fun AgentBubble(text: String) {
    Text(
        text, style = t(15, line = 22),
        modifier = Modifier.clip(RoundedCornerShape(6.dp, 18.dp, 18.dp, 18.dp)).background(C.card).border(1.dp, C.border, RoundedCornerShape(6.dp, 18.dp, 18.dp, 18.dp)).padding(horizontal = 14.dp, vertical = 10.dp),
    )
}

@Composable
private fun Typing(s: AgentEvent.Status) {
    AgentRow {
        Column(
            Modifier.clip(RoundedCornerShape(6.dp, 18.dp, 18.dp, 18.dp)).background(C.card).border(1.dp, C.border, RoundedCornerShape(6.dp, 18.dp, 18.dp, 18.dp)).padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                TypingDots()
                Text(s.label, style = if (s.steps != null) t(13, 600) else t(12, color = C.mutedFg))
            }
            s.steps?.let { steps ->
                Box(Modifier.width(220.dp).height(1.dp).background(C.border))
                val cur = s.step ?: 0
                steps.forEachIndexed { i, label ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        when {
                            i < cur -> Icon(Lucide.CircleCheck, null, tint = C.ok, modifier = Modifier.size(14.dp))
                            i == cur -> CircularProgressIndicator(Modifier.size(14.dp), color = C.primary, strokeWidth = 2.dp)
                            else -> Box(Modifier.size(14.dp).border(1.5.dp, C.icon, CircleShape))
                        }
                        Text(label, style = t(12, if (i == cur) 500 else 400, color = if (i > cur) C.subtle else if (i < cur) C.mutedFg else C.fg))
                    }
                }
            }
        }
    }
}

@Composable
private fun Message(m: ChatMessage, vm: ChatVM, onPick: (Long, Boolean) -> Unit, onHistory: () -> Unit, onLetter: (String) -> Unit) {
    if (m.sender == "user") {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
            val shape = RoundedCornerShape(18.dp, 18.dp, 6.dp, 18.dp)
            val file = m.file
            if (file != null) {
                Row(Modifier.width(250.dp).clip(shape).background(C.primary).padding(8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FileTile(file.name, onPrimary = true)
                    Column(Modifier.weight(1f)) {
                        Text(file.name, style = t(14, 600, color = Color.White), maxLines = 1)
                        Text(if (file.size >= 1048576) "%.1f MB".format(file.size / 1048576f) else "${file.size / 1024} KB", style = t(12, color = Color.White.copy(alpha = 0.85f)))
                    }
                }
            } else {
                Text(m.text ?: "", style = t(15, line = 22, color = Color.White), modifier = Modifier.widthIn(max = 290.dp).clip(shape).background(C.primary).padding(horizontal = 14.dp, vertical = 10.dp))
            }
        }
        return
    }
    AgentRow {
        m.text?.takeIf { it.isNotBlank() }?.let { AgentBubble(it) }
        val c = m.card ?: return@AgentRow
        val d = c.data
        val active = c.state == "active"
        val skipped = c.state == "skipped"
        val note = if (skipped) "Dilewati" else "Terkirim"
        val tone = if (skipped) "muted" else "ok"
        when (c.kind) {
            "form" -> if (active) FormCard(vm.busy) { a, co -> vm.act(m.id, "submit", buildJsonObject { put("activity", a); put("courses", co) }) }
            else CollapsedCard("surat", "Data kegiatan", note, tone)
            "upload" -> if (active) UploadCard(vm.picked[m.id], vm.cardError[m.id], vm.busy, onPick = { onPick(m.id, false) }, onUpload = { vm.upload(m.id) })
            else CollapsedCard("surat", "Bukti kegiatan", note, tone)
            "checks" -> ChecksCard(d)
            "draft" -> DraftCard(d, onLetter)
            "answer" -> AnswerCard(d, ticketed = !active, busy = vm.busy) { vm.act(m.id, "ticket") }
            "ticket" -> TicketCard(d, onHistory)
            "done" -> DoneCard(d, onLetter)
            "rooms" -> if (active) RoomsCard(d, vm.busy) { code -> vm.act(m.id, "pick", buildJsonObject { put("code", code) }) }
            else CollapsedCard("fasilitas", "Pilihan ruang", note, tone)
            "held" -> if (c.state == "cancelled") CollapsedCard("fasilitas", "Booking ${d.s("code")}", "Dibatalkan", "muted", Lucide.CalendarClock)
            else HeldCard(d, vm.busy) { vm.act(m.id, "cancel_booking", buildJsonObject { put("request_id", d.s("request_id")) }) }
            "report" -> ReportCard(d, vm.photos[m.id] ?: 0, vm.cardError[m.id], vm.busy) { onPick(m.id, true) }
        }
    }
}
