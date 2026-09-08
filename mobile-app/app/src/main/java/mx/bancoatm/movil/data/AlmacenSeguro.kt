package mx.bancoatm.movil.data

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class AlmacenSeguro(contexto: Context) {

    private val preferencias: SharedPreferences =
        contexto.applicationContext.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)

    private fun clave(): SecretKey {
        val almacen = KeyStore.getInstance(PROVEEDOR).apply { load(null) }
        val existente = almacen.getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry
        if (existente != null) {
            return existente.secretKey
        }

        val generador = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, PROVEEDOR)
        generador.init(
            KeyGenParameterSpec.Builder(
                ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generador.generateKey()
    }

    fun guardar(nombre: String, valor: String?) {
        if (valor == null) {
            preferencias.edit().remove(nombre).apply()
            return
        }

        try {
            val cifrador = Cipher.getInstance(TRANSFORMACION)
            cifrador.init(Cipher.ENCRYPT_MODE, clave())
            val cifrado = cifrador.doFinal(valor.toByteArray(Charsets.UTF_8))
            val paquete = cifrador.iv + cifrado
            preferencias.edit()
                .putString(nombre, Base64.encodeToString(paquete, Base64.NO_WRAP))
                .apply()
        } catch (error: Exception) {
            preferencias.edit().remove(nombre).apply()
        }
    }

    fun leer(nombre: String): String? {
        val almacenado = preferencias.getString(nombre, null) ?: return null

        return try {
            val paquete = Base64.decode(almacenado, Base64.NO_WRAP)
            if (paquete.size <= TAMANO_IV) {
                return null
            }
            val iv = paquete.copyOfRange(0, TAMANO_IV)
            val cifrado = paquete.copyOfRange(TAMANO_IV, paquete.size)
            val cifrador = Cipher.getInstance(TRANSFORMACION)
            cifrador.init(Cipher.DECRYPT_MODE, clave(), GCMParameterSpec(128, iv))
            String(cifrador.doFinal(cifrado), Charsets.UTF_8)
        } catch (error: Exception) {
            preferencias.edit().remove(nombre).apply()
            null
        }
    }

    fun borrar(nombre: String) {
        preferencias.edit().remove(nombre).apply()
    }

    fun limpiar() {
        preferencias.edit().clear().apply()
    }

    fun guardarPlano(nombre: String, valor: String) {
        preferencias.edit().putString(nombre, valor).apply()
    }

    fun leerPlano(nombre: String, porDefecto: String): String =
        preferencias.getString(nombre, porDefecto) ?: porDefecto

    companion object {
        private const val ARCHIVO = "banco_atm_sesion"
        private const val PROVEEDOR = "AndroidKeyStore"
        private const val ALIAS = "banco_atm_clave_sesion"
        private const val TRANSFORMACION = "AES/GCM/NoPadding"
        private const val TAMANO_IV = 12

        const val TOKEN = "accessToken"
        const val NOMBRE = "nombreCompleto"
        const val CORREO = "correo"
        const val CUENTA_ID = "cuentaId"
        const val NUMERO_CUENTA = "numeroCuenta"
        const val TOKEN_PUSH = "tokenPush"
        const val IDIOMA = "idioma"
        const val ENTORNO = "entorno"
    }
}
