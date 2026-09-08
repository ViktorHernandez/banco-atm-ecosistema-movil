package mx.bancoatm.movil.ui

import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FormatosTest {

    @Test
    fun `el idioma seleccionado determina el locale`() {
        assertEquals(Locale("es", "MX"), localeDe("es"))
        assertEquals(Locale("en", "US"), localeDe("en"))
    }

    @Test
    fun `un idioma desconocido usa espanol de Mexico`() {
        assertEquals(Locale("es", "MX"), localeDe("fr"))
        assertEquals(Locale("es", "MX"), localeDe(""))
    }

    @Test
    fun `el importe se formatea con separador de miles y dos decimales`() {
        val importe = formatearMoneda(31898.0, "es")

        assertTrue(importe.contains("31,898.00"))
    }

    @Test
    fun `los decimales del importe se conservan`() {
        assertTrue(formatearMoneda(1500.5, "es").contains("1,500.50"))
        assertTrue(formatearMoneda(0.0, "es").contains("0.00"))
    }

    @Test
    fun `el importe se presenta distinto en cada idioma`() {
        assertNotEquals(formatearMoneda(35400.0, "es"), formatearMoneda(35400.0, "en"))
        assertTrue(formatearMoneda(35400.0, "en").contains("35,400.00"))
    }

    @Test
    fun `un importe negativo conserva el valor absoluto en el texto`() {
        assertTrue(formatearMoneda(-500.0, "es").contains("500.00"))
    }

    @Test
    fun `una fecha vacia devuelve una cadena vacia`() {
        assertEquals("", formatearFecha("", "es"))
        assertEquals("", formatearFecha("   ", "es"))
    }

    @Test
    fun `una fecha ilegible se devuelve sin transformar`() {
        assertEquals("no es una fecha", formatearFecha("no es una fecha", "es"))
    }

    @Test
    fun `una fecha valida se transforma y conserva el ano`() {
        val formateada = formatearFecha("2026-09-02T21:08:00", "es")

        assertTrue(formateada.contains("2026"))
        assertNotEquals("2026-09-02T21:08:00", formateada)
    }

    @Test
    fun `una fecha con milisegundos y zona se acepta`() {
        val formateada = formatearFecha("2026-09-02T21:08:00.123Z", "es")

        assertTrue(formateada.contains("2026"))
    }

    @Test
    fun `la fecha se presenta distinto en cada idioma`() {
        val espanol = formatearFecha("2026-09-02T21:08:00", "es")
        val ingles = formatearFecha("2026-09-02T21:08:00", "en")

        assertNotEquals(espanol, ingles)
    }
}
