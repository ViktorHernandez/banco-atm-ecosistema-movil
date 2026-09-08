package mx.bancoatm.movil.push

import android.os.Build
import mx.bancoatm.movil.data.RepositorioBanco
import mx.bancoatm.movil.data.Sesion
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

object RegistroPush {

    suspend fun sincronizar(sesion: Sesion, repositorio: RepositorioBanco): Boolean {
        val token = obtenerToken() ?: sesion.tokenPush() ?: return false

        return when (repositorio.registrarDispositivo(token, Build.MODEL ?: "android")) {
            is mx.bancoatm.movil.data.Resultado.Exito -> true
            is mx.bancoatm.movil.data.Resultado.Fallo -> false
        }
    }

    private suspend fun obtenerToken(): String? = suspendCoroutine { continuacion ->
        try {
            com.google.firebase.messaging.FirebaseMessaging.getInstance()
                .token
                .addOnCompleteListener { tarea ->
                    continuacion.resume(
                        if (tarea.isSuccessful) tarea.result else null,
                    )
                }
        } catch (error: Exception) {
            continuacion.resume(null)
        } catch (error: NoClassDefFoundError) {
            continuacion.resume(null)
        }
    }
}
