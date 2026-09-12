package mx.bancoatm.movil.data

import org.json.JSONArray
import org.json.JSONObject

data class Cuenta(
    val id: String,
    val numeroCuenta: String,
    val numeroCuentaEnmascarado: String,
    val saldo: Double,
    val titular: String?,
)

data class Movimiento(
    val id: String,
    val tipo: String,
    val estado: String,
    val canal: String,
    val monto: Double,
    val signo: String,
    val descripcion: String?,
    val contraparte: String?,
    val fecha: String,
)

data class Tarjeta(
    val id: String,
    val numeroEnmascarado: String,
    val tipo: String,
    val nivel: String?,
    val estado: String,
    val titular: String?,
    val limiteCredito: Double?,
    val creditoUtilizado: Double?,
    val creditoDisponible: Double?,
    val anualidad: Double?,
    val beneficios: List<String>,
    val color: String?,
)

data class DetalleTarjeta(
    val id: String,
    val numeroCompleto: String,
    val cvv: String,
    val expiraEn: String,
    val titular: String?,
    val tipo: String,
    val estado: String,
)

data class NivelCredito(
    val nivel: String,
    val nombre: String,
    val saldoMinimo: Double,
    val anualidad: Double,
    val lineaMaxima: Double,
    val lineaEstimada: Double?,
    val faltante: Double,
    val alcanzaRequisito: Boolean,
    val recomendada: Boolean,
    val yaContratada: Boolean,
    val beneficios: List<String>,
) {
    val solicitable: Boolean get() = alcanzaRequisito && !yaContratada
}

data class CatalogoCredito(
    val saldoActual: Double,
    val nivelRecomendado: String?,
    val tarjetasContratadas: Int,
    val maximoTarjetas: Int,
    val niveles: List<NivelCredito>,
) {
    val solicitables: List<NivelCredito> get() = niveles.filter { it.solicitable }
    val hayCupo: Boolean get() = tarjetasContratadas < maximoTarjetas
}

data class SolicitudCredito(
    val aprobada: Boolean,
    val mensaje: String,
    val tarjeta: Tarjeta?,
)

data class Prestamo(
    val id: String,
    val monto: Double,
    val plazoMeses: Int,
    val tasaAnual: Double,
    val pagoMensual: Double,
    val totalAPagar: Double,
    val estado: String,
    val capitalPendiente: Double,
    val totalPagado: Double,
    val pagosRealizados: Int,
    val creadoEn: String,
)

data class Apartado(
    val id: String,
    val nombre: String,
    val monto: Double,
    val metaMonto: Double?,
    val progreso: Int?,
    val icono: String,
)

data class ResumenApartados(
    val saldoDisponible: Double,
    val totalApartado: Double,
    val totalCuenta: Double,
    val maximoApartados: Int,
    val apartados: List<Apartado>,
)

data class Notificacion(
    val id: String,
    val mensaje: String,
    val categoria: String,
    val leida: Boolean,
    val creadaEn: String,
)

data class Proveedor(
    val codigo: String,
    val nombre: String,
    val categoria: String,
    val montoMinimo: Double,
    val montoMaximo: Double,
    val longitudReferencia: Int,
)

data class Comprobante(
    val id: String,
    val folio: String,
    val tipo: String,
    val estado: String,
    val monto: Double,
    val cuentaOrigen: String?,
    val cuentaDestino: String?,
    val descripcion: String?,
    val saldoResultante: Double?,
    val fecha: String,
)

data class Perfil(
    val nombreCompleto: String,
    val correo: String,
    val telefono: String?,
    val rol: String,
)

data class RespuestaAsistente(
    val respuesta: String,
    val sugerencias: List<String>,
)

private fun JSONObject.cadenaONulo(clave: String): String? =
    if (has(clave) && !isNull(clave)) getString(clave) else null

private fun JSONObject.decimalONulo(clave: String): Double? =
    if (has(clave) && !isNull(clave)) getDouble(clave) else null

fun JSONObject.aCuenta() = Cuenta(
    id = getString("id"),
    numeroCuenta = optString("numeroCuenta", ""),
    numeroCuentaEnmascarado = optString("numeroCuentaEnmascarado", ""),
    saldo = optDouble("saldo", 0.0),
    titular = cadenaONulo("titular"),
)

fun JSONObject.aMovimiento() = Movimiento(
    id = getString("id"),
    tipo = optString("tipo", ""),
    estado = optString("estado", ""),
    canal = optString("canal", ""),
    monto = optDouble("monto", 0.0),
    signo = optString("signo", "CARGO"),
    descripcion = cadenaONulo("descripcion"),
    contraparte = cadenaONulo("contraparte"),
    fecha = optString("fecha", ""),
)

fun JSONObject.aTarjeta() = Tarjeta(
    id = getString("id"),
    numeroEnmascarado = optString("numeroTarjeta", ""),
    tipo = optString("tipo", "DEBITO"),
    nivel = cadenaONulo("nombreNivel") ?: cadenaONulo("nivel"),
    estado = optString("estado", ""),
    titular = cadenaONulo("titular"),
    limiteCredito = decimalONulo("limiteCredito"),
    creditoUtilizado = decimalONulo("creditoUtilizado"),
    creditoDisponible = decimalONulo("creditoDisponible"),
    anualidad = decimalONulo("anualidad"),
    beneficios = listaDeTextos("beneficios"),
    color = cadenaONulo("color"),
)

fun JSONObject.listaDeTextos(clave: String): List<String> {
    val arreglo = optJSONArray(clave) ?: return emptyList()
    return (0 until arreglo.length())
        .map { arreglo.optString(it, "") }
        .filter { it.isNotBlank() }
}

