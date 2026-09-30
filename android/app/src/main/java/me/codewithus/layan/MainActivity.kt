package me.codewithus.layan

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import kotlinx.coroutines.launch
import me.codewithus.layan.data.Api
import me.codewithus.layan.data.AppRelease
import me.codewithus.layan.data.Me
import me.codewithus.layan.data.Session
import me.codewithus.layan.ui.C
import me.codewithus.layan.ui.ChatScreen
import me.codewithus.layan.ui.DetailScreen
import me.codewithus.layan.ui.HistoryScreen
import me.codewithus.layan.ui.LayanTheme
import me.codewithus.layan.ui.LetterScreen
import me.codewithus.layan.ui.LoginScreen
import me.codewithus.layan.ui.NotStudentScreen
import me.codewithus.layan.ui.UpdateDialog

private sealed interface Screen {
    data object Chat : Screen
    data object History : Screen
    data class Detail(val id: String) : Screen
    data class Letter(val id: String) : Screen
}

private const val UPDATE_EVERY_MS = 6 * 60 * 60 * 1000L

class MainActivity : ComponentActivity() {
    private var lastUpdateCheck = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val session = Session(this)
        val api = Api(session)

        setContent {
            LayanTheme {
                var me by remember { mutableStateOf<Me?>(null) }
                var checking by remember { mutableStateOf(session.token != null) }
                var stack by remember { mutableStateOf(listOf<Screen>(Screen.Chat)) }
                val scope = rememberCoroutineScope()
                var release by remember { mutableStateOf<AppRelease?>(null) }

                suspend fun newerRelease() = api.latestRelease()?.takeIf { it.versionCode > BuildConfig.VERSION_CODE }
                // cek otomatis saat app dibuka/kembali ke depan, paling sering tiap 6 jam
                LifecycleResumeEffect(Unit) {
                    val now = System.currentTimeMillis()
                    if (now - lastUpdateCheck > UPDATE_EVERY_MS) {
                        lastUpdateCheck = now
                        scope.launch { runCatching { newerRelease() }.getOrNull()?.let { release = it } }
                    }
                    onPauseOrDispose {}
                }
                val checkUpdate: () -> Unit = {
                    scope.launch {
                        val r = runCatching { newerRelease() }
                        release = r.getOrNull()
                        val msg = when {
                            r.isFailure -> "Tidak bisa mengecek pembaruan. Periksa koneksi."
                            release == null -> "Sudah versi terbaru (${BuildConfig.VERSION_NAME})."
                            else -> null
                        }
                        msg?.let { Toast.makeText(this@MainActivity, it, Toast.LENGTH_SHORT).show() }
                    }
                }

                api.onUnauthorized = { me = null; stack = listOf(Screen.Chat) }
                LaunchedEffect(Unit) {
                    if (session.token != null) me = runCatching { api.me() }.getOrNull()
                    checking = false
                }
                BackHandler(stack.size > 1) { stack = stack.dropLast(1) }
                fun go(s: Screen) { stack = stack + s }
                val logout: () -> Unit = { scope.launch { api.logout(); me = null; stack = listOf(Screen.Chat) } }

                val user = me
                when {
                    checking -> Box(Modifier.fillMaxSize().background(C.bg), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(Modifier.size(28.dp), color = C.primary, strokeWidth = 2.dp)
                    }
                    user == null -> LoginScreen(api) { me = it }
                    user.role != "mahasiswa" -> NotStudentScreen(user, api.webBase, logout)
                    else -> when (val s = stack.last()) {
                        Screen.Chat -> ChatScreen(api, user, onHistory = { go(Screen.History) }, onLetter = { go(Screen.Letter(it)) }, onLogout = logout, onCheckUpdate = checkUpdate)
                        Screen.History -> HistoryScreen(api, onBack = { stack = stack.dropLast(1) }, onOpen = { go(Screen.Detail(it)) })
                        is Screen.Detail -> DetailScreen(api, s.id, onBack = { stack = stack.dropLast(1) }, onLetter = { go(Screen.Letter(it)) }, onChat = { stack = listOf(Screen.Chat) })
                        is Screen.Letter -> LetterScreen(api, s.id, onBack = { stack = stack.dropLast(1) })
                    }
                }
                release?.let { UpdateDialog(api, it) { release = null } }
            }
        }
    }
}
