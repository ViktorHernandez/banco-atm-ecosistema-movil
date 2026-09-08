package mx.bancoatm.movil.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import mx.bancoatm.movil.BuildConfig

enum class Entorno(val etiqueta: String) {
    LOCAL("local"),
    PRODUCCION("produccion"),
}

data class DatosSesion(
    val nombreCompleto: String,
    val correo: String,
    val cuentaId: String?,
    val numeroCuenta: String?,
)

class Sesion(contexto: Context) : ContextoSesion {

    private val almacen = AlmacenSeguro(contexto)

    private val _autenticado = MutableStateFlow(almacen.leer(AlmacenSeguro.TOKEN) != null)
    val autenticado: StateFlow<Boolean> = _autenticado

    private val _idioma = MutableStateFlow(almacen.leerPlano(AlmacenSeguro.IDIOMA, "es"))
    val idiomaFlujo: StateFlow<String> = _idioma

    private val _entorno = MutableStateFlow(
        Entorno.entries.firstOrNull {
            it.etiqueta == almacen.leerPlano(
                AlmacenSeguro.ENTORNO,
                if (BuildConfig.USAR_PRODUCCION) Entorno.PRODUCCION.etiqueta else Entorno.LOCAL.etiqueta,
            )
        } ?: Entorno.LOCAL,
    )
    val entornoFlujo: StateFlow<Entorno> = _entorno

    private val _servidorLocal = MutableStateFlow(
        almacen.leerPlano(SERVIDOR_LOCAL, BuildConfig.API_LOCAL),
    )
    val servidorLocalFlujo: StateFlow<String> = _servidorLocal

    override fun urlBase(): String = when (entornoEfectivo()) {
        Entorno.LOCAL -> _servidorLocal.value.trimEnd('/')
        Entorno.PRODUCCION -> BuildConfig.API_PRODUCCION.trimEnd('/')
    }

    fun entornoEfectivo(): Entorno =
        if (BuildConfig.PERMITIR_ENTORNO_LOCAL) _entorno.value else Entorno.PRODUCCION

    fun permiteEntornoLocal(): Boolean = BuildConfig.PERMITIR_ENTORNO_LOCAL

    fun cambiarEntorno(entorno: Entorno) {
        if (!BuildConfig.PERMITIR_ENTORNO_LOCAL) {
            return
        }
        _entorno.value = entorno
        almacen.guardarPlano(AlmacenSeguro.ENTORNO, entorno.etiqueta)
    }

    fun cambiarServidorLocal(url: String) {
        val limpia = url.trim().trimEnd('/')
        if (limpia.isNotBlank()) {
            _servidorLocal.value = limpia
            almacen.guardarPlano(SERVIDOR_LOCAL, limpia)
        }
    }

    override fun idioma(): String = _idioma.value

    fun cambiarIdioma(codigo: String) {
        val valido = if (codigo == "en") "en" else "es"
        _idioma.value = valido
        almacen.guardarPlano(AlmacenSeguro.IDIOMA, valido)
    }

    override fun token(): String? = almacen.leer(AlmacenSeguro.TOKEN)

    fun datos(): DatosSesion? {
        val nombre = almacen.leer(AlmacenSeguro.NOMBRE) ?: return null
        return DatosSesion(
            nombreCompleto = nombre,
            correo = almacen.leer(AlmacenSeguro.CORREO).orEmpty(),
            cuentaId = almacen.leer(AlmacenSeguro.CUENTA_ID),
            numeroCuenta = almacen.leer(AlmacenSeguro.NUMERO_CUENTA),
        )
    }

    fun abrir(
        token: String,
        nombreCompleto: String,
        correo: String,
        cuentaId: String?,
        numeroCuenta: String?,
    ) {
        almacen.guardar(AlmacenSeguro.TOKEN, token)
        almacen.guardar(AlmacenSeguro.NOMBRE, nombreCompleto)
        almacen.guardar(AlmacenSeguro.CORREO, correo)
        almacen.guardar(AlmacenSeguro.CUENTA_ID, cuentaId)
        almacen.guardar(AlmacenSeguro.NUMERO_CUENTA, numeroCuenta)
        _autenticado.value = true
    }

    fun tokenPush(): String? = almacen.leer(AlmacenSeguro.TOKEN_PUSH)

    fun guardarTokenPush(token: String) {
        almacen.guardar(AlmacenSeguro.TOKEN_PUSH, token)
    }

    override fun invalidar() {
        almacen.borrar(AlmacenSeguro.TOKEN)
        almacen.borrar(AlmacenSeguro.NOMBRE)
        almacen.borrar(AlmacenSeguro.CORREO)
        almacen.borrar(AlmacenSeguro.CUENTA_ID)
        almacen.borrar(AlmacenSeguro.NUMERO_CUENTA)
        almacen.borrar(AlmacenSeguro.TOKEN_PUSH)
        _autenticado.value = false
    }

    companion object {
        private const val SERVIDOR_LOCAL = "servidorLocal"
    }
}
