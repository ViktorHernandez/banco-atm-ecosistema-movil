package mx.bancoatm.movil.data

interface ContextoSesion {
    fun urlBase(): String
    fun token(): String?
    fun idioma(): String
    fun invalidar()
}
