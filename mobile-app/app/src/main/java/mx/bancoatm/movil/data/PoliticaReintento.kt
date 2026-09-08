package mx.bancoatm.movil.data

object PoliticaReintento {

    const val INTENTOS_MAXIMOS = 3

    private const val ESPERA_BASE_MS = 800L
    private const val ESPERA_MAXIMA_MS = 4000L

    private val tiposReintentables = setOf(TipoError.SIN_RED, TipoError.SERVIDOR)

    fun esMetodoIdempotente(metodo: String): Boolean = metodo == "GET"

    fun debeReintentar(metodo: String, tipo: TipoError, intento: Int): Boolean {
        if (intento < 1 || intento >= INTENTOS_MAXIMOS) {
            return false
        }
        if (!esMetodoIdempotente(metodo)) {
            return false
        }
        return tipo in tiposReintentables
    }

    fun esperaMs(intento: Int): Long {
        if (intento < 1) {
            return 0L
        }
        val factor = 1L shl (intento - 1)
        return minOf(ESPERA_BASE_MS * factor, ESPERA_MAXIMA_MS)
    }
}