fun JSONObject.aNivelCredito() = NivelCredito(
    nivel = optString("nivel", ""),
    nombre = optString("nombre", ""),
    saldoMinimo = optDouble("saldoMinimo", 0.0),
    anualidad = optDouble("anualidad", 0.0),
    lineaMaxima = optDouble("lineaMaxima", 0.0),
    lineaEstimada = decimalONulo("lineaEstimada"),
    faltante = optDouble("faltante", 0.0),
    alcanzaRequisito = optBoolean("alcanzaRequisito", false),
    recomendada = optBoolean("recomendada", false),
    yaContratada = optBoolean("yaContratada", false),
    beneficios = listaDeTextos("beneficios"),
)

fun JSONObject.aCatalogoCredito(): CatalogoCredito {
    val arreglo = optJSONArray("niveles")
    val niveles = if (arreglo == null) {
        emptyList()
    } else {
        (0 until arreglo.length()).mapNotNull { arreglo.optJSONObject(it)?.aNivelCredito() }
    }

    return CatalogoCredito(
        saldoActual = optDouble("saldoActual", 0.0),
        nivelRecomendado = cadenaONulo("nivelRecomendado"),
        tarjetasContratadas = optInt("tarjetasContratadas", 0),
        maximoTarjetas = optInt("maximoTarjetas", 0),
        niveles = niveles,
    )
}

fun JSONObject.aSolicitudCredito() = SolicitudCredito(
    aprobada = optBoolean("aprobada", false),
    mensaje = optString("mensaje", ""),
    tarjeta = optJSONObject("tarjeta")?.aTarjeta(),
)

fun JSONObject.aDetalleTarjeta() = DetalleTarjeta(
    id = getString("id"),
    numeroCompleto = optString("numeroCompleto", ""),
    cvv = optString("cvv", ""),
    expiraEn = optString("expiraEn", ""),
    titular = cadenaONulo("titular"),
    tipo = optString("tipo", "DEBITO"),
    estado = optString("estado", ""),
)

fun JSONObject.aPrestamo() = Prestamo(
    id = getString("id"),
    monto = optDouble("monto", 0.0),
    plazoMeses = optInt("plazoMeses", 0),
    tasaAnual = optDouble("tasaAnual", 0.0),
    pagoMensual = optDouble("pagoMensual", 0.0),
    totalAPagar = optDouble("totalAPagar", 0.0),
    estado = optString("estado", ""),
    capitalPendiente = optDouble("capitalPendiente", 0.0),
    totalPagado = optDouble("totalPagado", 0.0),
    pagosRealizados = optInt("pagosRealizados", 0),
    creadoEn = optString("creadoEn", ""),
)

fun JSONObject.aApartado() = Apartado(
    id = getString("id"),
    nombre = optString("nombre", ""),
    monto = optDouble("monto", 0.0),
    metaMonto = decimalONulo("metaMonto"),
    progreso = if (has("progreso") && !isNull("progreso")) getInt("progreso") else null,
    icono = optString("icono", "ahorro"),
)

fun JSONObject.aResumenApartados(): ResumenApartados {
    val lista = optJSONArray("apartados") ?: JSONArray()
    return ResumenApartados(
        saldoDisponible = optDouble("saldoDisponible", 0.0),
        totalApartado = optDouble("totalApartado", 0.0),
        totalCuenta = optDouble("totalCuenta", 0.0),
        maximoApartados = optInt("maximoApartados", 8),
        apartados = (0 until lista.length()).map { lista.getJSONObject(it).aApartado() },
    )
}

fun JSONObject.aNotificacion() = Notificacion(
    id = getString("id"),
    mensaje = optString("mensaje", ""),
    categoria = optString("categoria", "GENERAL"),
    leida = optBoolean("leida", false),
    creadaEn = optString("creadaEn", ""),
)

fun JSONObject.aProveedor() = Proveedor(
    codigo = optString("codigo", ""),
    nombre = optString("nombre", ""),
    categoria = optString("categoria", ""),
    montoMinimo = optDouble("montoMinimo", 0.0),
    montoMaximo = optDouble("montoMaximo", 0.0),
    longitudReferencia = optInt("longitudReferencia", 10),
)

fun JSONObject.aComprobante() = Comprobante(
    id = optString("id", ""),
    folio = optString("folio", ""),
    tipo = optString("tipo", ""),
    estado = optString("estado", ""),
    monto = optDouble("monto", 0.0),
    cuentaOrigen = cadenaONulo("cuentaOrigen"),
    cuentaDestino = cadenaONulo("cuentaDestino"),
    descripcion = cadenaONulo("descripcion"),
    saldoResultante = decimalONulo("saldoResultante"),
    fecha = optString("fecha", ""),
)

fun JSONObject.aPerfil() = Perfil(
    nombreCompleto = optString("nombreCompleto", ""),
    correo = optString("correo", ""),
    telefono = cadenaONulo("telefono"),
    rol = optString("rol", "CLIENTE"),
)

fun JSONObject.aRespuestaAsistente(): RespuestaAsistente {
    val sugerencias = optJSONArray("sugerencias") ?: JSONArray()
    return RespuestaAsistente(
        respuesta = optString("respuesta", ""),
        sugerencias = (0 until sugerencias.length())
            .map { sugerencias.optString(it, "") }
            .filter { it.isNotBlank() },
    )
}

fun cuentaYaExiste(respuesta: JSONObject): Boolean =
    respuesta.optString("estadoCuenta", "") == "ACTIVA" &&
        !respuesta.optBoolean("registrado", true)
