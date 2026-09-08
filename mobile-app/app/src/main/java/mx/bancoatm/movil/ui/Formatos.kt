package mx.bancoatm.movil.ui

import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Currency
import java.util.Locale
import java.util.TimeZone

private const val MONEDA = "MXN"
private const val PATRON_ENTRADA = "yyyy-MM-dd'T'HH:mm:ss"
private const val PATRON_SALIDA_EN = "MMM d, yyyy · HH:mm"
private const val PATRON_SALIDA_ES = "d MMM yyyy · HH:mm"

fun localeDe(idioma: String): Locale =
    if (idioma == "en") Locale("en", "US") else Locale("es", "MX")

fun formatearMoneda(valor: Double, idioma: String): String {
    val formato = NumberFormat.getCurrencyInstance(localeDe(idioma))
    formato.currency = Currency.getInstance(MONEDA)
    return formato.format(valor)
}

fun formatearFecha(iso: String, idioma: String): String {
    if (iso.isBlank()) {
        return ""
    }
    return try {
        val entrada = SimpleDateFormat(PATRON_ENTRADA, Locale.US)
        entrada.timeZone = TimeZone.getTimeZone("UTC")
        val fecha = entrada.parse(iso.take(19)) ?: return iso
        val patron = if (idioma == "en") PATRON_SALIDA_EN else PATRON_SALIDA_ES
        SimpleDateFormat(patron, localeDe(idioma)).format(fecha)
    } catch (error: Exception) {
        iso
    }
}
