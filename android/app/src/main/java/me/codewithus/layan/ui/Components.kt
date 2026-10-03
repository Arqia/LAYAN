package me.codewithus.layan.ui

import android.content.Context
import android.content.Intent
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.StartOffset
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.FileProvider
import kotlinx.coroutines.launch
import me.codewithus.layan.BuildConfig
import me.codewithus.layan.data.Api
import me.codewithus.layan.data.AppRelease
import java.io.File

/** Mark LAYAN: kotak primary berisi kotak putih kecil. */
@Composable
fun Mark(size: Dp = 26.dp) {
    Box(Modifier.size(size).clip(RoundedCornerShape(8.dp)).background(C.primary), contentAlignment = Alignment.Center) {
        Box(Modifier.size(size * 0.35f).clip(RoundedCornerShape(2.5.dp)).background(Color.White))
    }
}

@Composable
fun Wordmark() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Mark()
        Text("LAYAN", style = t(17, 800).copy(letterSpacing = androidx.compose.ui.unit.TextUnit(1f, androidx.compose.ui.unit.TextUnitType.Sp)))
    }
}

/** Avatar agent: kotak ink berisi titik hijau. */
@Composable
fun AgentAvatar(size: Dp = 28.dp) {
    val big = size > 32.dp
    Box(Modifier.size(size).clip(RoundedCornerShape(if (big) 13.dp else 8.dp)).background(C.ink), contentAlignment = Alignment.Center) {
        Box(Modifier.size(if (big) 14.dp else 9.dp).clip(RoundedCornerShape(if (big) 4.dp else 2.5.dp)).background(C.agentDot))
    }
}

@Composable
fun StatusBadge(status: String) {
    val (fg, bg, dot) = STATUS[status] ?: STATUS.getValue("submitted")
    Row(
        Modifier.clip(CircleShape).background(bg).padding(start = 8.dp, end = 10.dp, top = 3.dp, bottom = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(dot))
        Text(STATUS_LABEL[status] ?: status, style = t(12, 600, 18, color = fg))
    }
}

fun workerIcon(worker: String): ImageVector = when (worker) {
    "helpdesk" -> Lucide.BookOpen
    "fasilitas" -> Lucide.Building2
    else -> Lucide.FileText
}

/** Tile ikon worker. Ikon + aksen kecil, tidak pernah blok warna penuh. */
@Composable
fun WorkerTile(worker: String, size: Dp = 24.dp, icon: ImageVector = workerIcon(worker)) {
    val (fg, bg) = WORKER[worker] ?: WORKER.getValue("surat")
    val radius = when {
        size <= 24.dp -> 7.dp
        size <= 32.dp -> 9.dp
        else -> 11.dp
    }
    Box(Modifier.size(size).clip(RoundedCornerShape(radius)).background(bg), contentAlignment = Alignment.Center) {
        Icon(icon, null, tint = fg, modifier = Modifier.size(size * 0.55f))
    }
}

/** Urgensi pakai 3 bar + teks supaya tidak tertukar dengan warna status. */
@Composable
fun UrgencyBadge(urgency: String) {
    val (key, bars) = when (urgency) {
        "Tinggi" -> "rejected" to 3
        "Sedang" -> "needs_info" to 2
        else -> "submitted" to 1
    }
    val (fg, bg, _) = STATUS.getValue(key)
    Row(
        Modifier.clip(RoundedCornerShape(6.dp)).background(bg).padding(horizontal = 8.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(1.5.dp)) {
            listOf(5, 8, 11).forEachIndexed { i, h ->
                Box(Modifier.width(3.dp).height(h.dp).alpha(if (i < bars) 1f else 0.3f).clip(RoundedCornerShape(1.dp)).background(fg))
            }
        }
        Text(urgency, style = t(12, 700, color = fg))
    }
}

@Composable
fun TypingDots() {
    val anim = rememberInfiniteTransition(label = "typing")
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
        repeat(3) { i ->
            val a by anim.animateFloat(
                initialValue = 1f, targetValue = 0.3f,
                animationSpec = infiniteRepeatable(tween(600), RepeatMode.Reverse, StartOffset(i * 180)),
                label = "dot$i",
            )
            Box(Modifier.size(6.dp).graphicsLayer { alpha = a; translationY = (1 - a) * -4f }.clip(CircleShape).background(C.primary))
        }
    }
}

/* ---------- card ---------- */

@Composable
fun CardShell(
    worker: String,
    title: String,
    icon: ImageVector = workerIcon(worker),
    right: (@Composable () -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(C.card).border(1.dp, C.border, RoundedCornerShape(14.dp))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            WorkerTile(worker, 24.dp, icon)
            Text(title, style = t(14, 600), modifier = Modifier.weight(1f))
            right?.invoke()
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(C.border))
        content()
    }
}

/** Card yang sudah dijawab collapse jadi satu baris. */
@Composable
fun CollapsedCard(worker: String, title: String, note: String = "Terkirim", tone: String = "ok", icon: ImageVector = workerIcon(worker)) {
    val color = when (tone) {
        "ok" -> C.ok
        "warn" -> C.warn
        else -> C.mutedFg
    }
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(C.card).border(1.dp, C.border, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        WorkerTile(worker, 24.dp, icon)
        Text(title, style = t(14, 600), modifier = Modifier.weight(1f))
        if (tone == "ok") Icon(Lucide.Check, null, tint = color, modifier = Modifier.size(14.dp))
        Text(note, style = t(12, 600, color = color))
    }
}

