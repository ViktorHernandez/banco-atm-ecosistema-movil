package mx.bancoatm.movil.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RolAdminTest {

    @Test
    fun `el perfil conserva el rol administrador que devuelve el backend`() {
        val perfil = JSONObject(
            """{"nombreCompleto":"Rodrigo Alcántara","correo":"a@b.test","rol":"ADMINISTRADOR"}""",
        ).aPerfil()

        assertEquals("ADMINISTRADOR", perfil.rol)
    }

    @Test
    fun `el perfil de un cliente conserva el rol cliente`() {
        val perfil = JSONObject(
            """{"nombreCompleto":"Wade Wilson","correo":"c@d.test","rol":"CLIENTE"}""",
        ).aPerfil()

        assertEquals("CLIENTE", perfil.rol)
    }

    @Test
    fun `una respuesta sin rol se trata como cliente`() {
        val perfil = JSONObject("""{"nombreCompleto":"Sin rol","correo":"e@f.test"}""").aPerfil()

        assertEquals("CLIENTE", perfil.rol)
    }

    @Test
    fun `el resumen administrativo lee los totales del backend`() {
        val resumen = JSONObject(
            """{"totales":{"usuarios":10,"cuentas":9,"transaccionesAnalizadas":137,
               "exitosas":133,"fallidas":4,"montoOperado":1888924.28},
               "porCanal":{"APP":78,"ATM":38,"WEB":21},"ultimasOperaciones":[]}""",
        ).aResumenAdministrativo()

        assertEquals(10, resumen.usuarios)
        assertEquals(9, resumen.cuentas)
        assertEquals(133, resumen.exitosas)
        assertEquals(4, resumen.fallidas)
        assertEquals(1888924.28, resumen.montoOperado, 0.001)
    }

    @Test
    fun `los canales se ordenan de mayor a menor`() {
        val resumen = JSONObject(
            """{"totales":{},"porCanal":{"WEB":21,"APP":78,"ATM":38},"ultimasOperaciones":[]}""",
        ).aResumenAdministrativo()

        assertEquals(listOf("APP", "ATM", "WEB"), resumen.porCanal.map { it.first })
        assertEquals(78, resumen.porCanal.first().second)
    }

    @Test
    fun `las ultimas operaciones conservan canal estado y monto`() {
        val resumen = JSONObject(
            """{"totales":{},"porCanal":{},"ultimasOperaciones":[
               {"tipo":"DEPOSITO","estado":"EXITOSA","canal":"APP","monto":20000.0,
                "origen":null,"destino":"****5069","fecha":"2026-09-18T10:47:00.000Z"}]}""",
        ).aResumenAdministrativo()

        val operacion = resumen.ultimasOperaciones.single()
        assertEquals("APP", operacion.canal)
        assertEquals("EXITOSA", operacion.estado)
        assertEquals(20000.0, operacion.monto, 0.001)
        assertEquals("****5069", operacion.destino)
        assertEquals(null, operacion.origen)
    }

    @Test
    fun `un resumen vacio no produce fallos`() {
        val resumen = JSONObject("""{}""").aResumenAdministrativo()

        assertEquals(0, resumen.usuarios)
        assertTrue(resumen.porCanal.isEmpty())
        assertTrue(resumen.ultimasOperaciones.isEmpty())
    }

    @Test
    fun `la ruta del reporte administrativo es la del backend`() {
        assertEquals("/admin/reportes/operaciones", RUTA_REPORTE_ADMIN)
        assertFalse(RUTA_REPORTE_ADMIN.contains("{"))
    }
}
