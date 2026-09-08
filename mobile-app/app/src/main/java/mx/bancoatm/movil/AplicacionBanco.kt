package mx.bancoatm.movil

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import mx.bancoatm.movil.data.ClienteApi
import mx.bancoatm.movil.data.RepositorioBanco
import mx.bancoatm.movil.data.Sesion

class AplicacionBanco : Application() {

    lateinit var sesion: Sesion
        private set

    lateinit var repositorio: RepositorioBanco
        private set

    override fun onCreate() {
        super.onCreate()
        sesion = Sesion(this)
        repositorio = RepositorioBanco(ClienteApi(sesion), sesion)
        crearCanalNotificaciones()
    }

    private fun crearCanalNotificaciones() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val gestor = getSystemService(NotificationManager::class.java) ?: return

        val canal = NotificationChannel(
            CANAL_MOVIMIENTOS,
            getString(R.string.canal_movimientos),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = getString(R.string.canal_movimientos_detalle)
            enableVibration(true)
        }

        gestor.createNotificationChannel(canal)
    }

    companion object {
        const val CANAL_MOVIMIENTOS = "movimientos"
    }
}
