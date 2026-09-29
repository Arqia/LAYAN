package me.codewithus.layan.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import me.codewithus.layan.R

/** Token warna LAYAN Design System v1 (mode terang). Sama dengan web/app/globals.css. */
object C {
    val bg = Color(0xFFF7F7F5)
    val card = Color(0xFFFFFFFF)
    val muted = Color(0xFFF0F0EC)
    val mutedFg = Color(0xFF5C6066)
    val subtle = Color(0xFF6F737A)
    val soft = Color(0xFF3E4247)
    val icon = Color(0xFF8B8F95)
    val border = Color(0xFFE4E3DE)
    val input = Color(0xFFD9D8D2)
    val dash = Color(0xFFC9C8C1)
    val fg = Color(0xFF16181A)
    val ink = Color(0xFF16181A)
    val primary = Color(0xFF0A7A66)
    val primaryHover = Color(0xFF086957)
    val accent = Color(0xFFE2F2EE)
    val destructive = Color(0xFFB3261E)
    val destructiveSoft = Color(0xFFFCE7E5)
    val ok = Color(0xFF18793C)
    val okBg = Color(0xFFE2F3E7)
    val warn = Color(0xFF9A5B00)
    val violet = Color(0xFF6A45C4)
    val violetBg = Color(0xFFEFE9FC)
    val violetDot = Color(0xFF8561DE)
    val hold = Color(0xFF553599)
    val agentDot = Color(0xFF34C3A5)
}

/** (teks, latar, titik) per kode status. */
val STATUS = mapOf(
    "submitted" to Triple(Color(0xFF54585E), Color(0xFFEEEEEA), Color(0xFF8B8F95)),
    "processing" to Triple(Color(0xFF1D5FC7), Color(0xFFE5EEFC), Color(0xFF2F74E0)),
    "needs_info" to Triple(Color(0xFF9A5B00), Color(0xFFFCF0D8), Color(0xFFD08A12)),
    "pending_approval" to Triple(Color(0xFF6A45C4), Color(0xFFEFE9FC), Color(0xFF8561DE)),
    "approved" to Triple(Color(0xFF18793C), Color(0xFFE2F3E7), Color(0xFF2E9B55)),
    "rejected" to Triple(Color(0xFFB3261E), Color(0xFFFCE7E5), Color(0xFFD6453B)),
    "done" to Triple(Color(0xFFFFFFFF), Color(0xFF16181A), Color(0xFF34C3A5)),
)

val STATUS_LABEL = mapOf(
    "submitted" to "Diajukan",
    "processing" to "Diproses agent",
    "needs_info" to "Butuh data",
    "pending_approval" to "Menunggu persetujuan",
    "approved" to "Disetujui",
    "rejected" to "Ditolak",
    "done" to "Selesai",
)

/** (ikon/teks, latar) per worker. */
val WORKER = mapOf(
    "surat" to (Color(0xFF0A7A66) to Color(0xFFE2F2EE)),
    "helpdesk" to (Color(0xFF8E3F8C) to Color(0xFFF6E8F5)),
    "fasilitas" to (Color(0xFFB4541A) to Color(0xFFFBEBDF)),
)

private fun variable(res: Int, vararg weights: Int) = weights.map {
    Font(res, FontWeight(it), variationSettings = FontVariation.Settings(FontVariation.weight(it)))
}

val Jakarta = FontFamily(variable(R.font.plus_jakarta_sans, 400, 500, 600, 700, 800))
val Mono = FontFamily(variable(R.font.jetbrains_mono, 400, 500, 600))

/** Gaya teks ringkas: t(15, 600) = 15sp semibold. */
fun t(size: Int, weight: Int = 400, line: Int? = null, mono: Boolean = false, color: Color = Color.Unspecified) = TextStyle(
    fontFamily = if (mono) Mono else Jakarta,
    fontSize = size.sp,
    fontWeight = FontWeight(weight),
    lineHeight = line?.sp ?: TextUnit.Unspecified,
    color = color,
)

private fun Typography.withFont(f: FontFamily) = Typography(
    displayLarge = displayLarge.copy(fontFamily = f), displayMedium = displayMedium.copy(fontFamily = f), displaySmall = displaySmall.copy(fontFamily = f),
    headlineLarge = headlineLarge.copy(fontFamily = f), headlineMedium = headlineMedium.copy(fontFamily = f), headlineSmall = headlineSmall.copy(fontFamily = f),
    titleLarge = titleLarge.copy(fontFamily = f), titleMedium = titleMedium.copy(fontFamily = f), titleSmall = titleSmall.copy(fontFamily = f),
    bodyLarge = bodyLarge.copy(fontFamily = f), bodyMedium = bodyMedium.copy(fontFamily = f), bodySmall = bodySmall.copy(fontFamily = f),
    labelLarge = labelLarge.copy(fontFamily = f), labelMedium = labelMedium.copy(fontFamily = f), labelSmall = labelSmall.copy(fontFamily = f),
)

@Composable
fun LayanTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = C.primary, onPrimary = Color.White, background = C.bg, onBackground = C.fg,
            surface = C.card, onSurface = C.fg, surfaceVariant = C.muted, onSurfaceVariant = C.mutedFg,
            outline = C.input, outlineVariant = C.border, error = C.destructive,
        ),
        typography = Typography().withFont(Jakarta),
        content = content,
    )
}