@Composable
fun KeyValue(rows: List<Pair<String, @Composable () -> Unit>>, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        rows.forEach { (k, v) ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(k, style = t(14, color = C.mutedFg), modifier = Modifier.width(96.dp))
                Box(Modifier.weight(1f)) { v() }
            }
        }
    }
}

@Composable
fun KeyText(text: String, mono: Boolean = false) = Text(text, style = t(14, if (mono) 600 else 500, mono = mono))

/* ---------- tombol ---------- */

private val btnShape = RoundedCornerShape(10.dp)

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, icon: ImageVector? = null, enabled: Boolean = true, height: Dp = 44.dp, color: Color = C.primary) {
    Button(
        onClick, modifier.heightIn(min = height), enabled = enabled, shape = btnShape,
        colors = ButtonDefaults.buttonColors(containerColor = color, contentColor = Color.White, disabledContainerColor = color.copy(alpha = 0.4f), disabledContentColor = Color.White),
        contentPadding = PaddingValues(horizontal = 16.dp),
    ) { ButtonContent(text, icon) }
}

@Composable
fun OutlineButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, icon: ImageVector? = null, enabled: Boolean = true, height: Dp = 44.dp, color: Color = C.fg, border: Color = C.input) {
    OutlinedButton(
        onClick, modifier.heightIn(min = height), enabled = enabled, shape = btnShape, border = BorderStroke(1.dp, border),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = C.card, contentColor = color),
        contentPadding = PaddingValues(horizontal = 14.dp),
    ) { ButtonContent(text, icon) }
}

@Composable
fun GhostButton(text: String, onClick: () -> Unit, color: Color = C.fg, icon: ImageVector? = null, enabled: Boolean = true) {
    TextButton(onClick, enabled = enabled, shape = btnShape, colors = ButtonDefaults.textButtonColors(contentColor = color)) { ButtonContent(text, icon) }
}

@Composable
private fun RowScope.ButtonContent(text: String, icon: ImageVector?) {
    if (icon != null) {
        Icon(icon, null, Modifier.size(17.dp))
        Spacer(Modifier.width(8.dp))
    }
    Text(text, style = t(15, 600))
}

/* ---------- input ---------- */

@Composable
fun Field(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    placeholder: String = "",
    helper: String? = null,
    error: String? = null,
    keyboard: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
    enabled: Boolean = true,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = t(13, 600))
        OutlinedTextField(
            value, onChange, Modifier.fillMaxWidth(),
            enabled = enabled,
            singleLine = true,
            isError = error != null,
            textStyle = t(15),
            placeholder = { Text(placeholder, style = t(15, color = C.subtle)) },
            shape = RoundedCornerShape(10.dp),
            keyboardOptions = KeyboardOptions(keyboardType = if (password) KeyboardType.Password else keyboard),
            visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = C.primary, unfocusedBorderColor = C.input, errorBorderColor = C.destructive,
                focusedContainerColor = C.card, unfocusedContainerColor = C.card, disabledContainerColor = C.muted,
            ),
        )
        when {
            error != null -> ErrorLine(error)
            helper != null -> Text(helper, style = t(12, color = C.mutedFg))
        }
    }
}

@Composable
fun ErrorLine(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Icon(Lucide.CircleAlert, null, tint = C.destructive, modifier = Modifier.size(14.dp))
        Text(text, style = t(12, color = C.destructive))
    }
}

/* ---------- pembaruan app ---------- */

/** Dialog versi baru. Kalau versi terpasang di bawah minVersionCode, dialog wajib (tanpa "Nanti"). */
@Composable
fun UpdateDialog(api: Api, release: AppRelease, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val forced = BuildConfig.VERSION_CODE < release.minVersionCode
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        properties = DialogProperties(dismissOnBackPress = !forced, dismissOnClickOutside = !forced),
        containerColor = C.card,
        title = { Text("Versi ${release.versionName} tersedia", style = t(17, 600)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (forced) Text("Versi ini sudah tidak didukung. Perbarui untuk melanjutkan.", style = t(14, color = C.mutedFg))
                if (release.notes.isNotBlank()) Text(release.notes, style = t(14))
                error?.let { ErrorLine(it) }
            }
        },
        confirmButton = {
            PrimaryButton(if (busy) "Mengunduh…" else "Perbarui", enabled = !busy, icon = Lucide.Download, onClick = {
                busy = true
                error = null
                scope.launch {
                    val apk = File(context.cacheDir, "update/layan.apk")
                    runCatching { api.downloadApk(release, apk) }
                        .onSuccess { installApk(context, apk) }
                        .onFailure { error = it.message ?: "Gagal mengunduh pembaruan. Coba lagi." }
                    busy = false
                }
            })
        },
        dismissButton = { if (!forced) GhostButton("Nanti", onDismiss, enabled = !busy) },
    )
}

// Catatan: izin "instal aplikasi tidak dikenal" tidak dicek sendiri; installer sistem sudah mengarahkan ke pengaturannya.
private fun installApk(context: Context, apk: File) {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", apk)
    context.startActivity(
        Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
    )
}
