package mx.bancoatm.movil.data

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class TarjetasCreditoTest {

    private lateinit var servidor: MockWebServer
    private lateinit var sesion: ContextoSesionFalso
    private lateinit var api: ClienteApi

    private val catalogoConClasicaContratada = """
        {
          "saldoActual": 35400.0,
          "nivelRecomendado": "ORO",
          "tarjetasContratadas": 1,
          "maximoTarjetas": 3,
          "niveles": [
            {"nivel":"CLASICA","nombre":"Clásica","saldoMinimo":3000,"anualidad":0,
             "lineaMaxima":15000,"alcanzaRequisito":true,"faltante":0,"lineaEstimada":15000,
             "recomendada":false,"yaContratada":true,
             "beneficios":["Sin anualidad el primer año","Hasta 45 días sin intereses"]},
            {"nivel":"ORO","nombre":"Oro","saldoMinimo":15000,"anualidad":900,
             "lineaMaxima":60000,"alcanzaRequisito":true,"faltante":0,"lineaEstimada":60000,
             "recomendada":true,"yaContratada":false,
             "beneficios":["Todo lo de la Clásica","2 % de bonificación en supermercado y gasolina",
                           "Seguro de viaje para el titular"]},
            {"nivel":"PLATINO","nombre":"Platino","saldoMinimo":50000,"anualidad":2400,
             "lineaMaxima":200000,"alcanzaRequisito":false,"faltante":14600,"lineaEstimada":null,
             "recomendada":false,"yaContratada":false,
             "beneficios":["Todo lo de la Oro"]},
            {"nivel":"INFINITE","nombre":"Infinite","saldoMinimo":150000,"anualidad":6500,
             "lineaMaxima":750000,"alcanzaRequisito":false,"faltante":114600,"lineaEstimada":null,
             "recomendada":false,"yaContratada":false,
             "beneficios":["Todo lo de la Platino"]}
          ]
        }
    """

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        sesion = ContextoSesionFalso(servidor.url("/").toString().trimEnd('/'))
        api = ClienteApi(sesion)
    }

    @After
    fun cerrar() {
        servidor.shutdown()
    }

    private fun responder(codigo: Int, cuerpo: String) {
        servidor.enqueue(
            MockResponse()
                .setResponseCode(codigo)
                .setHeader("Content-Type", "application/json")
                .setBody(cuerpo),
        )
    }

    private suspend fun catalogoCredito(): Resultado<CatalogoCredito> =
        when (val r = api.obtenerObjeto(RUTA_CATALOGO_CREDITO)) {
            is Resultado.Exito -> Resultado.Exito(r.datos.aCatalogoCredito())
            is Resultado.Fallo -> r
        }

    private suspend fun solicitarCredito(nivel: String?): Resultado<SolicitudCredito> =
        when (
            val r = api.publicar(RUTA_SOLICITAR_CREDITO, cuerpoSolicitudCredito(nivel))
        ) {
            is Resultado.Exito -> Resultado.Exito(r.datos.aSolicitudCredito())
            is Resultado.Fallo -> r
        }

    private suspend fun tarjetas(): Resultado<List<Tarjeta>> =
        when (val r = api.obtenerLista("/cards/me/todas")) {
            is Resultado.Exito -> Resultado.Exito(
                (0 until r.datos.length()).map { r.datos.getJSONObject(it).aTarjeta() },
            )
            is Resultado.Fallo -> r
        }

    @Test
    fun `una cuenta con Clasica contratada puede solicitar Oro`() = runTest {
        responder(200, catalogoConClasicaContratada)

        val catalogo = (catalogoCredito() as Resultado.Exito).datos

        assertEquals("ORO", catalogo.nivelRecomendado)
        assertTrue(catalogo.hayCupo)
        assertEquals(listOf("ORO"), catalogo.solicitables.map { it.nivel })
    }

    @Test
    fun `el nivel ya contratado no aparece como solicitable`() = runTest {
        responder(200, catalogoConClasicaContratada)

        val catalogo = (catalogoCredito() as Resultado.Exito).datos
        val clasica = catalogo.niveles.first { it.nivel == "CLASICA" }

        assertTrue(clasica.yaContratada)
        assertTrue(clasica.alcanzaRequisito)
        assertFalse(clasica.solicitable)
    }

    @Test
    fun `un nivel fuera de alcance no es solicitable y declara el faltante`() = runTest {
        responder(200, catalogoConClasicaContratada)

        val catalogo = (catalogoCredito() as Resultado.Exito).datos
        val platino = catalogo.niveles.first { it.nivel == "PLATINO" }

        assertFalse(platino.alcanzaRequisito)
        assertFalse(platino.solicitable)
        assertEquals(14600.0, platino.faltante, 0.001)
        assertNull(platino.lineaEstimada)
    }

    @Test
    fun `el catalogo conserva los beneficios y los importes del backend`() = runTest {
        responder(200, catalogoConClasicaContratada)

        val oro = (catalogoCredito() as Resultado.Exito).datos
            .niveles.first { it.nivel == "ORO" }

        assertEquals(15000.0, oro.saldoMinimo, 0.001)
        assertEquals(900.0, oro.anualidad, 0.001)
        assertEquals(60000.0, oro.lineaEstimada!!, 0.001)
        assertTrue(oro.recomendada)
        assertEquals(3, oro.beneficios.size)
        assertTrue(oro.beneficios.contains("Seguro de viaje para el titular"))
    }

    @Test
    fun `sin cupo disponible el catalogo lo indica`() = runTest {
        responder(
            200,
            """{"saldoActual":35400.0,"tarjetasContratadas":3,"maximoTarjetas":3,"niveles":[]}""",
        )

        val catalogo = (catalogoCredito() as Resultado.Exito).datos

        assertFalse(catalogo.hayCupo)
        assertTrue(catalogo.solicitables.isEmpty())
    }

    @Test
    fun `la solicitud envia el nivel elegido al backend`() = runTest {
        responder(201, """{"aprobada":true,"mensaje":"Aprobada","tarjeta":{"id":"t1"}}""")

        solicitarCredito("ORO")

        val peticion = servidor.takeRequest()
        assertEquals("POST", peticion.method)
        assertEquals("/cards/credito/solicitar", peticion.path)
        assertEquals("ORO", JSONObject(peticion.body.readUtf8()).getString("nivel"))
    }

    @Test
    fun `sin nivel la solicitud deja que el backend elija`() = runTest {
        responder(201, """{"aprobada":true,"mensaje":"Aprobada","tarjeta":{"id":"t1"}}""")

        solicitarCredito(null)

        val cuerpo = JSONObject(servidor.takeRequest().body.readUtf8())
        assertFalse(cuerpo.has("nivel"))
    }

    @Test
    fun `una solicitud aprobada devuelve la tarjeta y sus beneficios`() = runTest {
        responder(
            201,
            """
            {
              "aprobada": true,
              "mensaje": "Tarjeta de crédito Oro aprobada con una línea de 60000.00.",
              "tarjeta": {
                "id":"tar-oro","numeroTarjeta":"**** **** **** 6301","tipo":"CREDITO",
                "nivel":"ORO","nombreNivel":"Oro","estado":"ACTIVA","limiteCredito":60000.0,
                "creditoUtilizado":0.0,"creditoDisponible":60000.0,"anualidad":900.0,
                "beneficios":["Todo lo de la Clásica","Seguro de viaje para el titular"]
              }
            }
            """,
        )

        val solicitud = (solicitarCredito("ORO") as Resultado.Exito).datos

        assertTrue(solicitud.aprobada)
        assertNotNull(solicitud.tarjeta)
        assertEquals("Oro", solicitud.tarjeta!!.nivel)
        assertEquals(900.0, solicitud.tarjeta!!.anualidad!!, 0.001)
        assertEquals(2, solicitud.tarjeta!!.beneficios.size)
    }

    @Test
    fun `una solicitud no aprobada conserva el estado real del servidor`() = runTest {
        responder(201, """{"aprobada":false,"mensaje":"Solicitud en revisión."}""")

        val solicitud = (solicitarCredito("ORO") as Resultado.Exito).datos

        assertFalse(solicitud.aprobada)
        assertEquals("Solicitud en revisión.", solicitud.mensaje)
        assertNull(solicitud.tarjeta)
    }

    @Test
    fun `un 409 por nivel ya contratado se conserva como conflicto con su mensaje`() = runTest {
        responder(409, """{"mensaje":"Ya cuenta con una tarjeta de crédito Clásica."}""")

        val resultado = solicitarCredito("CLASICA")

        val fallo = resultado as Resultado.Fallo
        assertEquals(TipoError.CONFLICTO, fallo.error.tipo)
        assertEquals("Ya cuenta con una tarjeta de crédito Clásica.", fallo.error.mensaje)
    }

    @Test
    fun `un 409 por liquidez insuficiente conserva el mensaje del backend`() = runTest {
        responder(
            409,
            """{"mensaje":"Solicitud rechazada por liquidez insuficiente."}""",
        )

        val fallo = solicitarCredito("PLATINO") as Resultado.Fallo

        assertEquals(TipoError.CONFLICTO, fallo.error.tipo)
        assertTrue(fallo.error.mensaje.contains("liquidez insuficiente"))
    }

    @Test
    fun `un 409 no se reintenta porque la solicitud es una escritura`() = runTest {
        responder(409, """{"mensaje":"Ya cuenta con una tarjeta de crédito Clásica."}""")

        solicitarCredito("CLASICA")

        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `las tarjetas del usuario conservan nivel beneficios y anualidad`() = runTest {
        responder(
            200,
            """
            [
              {"id":"t1","numeroTarjeta":"**** **** **** 4979","tipo":"DEBITO",
               "estado":"ACTIVA","beneficios":[]},
              {"id":"t2","numeroTarjeta":"**** **** **** 6301","tipo":"CREDITO",
               "nivel":"CLASICA","nombreNivel":"Clásica","estado":"ACTIVA",
               "limiteCredito":15000.0,"creditoDisponible":15000.0,"anualidad":0.0,
               "beneficios":["Sin anualidad el primer año","Hasta 45 días sin intereses"]}
            ]
            """,
        )

        val tarjetas = (tarjetas() as Resultado.Exito).datos

        assertEquals(2, tarjetas.size)
        assertTrue(tarjetas[0].beneficios.isEmpty())
        assertEquals("Clásica", tarjetas[1].nivel)
        assertEquals(2, tarjetas[1].beneficios.size)
        assertEquals(0.0, tarjetas[1].anualidad!!, 0.001)
    }

    @Test
    fun `la consulta del catalogo viaja autenticada`() = runTest {
        responder(200, catalogoConClasicaContratada)

        catalogoCredito()

        val peticion = servidor.takeRequest()
        assertEquals("/cards/credito/catalogo", peticion.path)
        assertEquals("Bearer token-de-prueba", peticion.getHeader("Authorization"))
    }

    @Test
    fun `sin token la solicitud no llega al servidor`() = runTest {
        val sinSesion = ClienteApi(
            ContextoSesionFalso(servidor.url("/").toString(), null),
        )

        val fallo = sinSesion.publicar(
            RUTA_SOLICITAR_CREDITO,
            cuerpoSolicitudCredito("ORO"),
        ) as Resultado.Fallo

        assertEquals(TipoError.SESION_EXPIRADA, fallo.error.tipo)
        assertEquals(0, servidor.requestCount)
    }
}
