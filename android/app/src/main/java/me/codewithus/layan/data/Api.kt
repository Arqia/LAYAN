package me.codewithus.layan.data

import android.content.Context
import androidx.core.content.edit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.long
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.put
import me.codewithus.layan.BuildConfig
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.util.concurrent.TimeUnit

/* ---------- model, sama bentuknya dengan respons API Rust ---------- */

@Serializable
data class Me(val id: String, val role: String, val name: String, val email: String, val nim: String? = null, val prodi: String? = null, val unit: String? = null)

@Serializable
private data class LoginRes(val token: String, val user: Me)

@Serializable
data class FileInfo(val name: String, val size: Long)

@Serializable
data class Card(val kind: String, val state: String, val data: JsonObject)

@Serializable
data class ChatMessage(val id: Long, val sender: String, val text: String? = null, val file: FileInfo? = null, val card: Card? = null, val time: String)

@Serializable
data class HistoryItem(val id: String, val worker: String, val kind: String, val title: String, val status: String, val time: String, val meta: String, val active: Boolean)

@Serializable
data class Letter(val title: String, val body1: String, val body2: String)

@Serializable
data class Student(val name: String, val nim: String? = null, val prodi: String? = null)

@Serializable
data class Detail(
    val id: String,
    val worker: String,
    val kind: String,
    val title: String,
    val status: String,
    val fields: List<List<String>>,
    val steps: Map<String, String>,
    val letter: Letter? = null,
    val letter_no: String? = null,
    val approved_by: String? = null,
    val approved_at: String? = null,
    val reject_reason: String? = null,
    val student: Student,
)

@Serializable
private data class Attachment(val id: String, val name: String, val size: Long)

/** Event dari stream agent (SSE). */
sealed interface AgentEvent {
    data class Status(val label: String, val steps: List<String>?, val step: Int?) : AgentEvent
    data object Idle : AgentEvent
    data class Message(val message: ChatMessage) : AgentEvent
    data class Update(val id: Long, val state: String) : AgentEvent
    data class Failed(val message: String) : AgentEvent
}

class ApiException(message: String, val unauthorized: Boolean = false) : Exception(message)

/** Token sesi disimpan di SharedPreferences privat aplikasi. */
class Session(context: Context) {
    private val prefs = context.getSharedPreferences("layan", Context.MODE_PRIVATE)
    var token: String?
        get() = prefs.getString("token", null)
        set(v) = prefs.edit { if (v == null) remove("token") else putString("token", v) }
}

/* ---------- client ---------- */

class Api(private val session: Session) {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS) // agent + LLM bisa beberapa detik per langkah
        .build()
    private val base = BuildConfig.API_BASE.trimEnd('/') + "/api"
    private val jsonType = "application/json".toMediaType()

    /** Dipanggil saat token ditolak server, supaya app kembali ke layar login. */
    var onUnauthorized: () -> Unit = {}

    val webBase: String get() = BuildConfig.API_BASE.trimEnd('/')

    private fun request(path: String) = Request.Builder().url(base + path).apply {
        session.token?.let { header("Authorization", "Bearer $it") }
    }

    private fun post(path: String, body: JsonObject) = request(path).post(body.toString().toRequestBody(jsonType)).build()

    private fun fail(res: Response, body: String): Nothing {
        val msg = runCatching { json.parseToJsonElement(body).jsonObject["error"]?.jsonPrimitive?.contentOrNull }.getOrNull()
        if (res.code == 401) {
            session.token = null
            onUnauthorized()
            throw ApiException(msg ?: "Sesi berakhir. Silakan masuk lagi.", unauthorized = true)
        }
        throw ApiException(msg ?: "Server sedang bermasalah (${res.code}). Coba lagi.")
    }

    private suspend fun <T> call(req: Request, parse: (String) -> T): T = withContext(Dispatchers.IO) {
        client.newCall(req).execute().use { res ->
            val body = res.body.string()
            if (!res.isSuccessful) fail(res, body)
            parse(body)
        }
    }

    suspend fun login(identifier: String, password: String): Me {
        val res = call(post("/auth/login", buildJsonObject { put("identifier", identifier); put("password", password) })) {
            json.decodeFromString<LoginRes>(it)
        }
        session.token = res.token
        return res.user
    }

    suspend fun me(): Me = call(request("/me").build()) { json.decodeFromString(it) }

    suspend fun logout() {
        runCatching { call(post("/auth/logout", JsonObject(emptyMap()))) {} }
        session.token = null
    }

    suspend fun chat(): List<ChatMessage> = call(request("/chat").build()) { json.decodeFromString(it) }

    fun send(text: String): Flow<AgentEvent> = stream("/chat", buildJsonObject { put("text", text) })

    fun action(messageId: Long, action: String, payload: JsonObject = JsonObject(emptyMap())): Flow<AgentEvent> =
        stream("/chat/action", buildJsonObject { put("message_id", messageId); put("action", action); put("payload", payload) })

    /** Upload lampiran (PDF/JPG/PNG, maks 5 MB). Mengembalikan id lampiran. */
    suspend fun upload(name: String, mime: String, bytes: ByteArray): String {
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("file", name, bytes.toRequestBody(mime.toMediaType()))
            .build()
        return call(request("/attachments").post(body).build()) { json.decodeFromString<Attachment>(it).id }
    }

    suspend fun requests(): List<HistoryItem> = call(request("/requests").build()) { json.decodeFromString(it) }

    suspend fun detail(id: String): Detail = call(request("/requests/$id").build()) { json.decodeFromString(it) }

    /** POST lalu baca Server-Sent Events baris demi baris. */
    private fun stream(path: String, body: JsonObject): Flow<AgentEvent> = flow {
        client.newCall(post(path, body)).execute().use { res ->
            if (!res.isSuccessful) fail(res, res.body.string())
            val source = res.body.source()
            val data = StringBuilder()
            while (true) {
                val line = source.readUtf8Line() ?: break
                when {
                    line.startsWith("data:") -> data.append(line.removePrefix("data:").trim())
                    line.isEmpty() && data.isNotEmpty() -> {
                        parse(data.toString())?.let { emit(it) }
                        data.clear()
                    }
                }
            }
        }
    }.flowOn(Dispatchers.IO)

    private fun parse(raw: String): AgentEvent? {
        val o = json.parseToJsonElement(raw).jsonObject
        return when (o["type"]?.jsonPrimitive?.contentOrNull) {
            "status" -> {
                val label = o["label"]?.jsonPrimitive?.contentOrNull ?: return AgentEvent.Idle
                val steps = runCatching { o["steps"]!!.jsonArray.map { it.jsonPrimitive.content } }.getOrNull()
                AgentEvent.Status(label, steps, o["step"]?.jsonPrimitive?.intOrNull)
            }
            "message" -> AgentEvent.Message(json.decodeFromJsonElement(ChatMessage.serializer(), o["message"]!!))
            "update" -> AgentEvent.Update(o["id"]!!.jsonPrimitive.long, o["state"]!!.jsonPrimitive.content)
            "error" -> AgentEvent.Failed(o["message"]?.jsonPrimitive?.contentOrNull ?: "Terjadi kesalahan.")
            else -> null
        }
    }
}
