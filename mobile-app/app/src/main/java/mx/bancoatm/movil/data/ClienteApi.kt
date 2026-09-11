package mx.bancoatm.movil.data

import java.io.IOException
import java.net.SocketTimeoutException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

sealed class Resultado<out T> {
    data class Exito<T>(val datos: T) : Resultado<T>()
    data class Fallo(val error: ErrorApi) : Resultado<Nothing>()
}

data class ErrorApi(
    val codigo: Int,
    val mensaje: String,
    val tipo: TipoError,
)

enum class TipoError {
    SIN_RED,
    CREDENCIALES_INVALIDAS,
    TIEMPO_AGOTADO,
    SESION_EXPIRADA,
    NO_AUTORIZADO,
    SOLICITUD_INVALIDA,
    NO_ENCONTRADO,
    CONFLICTO,
    SERVIDOR,
    DESCONOCIDO,
}

class ClienteApi(private val sesion: ContextoSesion) {

    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private val tipoJson = "application/json; charset=utf-8".toMediaType()

    private fun clasificar(codigo: Int, autenticado: Boolean): TipoError = when (codigo) {
        400 -> TipoError.SOLICITUD_INVALIDA
        401 -> if (autenticado) {
            TipoError.SESION_EXPIRADA
        } else {
            TipoError.CREDENCIALES_INVALIDAS
        }
        403 -> TipoError.NO_AUTORIZADO
        404 -> TipoError.NO_ENCONTRADO
        409 -> TipoError.CONFLICTO
        in 500..599 -> TipoError.SERVIDOR
        else -> TipoError.DESCONOCIDO
    }

    private fun mensajeDeCuerpo(cuerpo: String?, codigo: Int): String {
        if (cuerpo.isNullOrBlank()) {
            return "Error $codigo"
        }
        return try {
            val json = JSONObject(cuerpo)
            when {
                json.has("mensaje") -> json.getString("mensaje")
                json.has("message") -> {
                    val valor = json.get("message")
                    if (valor is JSONArray) {
                        (0 until valor.length()).joinToString(" ") { valor.getString(it) }
                    } else {
                        valor.toString()
                    }
                }
                else -> "Error $codigo"
            }
        } catch (error: Exception) {
            "Error $codigo"
        }
    }

    private suspend fun ejecutar(
        metodo: String,
        ruta: String,
        cuerpo: JSONObject?,
        autenticado: Boolean,
    ): Resultado<String> = withContext(Dispatchers.IO) {
        var respuesta = intentar(metodo, ruta, cuerpo, autenticado)
        var intento = 1

        while (true) {
            val fallo = respuesta as? Resultado.Fallo ?: break
            if (!PoliticaReintento.debeReintentar(metodo, fallo.error.tipo, intento)) {
                break
            }
            delay(PoliticaReintento.esperaMs(intento))
            respuesta = intentar(metodo, ruta, cuerpo, autenticado)
            intento += 1
        }

        respuesta
    }

    private fun intentar(
        metodo: String,
        ruta: String,
        cuerpo: JSONObject?,
        autenticado: Boolean,
    ): Resultado<String> {
        val url = sesion.urlBase() + ruta

        val constructor = Request.Builder().url(url)

        val peticion = cuerpo?.toString()?.toRequestBody(tipoJson)

        when (metodo) {
            "GET" -> constructor.get()
            "DELETE" -> constructor.delete(peticion)
            "PATCH" -> constructor.patch(peticion ?: "{}".toRequestBody(tipoJson))
            else -> constructor.post(peticion ?: "{}".toRequestBody(tipoJson))
        }

        if (autenticado) {
            val token = sesion.token()
            if (token.isNullOrBlank()) {
                return Resultado.Fallo(
                    ErrorApi(401, "Sesión no iniciada", TipoError.SESION_EXPIRADA),
                )
            }
            constructor.header("Authorization", "Bearer $token")
        }

        constructor.header("Accept", "application/json")
        constructor.header("Accept-Language", sesion.idioma())

        return try {
            http.newCall(constructor.build()).execute().use { respuesta ->
                val texto = respuesta.body?.string()

                if (respuesta.isSuccessful) {
                    return Resultado.Exito(texto ?: "{}")
                }

                if (respuesta.code == 401 && autenticado) {
                    sesion.invalidar()
                }

                Resultado.Fallo(
                    ErrorApi(
                        respuesta.code,
                        mensajeDeCuerpo(texto, respuesta.code),
                        clasificar(respuesta.code, autenticado),
                    ),
                )
            }
        } catch (error: SocketTimeoutException) {
            Resultado.Fallo(
                ErrorApi(
                    0,
                    "El servidor tardó demasiado en responder",
                    TipoError.TIEMPO_AGOTADO,
                ),
            )
        } catch (error: IOException) {
            Resultado.Fallo(
                ErrorApi(0, "No hay conexión con el servidor", TipoError.SIN_RED),
            )
        }
    }

    suspend fun obtenerObjeto(
        ruta: String,
        autenticado: Boolean = true,
    ): Resultado<JSONObject> = convertirObjeto(ejecutar("GET", ruta, null, autenticado))

    suspend fun obtenerLista(
        ruta: String,
        autenticado: Boolean = true,
    ): Resultado<JSONArray> = convertirLista(ejecutar("GET", ruta, null, autenticado))

    suspend fun publicar(
        ruta: String,
        cuerpo: JSONObject? = null,
        autenticado: Boolean = true,
    ): Resultado<JSONObject> =
        convertirObjeto(ejecutar("POST", ruta, cuerpo, autenticado))

    suspend fun modificar(
        ruta: String,
        cuerpo: JSONObject,
        autenticado: Boolean = true,
    ): Resultado<JSONObject> =
        convertirObjeto(ejecutar("PATCH", ruta, cuerpo, autenticado))

    suspend fun eliminar(
        ruta: String,
        autenticado: Boolean = true,
    ): Resultado<JSONObject> = convertirObjeto(ejecutar("DELETE", ruta, null, autenticado))

    private fun convertirObjeto(resultado: Resultado<String>): Resultado<JSONObject> =
        when (resultado) {
            is Resultado.Fallo -> resultado
            is Resultado.Exito -> try {
                Resultado.Exito(
                    if (resultado.datos.isBlank()) JSONObject() else JSONObject(resultado.datos),
                )
            } catch (error: Exception) {
                Resultado.Fallo(
                    ErrorApi(
                        0,
                        "La respuesta del servidor no es válida",
                        TipoError.DESCONOCIDO,
                    ),
                )
            }
        }

    private fun convertirLista(resultado: Resultado<String>): Resultado<JSONArray> =
        when (resultado) {
            is Resultado.Fallo -> resultado
            is Resultado.Exito -> try {
                Resultado.Exito(
                    if (resultado.datos.isBlank()) JSONArray() else JSONArray(resultado.datos),
                )
            } catch (error: Exception) {
                Resultado.Fallo(
                    ErrorApi(
                        0,
                        "La respuesta del servidor no es válida",
                        TipoError.DESCONOCIDO,
                    ),
                )
            }
        }
}
