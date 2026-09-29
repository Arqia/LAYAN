package me.codewithus.layan

import android.os.Bundle
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
import kotlinx.coroutines.launch
import me.codewithus.layan.data.Api
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

private sealed interface Screen {
    data object Chat : Screen
    data object History : Screen
    data class Detail(val id: String) : Screen
    data class Letter(val id: String) : Screen
}

class MainActivity : ComponentActivity() {
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
                        Screen.Chat -> ChatScreen(api, user, onHistory = { go(Screen.History) }, onLetter = { go(Screen.Letter(it)) }, onLogout = logout)
                        Screen.History -> HistoryScreen(api, onBack = { stack = stack.dropLast(1) }, onOpen = { go(Screen.Detail(it)) })
                        is Screen.Detail -> DetailScreen(api, s.id, onBack = { stack = stack.dropLast(1) }, onLetter = { go(Screen.Letter(it)) }, onChat = { stack = listOf(Screen.Chat) })
                        is Screen.Letter -> LetterScreen(api, s.id, onBack = { stack = stack.dropLast(1) })
                    }
                }
            }
        }
    }
}
