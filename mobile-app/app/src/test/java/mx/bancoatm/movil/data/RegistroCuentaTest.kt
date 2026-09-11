package mx.bancoatm.movil.data

import org.json.JSONObject
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RegistroCuentaTest {

    @Test
    fun `una cuenta activa ya registrada se detecta como existente`() {
        val respuesta = JSONObject(
            """{"registrado":false,"correo":"smmy627@gmail.com","estadoCuenta":"ACTIVA"}""",
        )

        assertTrue(cuentaYaExiste(respuesta))
    }

    @Test
    fun `un registro pendiente de verificacion no se trata como cuenta existente`() {
        val respuesta = JSONObject(
            """{"registrado":true,"correo":"nuevo@bancoatm.test","estadoCuenta":"PENDIENTE"}""",
        )

        assertFalse(cuentaYaExiste(respuesta))
    }

    @Test
    fun `una respuesta sin estado de cuenta no se trata como cuenta existente`() {
        assertFalse(cuentaYaExiste(JSONObject("""{"registrado":true}""")))
    }

    @Test
    fun `una cuenta activa marcada como registrada no interrumpe el alta`() {
        val respuesta = JSONObject("""{"registrado":true,"estadoCuenta":"ACTIVA"}""")

        assertFalse(cuentaYaExiste(respuesta))
    }
}
