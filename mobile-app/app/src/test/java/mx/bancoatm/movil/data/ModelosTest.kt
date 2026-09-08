package mx.bancoatm.movil.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ModelosTest {

    @Test
    fun `una cuenta completa se convierte en su modelo`() {
        val cuenta = JSONObject(
            """
            {
              "id": "cuenta-1",
              "numeroCuenta": "2090520615",
              "numeroCuentaEnmascarado": "****0615",
              "saldo": 31898.0,
              "titular": "John Connor"
            }
            """,
        ).aCuenta()

        assertEquals("cuenta-1", cuenta.id)
        assertEquals("2090520615", cuenta.numeroCuenta)
        assertEquals("****0615", cuenta.numeroCuentaEnmascarado)
        assertEquals(31898.0, cuenta.saldo, 0.001)
        assertEquals("John Connor", cuenta.titular)
    }

    @Test
    fun `una cuenta sin titular no rompe la conversion`() {
        val cuenta = JSONObject("""{"id":"cuenta-1","titular":null}""").aCuenta()

        assertNull(cuenta.titular)
        assertEquals(0.0, cuenta.saldo, 0.001)
        assertEquals("", cuenta.numeroCuenta)
    }

    @Test
    fun `un movimiento conserva el signo y el canal de origen`() {
        val movimiento = JSONObject(
            """
            {
              "id": "mov-1",
              "tipo": "TRANSFERENCIA",
              "estado": "EXITOSA",
              "canal": "APP",
              "monto": 500.0,
              "signo": "CARGO",
              "contraparte": "****0002",
              "fecha": "2026-09-02T21:08:00"
            }
            """,
        ).aMovimiento()

        assertEquals("TRANSFERENCIA", movimiento.tipo)
        assertEquals("APP", movimiento.canal)
        assertEquals("CARGO", movimiento.signo)
        assertEquals("****0002", movimiento.contraparte)
        assertEquals(500.0, movimiento.monto, 0.001)
    }

    @Test
    fun `un movimiento sin signo se trata como cargo`() {
        val movimiento = JSONObject("""{"id":"mov-1"}""").aMovimiento()

        assertEquals("CARGO", movimiento.signo)
        assertNull(movimiento.descripcion)
    }

    @Test
    fun `una tarjeta de credito conserva sus importes`() {
        val tarjeta = JSONObject(
            """
            {
              "id": "tar-1",
              "numeroTarjeta": "**** **** **** 6301",
              "tipo": "CREDITO",
              "estado": "ACTIVA",
              "titular": "John Connor",
              "limiteCredito": 12000.0,
              "creditoUtilizado": 0.0,
              "creditoDisponible": 12000.0
            }
            """,
        ).aTarjeta()

        assertEquals("CREDITO", tarjeta.tipo)
        assertEquals("ACTIVA", tarjeta.estado)
        assertEquals(12000.0, tarjeta.limiteCredito!!, 0.001)
        assertEquals(12000.0, tarjeta.creditoDisponible!!, 0.001)
    }

    @Test
    fun `una tarjeta de debito no declara importes de credito`() {
        val tarjeta = JSONObject(
            """{"id":"tar-2","tipo":"DEBITO","estado":"ACTIVA"}""",
        ).aTarjeta()

        assertNull(tarjeta.limiteCredito)
        assertNull(tarjeta.creditoDisponible)
        assertNull(tarjeta.nivel)
    }

    @Test
    fun `el nivel de la tarjeta acepta ambos nombres del backend`() {
        assertEquals(
            "Oro",
            JSONObject("""{"id":"t","nombreNivel":"Oro","nivel":"ORO"}""").aTarjeta().nivel,
        )
        assertEquals(
            "ORO",
            JSONObject("""{"id":"t","nivel":"ORO"}""").aTarjeta().nivel,
        )
    }

    @Test
    fun `un prestamo conserva el capital pendiente y su estado`() {
        val prestamo = JSONObject(
            """
            {
              "id": "pre-1",
              "monto": 5000.0,
              "plazoMeses": 12,
              "tasaAnual": 0.18,
              "pagoMensual": 472.8,
              "totalAPagar": 5673.6,
              "estado": "APROBADO",
              "capitalPendiente": 5000.0,
              "totalPagado": 0.0,
              "pagosRealizados": 0,
              "creadoEn": "2026-09-02T21:10:00"
            }
            """,
        ).aPrestamo()

        assertEquals("APROBADO", prestamo.estado)
        assertEquals(12, prestamo.plazoMeses)
        assertEquals(472.8, prestamo.pagoMensual, 0.001)
        assertEquals(5000.0, prestamo.capitalPendiente, 0.001)
    }

    @Test
    fun `el resumen de apartados incluye la lista de apartados`() {
        val resumen = JSONObject(
            """
            {
              "saldoDisponible": 34600.0,
              "totalApartado": 1800.0,
              "totalCuenta": 36400.0,
              "maximoApartados": 8,
              "apartados": [
                {"id":"ap-1","nombre":"hola","monto":1800.0,"metaMonto":2000.0,
                 "progreso":90,"icono":"ahorro"}
              ]
            }
            """,
        ).aResumenApartados()

        assertEquals(34600.0, resumen.saldoDisponible, 0.001)
        assertEquals(1800.0, resumen.totalApartado, 0.001)
        assertEquals(1, resumen.apartados.size)
        assertEquals("hola", resumen.apartados[0].nombre)
        assertEquals(90, resumen.apartados[0].progreso)
    }

    @Test
    fun `un resumen sin apartados devuelve una lista vacia`() {
        val resumen = JSONObject("""{"saldoDisponible":100.0}""").aResumenApartados()

        assertTrue(resumen.apartados.isEmpty())
        assertEquals(8, resumen.maximoApartados)
    }

    @Test
    fun `un apartado sin meta no declara progreso`() {
        val apartado = JSONObject("""{"id":"ap-2","nombre":"viaje","monto":50.0}""").aApartado()

        assertNull(apartado.metaMonto)
        assertNull(apartado.progreso)
        assertEquals("ahorro", apartado.icono)
    }

    @Test
    fun `un comprobante conserva folio y saldo resultante`() {
        val comprobante = JSONObject(
            """
            {
              "id": "trx-1",
              "folio": "TRX-D83BC64DD5",
              "tipo": "TRANSFERENCIA",
              "estado": "EXITOSA",
              "monto": 100.0,
              "cuentaDestino": "****0002",
              "saldoResultante": 31798.0,
              "fecha": "2026-09-02T21:08:00"
            }
            """,
        ).aComprobante()

        assertEquals("TRX-D83BC64DD5", comprobante.folio)
        assertEquals(31798.0, comprobante.saldoResultante!!, 0.001)
        assertEquals("****0002", comprobante.cuentaDestino)
        assertNull(comprobante.descripcion)
    }

    @Test
    fun `un proveedor conserva los limites de importe`() {
        val proveedor = JSONObject(
            """
            {
              "codigo": "AGUA",
              "nombre": "Servicio Municipal de Agua",
              "categoria": "SERVICIOS",
              "montoMinimo": 50.0,
              "montoMaximo": 8000.0,
              "longitudReferencia": 10
            }
            """,
        ).aProveedor()

        assertEquals("AGUA", proveedor.codigo)
        assertEquals(50.0, proveedor.montoMinimo, 0.001)
        assertEquals(8000.0, proveedor.montoMaximo, 0.001)
        assertEquals(10, proveedor.longitudReferencia)
    }

    @Test
    fun `una notificacion sin leer se marca como no leida`() {
        val notificacion = JSONObject(
            """{"id":"n-1","mensaje":"Recibio una transferencia","creadaEn":"2026-09-02T11:38:00"}""",
        ).aNotificacion()

        assertEquals("GENERAL", notificacion.categoria)
        assertEquals(false, notificacion.leida)
    }

    @Test
    fun `el perfil devuelve el rol declarado por el backend`() {
        val perfil = JSONObject(
            """{"nombreCompleto":"John Connor","correo":"j@c.test","rol":"CLIENTE"}""",
        ).aPerfil()

        assertEquals("CLIENTE", perfil.rol)
        assertNull(perfil.telefono)
    }

    @Test
    fun `la respuesta del asistente descarta sugerencias vacias`() {
        val respuesta = JSONObject(
            """{"respuesta":"Su saldo es 100","sugerencias":["Ver movimientos","","  "]}""",
        ).aRespuestaAsistente()

        assertEquals("Su saldo es 100", respuesta.respuesta)
        assertEquals(listOf("Ver movimientos"), respuesta.sugerencias)
    }
}
