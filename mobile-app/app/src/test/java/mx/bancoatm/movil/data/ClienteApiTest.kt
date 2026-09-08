package mx.bancoatm.movil.data

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ContextoSesionFalso(
    private var base: String,
    private var tokenActual: String? = "token-de-prueba",
    private val idiomaActual: String = "es",
) : ContextoSesion {

    var invalidaciones = 0
        private set

    override fun urlBase(): String = base.trimEnd('/')

    override fun token(): String? = tokenActual

    override fun idioma(): String = idiomaActual

    override fun invalidar() {
        tokenActual = null
        invalidaciones += 1
    }
}

class ClienteApiTest {

    private lateinit var servidor: MockWebServer
    private lateinit var sesion: ContextoSesionFalso
    private lateinit var api: ClienteApi

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        sesion = ContextoSesionFalso(servidor.url("/").toString())
        api = ClienteApi(sesion)
    }

    @After
    fun cerrar() {
        servidor.shutdown()
    }

    @Test
    fun `una respuesta correcta devuelve el objeto convertido`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(200).setBody("""{"saldo":1500.5}"""),
        )

        val resultado = api.obtenerObjeto("/accounts/me/saldo")

        assertTrue(resultado is Resultado.Exito)
        assertEquals(1500.5, (resultado as Resultado.Exito).datos.getDouble("saldo"), 0.001)
    }

    @Test
    fun `las peticiones autenticadas envian el token y el idioma`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("{}"))

        api.obtenerObjeto("/accounts/me")

        val peticion = servidor.takeRequest()
        assertEquals("Bearer token-de-prueba", peticion.getHeader("Authorization"))
        assertEquals("es", peticion.getHeader("Accept-Language"))
        assertEquals("application/json", peticion.getHeader("Accept"))
        assertEquals("/accounts/me", peticion.path)
    }

    @Test
    fun `sin token la peticion autenticada no llega al servidor`() = runTest {
        val sinToken = ContextoSesionFalso(servidor.url("/").toString(), tokenActual = null)
        val cliente = ClienteApi(sinToken)

        val resultado = cliente.obtenerObjeto("/accounts/me")

        assertTrue(resultado is Resultado.Fallo)
        assertEquals(TipoError.SESION_EXPIRADA, (resultado as Resultado.Fallo).error.tipo)
        assertEquals(0, servidor.requestCount)
    }

    @Test
    fun `una respuesta 401 invalida la sesion`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(401).setBody("""{"mensaje":"Token vencido"}"""),
        )

        val resultado = api.obtenerObjeto("/accounts/me")

        assertTrue(resultado is Resultado.Fallo)
        assertEquals(TipoError.SESION_EXPIRADA, (resultado as Resultado.Fallo).error.tipo)
        assertEquals(1, sesion.invalidaciones)
        assertEquals(null, sesion.token())
    }

    @Test
    fun `una respuesta publica con 401 no invalida la sesion`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(401).setBody("{}"))

        api.publicar("/auth/login", null, autenticado = false)

        assertEquals(0, sesion.invalidaciones)
    }

    @Test
    fun `un 400 conserva el mensaje del backend`() = runTest {
        servidor.enqueue(
            MockResponse()
                .setResponseCode(400)
                .setBody("""{"mensaje":"Saldo insuficiente"}"""),
        )

        val resultado = api.publicar("/transactions/retiro")

        assertTrue(resultado is Resultado.Fallo)
        val error = (resultado as Resultado.Fallo).error
        assertEquals(TipoError.SOLICITUD_INVALIDA, error.tipo)
        assertEquals("Saldo insuficiente", error.mensaje)
    }

    @Test
    fun `un 400 con lista de mensajes de validacion los concatena`() = runTest {
        servidor.enqueue(
            MockResponse()
                .setResponseCode(400)
                .setBody("""{"message":["El monto es obligatorio","La cuenta no existe"]}"""),
        )

        val resultado = api.publicar("/transactions/transferencia")

        val error = (resultado as Resultado.Fallo).error
        assertEquals("El monto es obligatorio La cuenta no existe", error.mensaje)
    }

    @Test
    fun `los codigos de estado se clasifican en el tipo correspondiente`() = runTest {
        val esperados = mapOf(
            403 to TipoError.NO_AUTORIZADO,
            404 to TipoError.NO_ENCONTRADO,
            409 to TipoError.CONFLICTO,
            418 to TipoError.DESCONOCIDO,
        )

        esperados.forEach { (codigo, tipo) ->
            servidor.enqueue(MockResponse().setResponseCode(codigo).setBody("{}"))
            val resultado = api.publicar("/prueba")
            assertEquals(tipo, (resultado as Resultado.Fallo).error.tipo)
        }
    }

    @Test
    fun `una respuesta ilegible se reporta como error desconocido`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("no es json"))

        val resultado = api.obtenerObjeto("/accounts/me")

        assertTrue(resultado is Resultado.Fallo)
        assertEquals(TipoError.DESCONOCIDO, (resultado as Resultado.Fallo).error.tipo)
    }

    @Test
    fun `una lista vacia se convierte sin error`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("[]"))

        val resultado = api.obtenerLista("/accounts/me/movimientos")

        assertTrue(resultado is Resultado.Exito)
        assertEquals(0, (resultado as Resultado.Exito).datos.length())
    }

    @Test
    fun `una lectura con error de servidor se reintenta hasta el maximo`() = runTest {
        repeat(PoliticaReintento.INTENTOS_MAXIMOS) {
            servidor.enqueue(MockResponse().setResponseCode(500).setBody("{}"))
        }

        val resultado = api.obtenerObjeto("/accounts/me")

        assertTrue(resultado is Resultado.Fallo)
        assertEquals(TipoError.SERVIDOR, (resultado as Resultado.Fallo).error.tipo)
        assertEquals(PoliticaReintento.INTENTOS_MAXIMOS, servidor.requestCount)
    }

    @Test
    fun `una lectura se recupera si el reintento tiene exito`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(503).setBody("{}"))
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("""{"saldo":10}"""))

        val resultado = api.obtenerObjeto("/accounts/me/saldo")

        assertTrue(resultado is Resultado.Exito)
        assertEquals(2, servidor.requestCount)
    }

    @Test
    fun `una operacion que mueve dinero nunca se reintenta`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(500).setBody("{}"))

        val resultado = api.publicar("/transactions/transferencia")

        assertTrue(resultado is Resultado.Fallo)
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun `un corte de conexion en una escritura no se repite`() = runTest {
        servidor.enqueue(
            MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START),
        )

        val resultado = api.publicar("/transactions/deposito")

        assertTrue(resultado is Resultado.Fallo)
        assertEquals(TipoError.SIN_RED, (resultado as Resultado.Fallo).error.tipo)
    }

    @Test
    fun `el metodo http enviado corresponde a la operacion solicitada`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("{}"))
        api.eliminar("/pockets/1")
        assertEquals("DELETE", servidor.takeRequest().method)

        servidor.enqueue(MockResponse().setResponseCode(200).setBody("{}"))
        api.modificar("/profile/me", org.json.JSONObject().put("nombreCompleto", "Ana"))
        val patch = servidor.takeRequest()
        assertEquals("PATCH", patch.method)
        assertTrue(patch.body.readUtf8().contains("Ana"))
    }

    @Test
    fun `la invalidacion por 401 solo ocurre una vez por peticion`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(401).setBody("{}"))

        api.obtenerObjeto("/accounts/me")

        assertEquals(1, servidor.requestCount)
        assertFalse(sesion.invalidaciones > 1)
    }
}
