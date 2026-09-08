package mx.bancoatm.movil.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import mx.bancoatm.movil.R

private val recursosNivel = mapOf(
    "CLASICA" to R.string.nivel_clasica,
    "CLÁSICA" to R.string.nivel_clasica,
    "ORO" to R.string.nivel_oro,
    "PLATINO" to R.string.nivel_platino,
    "INFINITE" to R.string.nivel_infinite,
)

private val recursosBeneficio = mapOf(
    "Sin anualidad el primer año" to R.string.beneficio_sin_anualidad_primer_ano,
    "Hasta 45 días sin intereses" to R.string.beneficio_45_dias,
    "Seguro de protección de compras" to R.string.beneficio_proteccion_compras,
    "Consulta de movimientos en los tres canales" to R.string.beneficio_movimientos_canales,
    "Todo lo de la Clásica" to R.string.beneficio_todo_clasica,
    "2 % de bonificación en supermercado y gasolina" to R.string.beneficio_bonificacion,
    "Seguro de viaje para el titular" to R.string.beneficio_seguro_viaje,
    "Meses sin intereses en comercios participantes" to R.string.beneficio_meses_sin_intereses,
    "Todo lo de la Oro" to R.string.beneficio_todo_oro,
    "Acceso a salas VIP de aeropuerto (4 visitas al año)" to R.string.beneficio_salas_vip,
    "Seguro de auto de renta y de equipaje" to R.string.beneficio_seguro_auto,
    "Atención telefónica prioritaria las 24 horas" to R.string.beneficio_atencion_24,
    "Todo lo de la Platino" to R.string.beneficio_todo_platino,
    "Salas VIP ilimitadas para el titular y un acompañante" to R.string.beneficio_salas_ilimitadas,
    "Concierge personal y asistencia en viajes" to R.string.beneficio_concierge,
    "Programa de puntos con acumulación acelerada" to R.string.beneficio_puntos,
    "Seguro médico internacional" to R.string.beneficio_seguro_medico,
)

fun recursoDeNivel(clave: String?): Int? = recursosNivel[clave?.uppercase()]

fun recursoDeBeneficio(texto: String): Int? = recursosBeneficio[texto.trim()]

@Composable
fun etiquetaNivel(nivel: String?, nombreRespaldo: String? = null): String {
    val recurso = recursoDeNivel(nivel)
    return when {
        recurso != null -> stringResource(recurso)
        !nombreRespaldo.isNullOrBlank() -> nombreRespaldo
        else -> nivel.orEmpty()
    }
}

@Composable
fun etiquetaBeneficio(texto: String): String {
    val recurso = recursoDeBeneficio(texto)
    return if (recurso != null) stringResource(recurso) else texto
}
