package mx.bancoatm.movil.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PoliticaReintentoTest {

    @Test
    fun `reintenta una lectura cuando no hay red`() {
        assertTrue(PoliticaReintento.debeReintentar("GET", TipoError.SIN_RED, 1))
        assertTrue(PoliticaReintento.debeReintentar("GET", TipoError.SIN_RED, 2))
    }

    @Test
    fun `reintenta una lectura ante un fallo del servidor`() {
        assertTrue(PoliticaReintento.debeReintentar("GET", TipoError.SERVIDOR, 1))
    }

    @Test
    fun `nunca reintenta operaciones que mueven dinero`() {
        assertFalse(PoliticaReintento.debeReintentar("POST", TipoError.SIN_RED, 1))
        assertFalse(PoliticaReintento.debeReintentar("POST", TipoError.SERVIDOR, 1))
        assertFalse(PoliticaReintento.debeReintentar("PATCH", TipoError.SIN_RED, 1))
        assertFalse(PoliticaReintento.debeReintentar("DELETE", TipoError.SIN_RED, 1))
    }

    @Test
    fun `no reintenta errores que no cambian al repetir la peticion`() {
        assertFalse(PoliticaReintento.debeReintentar("GET", TipoError.SESION_EXPIRADA, 1))
        assertFalse(PoliticaReintento.debeReintentar("GET", TipoError.NO_AUTORIZADO, 1))
        assertFalse(PoliticaReintento.debeReintentar("GET", TipoError.SOLICITUD_INVALIDA, 1))
        assertFalse(PoliticaReintento.debeReintentar("GET", TipoError.NO_ENCONTRADO, 1))
        assertFalse(PoliticaReintento.debeReintentar("GET", TipoError.CONFLICTO, 1))
        assertFalse(PoliticaReintento.debeReintentar("GET", TipoError.TIEMPO_AGOTADO, 1))
    }

    @Test
    fun `se detiene al alcanzar el numero maximo de intentos`() {
        assertFalse(
            PoliticaReintento.debeReintentar(
                "GET",
                TipoError.SIN_RED,
                PoliticaReintento.INTENTOS_MAXIMOS,
            ),
        )
    }

    @Test
    fun `la espera crece de forma exponencial y esta acotada`() {
        assertEquals(0L, PoliticaReintento.esperaMs(0))
        assertEquals(800L, PoliticaReintento.esperaMs(1))
        assertEquals(1600L, PoliticaReintento.esperaMs(2))
        assertEquals(4000L, PoliticaReintento.esperaMs(10))
    }
}
