package mx.bancoatm.movil.push

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mx.bancoatm.movil.AplicacionBanco
import mx.bancoatm.movil.MainActivity
import mx.bancoatm.movil.R

class ServicioMensajeria : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)

        val aplicacion = application as? AplicacionBanco ?: return

        if (aplicacion.sesion.token() == null) {
            aplicacion.sesion.guardarTokenPush(token)
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            aplicacion.repositorio.registrarDispositivo(
                token,
                android.os.Build.MODEL ?: "android",
            )
        }
    }

    override fun onMessageReceived(mensaje: RemoteMessage) {
        super.onMessageReceived(mensaje)

        val titulo = mensaje.notification?.title
            ?: mensaje.data["titulo"]
            ?: getString(R.string.app_nombre)

        val cuerpo = mensaje.notification?.body
            ?: mensaje.data["mensaje"]
            ?: return

        mostrar(titulo, cuerpo)
    }

    private fun mostrar(titulo: String, cuerpo: String) {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS,
            ) != PackageManager.PERMISSION_GRANTED &&
            android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU
        ) {
            return
        }

        val intencion = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        val pendiente = PendingIntent.getActivity(
            this,
            0,
            intencion,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val aviso = NotificationCompat.Builder(this, AplicacionBanco.CANAL_MOVIMIENTOS)
            .setSmallIcon(R.drawable.ic_aviso)
            .setContentTitle(titulo)
            .setContentText(cuerpo)
            .setStyle(NotificationCompat.BigTextStyle().bigText(cuerpo))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendiente)
            .build()

        try {
            NotificationManagerCompat.from(this)
                .notify(System.currentTimeMillis().toInt(), aviso)
        } catch (error: SecurityException) {
            return
        }
    }
}
