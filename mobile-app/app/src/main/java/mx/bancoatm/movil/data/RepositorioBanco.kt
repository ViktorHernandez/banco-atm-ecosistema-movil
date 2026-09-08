package mx.bancoatm.movil.data

import org.json.JSONArray
import org.json.JSONObject

class RepositorioBanco(
    private val api: ClienteApi,
    private val sesion: Sesion,
) {

    private fun <T> mapearLista(
        resultado: Resultado<JSONArray>,
        transformar: (JSONObject) -> T,
    ): Resultado<List<T>> = when (resultado) {
        is Resultado.Fallo -> resultado
        is Resultado.Exito -> Resultado.Exito(
            (0 until resultado.datos.length()).map {
                transformar(resultado.datos.getJSONObject(it))
            },
        )
    }

    private fun <T> mapearObjeto(
        resultado: Resultado<JSONObject>,
        transformar: (JSONObject) -> T,
    ): Resultado<T> = when (resultado) {
        is Resultado.Fallo -> resultado
        is Resultado.Exito -> Resultado.Exito(transformar(resultado.datos))
    }

    suspend fun iniciarSesion(
        correo: String,
        password: String,
        codigoTotp: String?,
    ): Resultado<JSONObject> {
        val cuerpo = JSONObject()
            .put("correo", correo.trim().lowercase())
            .put("password", password)
            .put("canal", "APP")

        if (!codigoTotp.isNullOrBlank()) {
            cuerpo.put("codigoTotp", codigoTotp.trim())
        }

        val resultado = api.publicar("/auth/login", cuerpo, autenticado = false)

        if (resultado is Resultado.Exito) {
            val datos = resultado.datos
            if (!datos.optBoolean("requiereSegundoFactor", false)) {
                val usuario = datos.optJSONObject("usuario")
                val cuenta = datos.optJSONObject("cuenta")
                sesion.abrir(
                    token = datos.getString("accessToken"),
                    nombreCompleto = usuario?.optString("nombreCompleto").orEmpty(),
                    correo = usuario?.optString("correo").orEmpty(),
                    cuentaId = cuenta?.optString("id"),
                    numeroCuenta = cuenta?.optString("numeroCuenta"),
                )
            }
        }

        return resultado
    }

    suspend fun registrar(
        nombreCompleto: String,
        correo: String,
        telefono: String,
        password: String,
    ): Resultado<JSONObject> = api.publicar(
        "/auth/registro",
        JSONObject()
            .put("nombreCompleto", nombreCompleto.trim())
            .put("correo", correo.trim().lowercase())
            .put("telefono", telefono.trim())
            .put("password", password),
        autenticado = false,
    )

    suspend fun verificarCorreo(correo: String, codigo: String): Resultado<JSONObject> =
        api.publicar(
            "/auth/verificar",
            JSONObject()
                .put("correo", correo.trim().lowercase())
                .put("codigo", codigo.trim()),
            autenticado = false,
        )

    suspend fun reenviarCodigo(correo: String): Resultado<JSONObject> = api.publicar(
        "/auth/reenviar-codigo",
        JSONObject().put("correo", correo.trim().lowercase()),
        autenticado = false,
    )

    suspend fun solicitarRecuperacion(correo: String): Resultado<JSONObject> = api.publicar(
        "/auth/recuperar/solicitar",
        JSONObject()
            .put("correo", correo.trim().lowercase())
            .put("idioma", sesion.idioma()),
        autenticado = false,
    )

    suspend fun restablecerPassword(
        correo: String,
        codigo: String,
        password: String,
    ): Resultado<JSONObject> = api.publicar(
        "/auth/recuperar/restablecer",
        JSONObject()
            .put("correo", correo.trim().lowercase())
            .put("codigo", codigo.trim())
            .put("password", password),
        autenticado = false,
    )

    suspend fun cerrarSesion(): Resultado<JSONObject> {
        val token = sesion.tokenPush()
        if (!token.isNullOrBlank()) {
            api.publicar("/push/dispositivos/baja", JSONObject().put("token", token))
        }
        val resultado = api.publicar("/auth/logout")
        sesion.invalidar()
        return resultado
    }

    suspend fun resumenCuenta(): Resultado<Cuenta> =
        mapearObjeto(api.obtenerObjeto("/accounts/me")) { it.aCuenta() }

    suspend fun saldo(): Resultado<JSONObject> = api.obtenerObjeto("/accounts/me/saldo")

    suspend fun movimientos(
        limite: Int = 20,
        desde: String? = null,
        hasta: String? = null,
        tipo: String? = null,
    ): Resultado<List<Movimiento>> {
        val parametros = mutableListOf("limite=$limite")
        desde?.let { parametros.add("desde=$it") }
        hasta?.let { parametros.add("hasta=$it") }
        tipo?.let { parametros.add("tipo=$it") }

        return mapearLista(
            api.obtenerLista("/accounts/me/movimientos?" + parametros.joinToString("&")),
        ) { it.aMovimiento() }
    }

    suspend fun limites(): Resultado<JSONObject> = api.obtenerObjeto("/transactions/limites")

    suspend fun transferir(
        cuentaDestino: String,
        monto: Double,
        concepto: String?,
    ): Resultado<Comprobante> {
        val cuerpo = JSONObject()
            .put("cuentaDestino", cuentaDestino.trim())
            .put("monto", monto)
        if (!concepto.isNullOrBlank()) {
            cuerpo.put("concepto", concepto.trim())
        }
        return mapearObjeto(api.publicar("/transactions/transferencia", cuerpo)) {
            it.aComprobante()
        }
    }

    suspend fun retirar(monto: Double): Resultado<Comprobante> = mapearObjeto(
        api.publicar("/transactions/retiro", JSONObject().put("monto", monto)),
    ) { it.aComprobante() }

    suspend fun depositar(monto: Double): Resultado<Comprobante> = mapearObjeto(
        api.publicar("/transactions/deposito", JSONObject().put("monto", monto)),
    ) { it.aComprobante() }

    suspend fun catalogoServicios(): Resultado<List<Proveedor>> =
        mapearLista(api.obtenerLista("/services/catalogo")) { it.aProveedor() }

    suspend fun pagarServicio(
        codigoProveedor: String,
        referencia: String,
        monto: Double,
    ): Resultado<Comprobante> = mapearObjeto(
        api.publicar(
            "/transactions/pago-servicio",
            JSONObject()
                .put("codigoProveedor", codigoProveedor)
                .put("referencia", referencia.trim())
                .put("monto", monto),
        ),
    ) { it.aComprobante() }

    suspend fun tarjetas(): Resultado<List<Tarjeta>> =
        mapearLista(api.obtenerLista("/cards/me/todas")) { it.aTarjeta() }

    suspend fun detalleTarjeta(id: String): Resultado<DetalleTarjeta> =
        mapearObjeto(api.obtenerObjeto("/cards/$id/detalle")) { it.aDetalleTarjeta() }

    suspend fun bloquearTarjeta(id: String): Resultado<JSONObject> =
        api.publicar("/cards/$id/bloquear")

    suspend fun desbloquearTarjeta(id: String): Resultado<JSONObject> =
        api.publicar("/cards/$id/desbloquear")

    suspend fun catalogoCredito(): Resultado<CatalogoCredito> =
        mapearObjeto(api.obtenerObjeto(RUTA_CATALOGO_CREDITO)) { it.aCatalogoCredito() }

    suspend fun solicitarCredito(nivel: String?): Resultado<SolicitudCredito> =
        mapearObjeto(
            api.publicar(RUTA_SOLICITAR_CREDITO, cuerpoSolicitudCredito(nivel)),
        ) { it.aSolicitudCredito() }

    suspend fun condicionesPrestamo(): Resultado<JSONObject> =
        api.obtenerObjeto("/loans/condiciones")

    suspend fun prestamos(): Resultado<List<Prestamo>> =
        mapearLista(api.obtenerLista("/loans/me")) { it.aPrestamo() }

    suspend fun simularPrestamo(monto: Double, plazoMeses: Int): Resultado<JSONObject> =
        api.obtenerObjeto("/loans/simular?monto=$monto&plazoMeses=$plazoMeses")

    suspend fun solicitarPrestamo(
        monto: Double,
        plazoMeses: Int,
    ): Resultado<JSONObject> = api.publicar(
        "/loans/solicitar",
        JSONObject().put("monto", monto).put("plazoMeses", plazoMeses),
    )

    suspend fun pagarPrestamo(id: String, monto: Double): Resultado<JSONObject> =
        api.publicar("/loans/$id/pagos", JSONObject().put("monto", monto))

    suspend fun apartados(): Resultado<ResumenApartados> =
        mapearObjeto(api.obtenerObjeto("/pockets/me")) { it.aResumenApartados() }

    suspend fun crearApartado(
        nombre: String,
        metaMonto: Double?,
        icono: String,
        montoInicial: Double?,
    ): Resultado<JSONObject> {
        val cuerpo = JSONObject().put("nombre", nombre.trim()).put("icono", icono)
        metaMonto?.let { cuerpo.put("metaMonto", it) }
        montoInicial?.let { cuerpo.put("montoInicial", it) }
        return api.publicar("/pockets", cuerpo)
    }

    suspend fun apartarDinero(id: String, monto: Double): Resultado<JSONObject> =
        api.publicar("/pockets/$id/apartar", JSONObject().put("monto", monto))

    suspend fun devolverDinero(id: String, monto: Double): Resultado<JSONObject> =
        api.publicar("/pockets/$id/devolver", JSONObject().put("monto", monto))

    suspend fun cerrarApartado(id: String): Resultado<JSONObject> =
        api.eliminar("/pockets/$id")

    suspend fun notificaciones(limite: Int = 50): Resultado<List<Notificacion>> =
        mapearLista(api.obtenerLista("/notifications/me?limite=$limite")) {
            it.aNotificacion()
        }

    suspend fun resumenNotificaciones(): Resultado<JSONObject> =
        api.obtenerObjeto("/notifications/me/resumen")

    suspend fun marcarTodasLeidas(): Resultado<JSONObject> =
        api.publicar("/notifications/me/leidas", JSONObject())

    suspend fun perfil(): Resultado<Perfil> =
        mapearObjeto(api.obtenerObjeto("/profile/me")) { it.aPerfil() }

    suspend fun actualizarPerfil(
        nombreCompleto: String,
        telefono: String,
    ): Resultado<JSONObject> = api.modificar(
        "/profile/me",
        JSONObject()
            .put("nombreCompleto", nombreCompleto.trim())
            .put("telefono", telefono.trim()),
    )

    suspend fun cambiarPassword(
        actual: String,
        nueva: String,
        confirmacion: String,
    ): Resultado<JSONObject> = api.publicar(
        "/profile/me/password",
        JSONObject()
            .put("passwordActual", actual)
            .put("passwordNueva", nueva)
            .put("passwordConfirmacion", confirmacion),
    )

    suspend fun registrarDispositivo(
        token: String,
        modelo: String,
    ): Resultado<JSONObject> {
        val resultado = api.publicar(
            "/push/dispositivos",
            JSONObject()
                .put("token", token)
                .put("plataforma", "android")
                .put("idioma", sesion.idioma())
                .put("modelo", modelo),
        )
        if (resultado is Resultado.Exito) {
            sesion.guardarTokenPush(token)
        }
        return resultado
    }

    suspend fun estadoPush(): Resultado<JSONObject> = api.obtenerObjeto("/push/estado")

    suspend fun pruebaPush(): Resultado<JSONObject> = api.publicar("/push/prueba")

    suspend fun consultarAsistente(mensaje: String): Resultado<RespuestaAsistente> {
        val cuerpo = JSONObject()
            .put("mensaje", mensaje.trim())
            .put("idioma", sesion.idioma())

        val ruta = if (sesion.token() != null) {
            "/assistant/consultar"
        } else {
            "/assistant/publico/consultar"
        }

        return mapearObjeto(
            api.publicar(ruta, cuerpo, autenticado = sesion.token() != null),
        ) { it.aRespuestaAsistente() }
    }

    suspend fun bienvenidaAsistente(): Resultado<RespuestaAsistente> {
        val autenticado = sesion.token() != null
        val ruta = if (autenticado) {
            "/assistant/bienvenida?idioma=${sesion.idioma()}"
        } else {
            "/assistant/publico/bienvenida?idioma=${sesion.idioma()}"
        }
        return mapearObjeto(api.obtenerObjeto(ruta, autenticado)) {
            it.aRespuestaAsistente()
        }
    }
}

const val RUTA_CATALOGO_CREDITO = "/cards/credito/catalogo"
const val RUTA_SOLICITAR_CREDITO = "/cards/credito/solicitar"

fun cuerpoSolicitudCredito(nivel: String?): JSONObject {
    val cuerpo = JSONObject()
    if (!nivel.isNullOrBlank()) {
        cuerpo.put("nivel", nivel)
    }
    return cuerpo
}
