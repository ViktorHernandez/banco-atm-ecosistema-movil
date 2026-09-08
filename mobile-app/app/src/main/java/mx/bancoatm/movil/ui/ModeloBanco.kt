package mx.bancoatm.movil.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import mx.bancoatm.movil.R
import mx.bancoatm.movil.data.Apartado
import mx.bancoatm.movil.data.CatalogoCredito
import mx.bancoatm.movil.data.Comprobante
import mx.bancoatm.movil.data.Cuenta
import mx.bancoatm.movil.data.Entorno
import mx.bancoatm.movil.data.ErrorApi
import mx.bancoatm.movil.data.Movimiento
import mx.bancoatm.movil.data.Notificacion
import mx.bancoatm.movil.data.Perfil
import mx.bancoatm.movil.data.Prestamo
import mx.bancoatm.movil.data.Proveedor
import mx.bancoatm.movil.data.RepositorioBanco
import mx.bancoatm.movil.data.ResumenApartados
import mx.bancoatm.movil.data.Resultado
import mx.bancoatm.movil.data.Sesion
import mx.bancoatm.movil.data.SolicitudCredito
import mx.bancoatm.movil.data.Tarjeta
import mx.bancoatm.movil.data.TipoError
import mx.bancoatm.movil.push.RegistroPush

data class EstadoPantalla(
    val cargando: Boolean = false,
    val procesando: Boolean = false,
    val error: Int? = null,
    val errorDetalle: String? = null,
    val aviso: String? = null,
)

class ModeloBanco(
    private val repositorio: RepositorioBanco,
    val sesion: Sesion,
) : ViewModel() {

    private val _estado = MutableStateFlow(EstadoPantalla())
    val estado: StateFlow<EstadoPantalla> = _estado.asStateFlow()

    private val _cuenta = MutableStateFlow<Cuenta?>(null)
    val cuenta: StateFlow<Cuenta?> = _cuenta.asStateFlow()

    private val _movimientos = MutableStateFlow<List<Movimiento>>(emptyList())
    val movimientos: StateFlow<List<Movimiento>> = _movimientos.asStateFlow()

    private val _tarjetas = MutableStateFlow<List<Tarjeta>>(emptyList())
    val tarjetas: StateFlow<List<Tarjeta>> = _tarjetas.asStateFlow()

    private val _catalogoCredito = MutableStateFlow<CatalogoCredito?>(null)
    val catalogoCredito: StateFlow<CatalogoCredito?> = _catalogoCredito.asStateFlow()

    private val _prestamos = MutableStateFlow<List<Prestamo>>(emptyList())
    val prestamos: StateFlow<List<Prestamo>> = _prestamos.asStateFlow()

    private val _apartados = MutableStateFlow<ResumenApartados?>(null)
    val apartados: StateFlow<ResumenApartados?> = _apartados.asStateFlow()

    private val _notificaciones = MutableStateFlow<List<Notificacion>>(emptyList())
    val notificaciones: StateFlow<List<Notificacion>> = _notificaciones.asStateFlow()

    private val _noLeidas = MutableStateFlow(0)
    val noLeidas: StateFlow<Int> = _noLeidas.asStateFlow()

    private val _proveedores = MutableStateFlow<List<Proveedor>>(emptyList())
    val proveedores: StateFlow<List<Proveedor>> = _proveedores.asStateFlow()

    private val _perfil = MutableStateFlow<Perfil?>(null)
    val perfil: StateFlow<Perfil?> = _perfil.asStateFlow()

    private val _comprobante = MutableStateFlow<Comprobante?>(null)
    val comprobante: StateFlow<Comprobante?> = _comprobante.asStateFlow()

    private val _pushDisponible = MutableStateFlow(false)
    val pushDisponible: StateFlow<Boolean> = _pushDisponible.asStateFlow()

    val autenticado: StateFlow<Boolean> = sesion.autenticado
    val idioma: StateFlow<String> = sesion.idiomaFlujo
    val entorno: StateFlow<Entorno> = sesion.entornoFlujo
    val servidorLocal: StateFlow<String> = sesion.servidorLocalFlujo

    fun mensajeDe(error: ErrorApi): Int = when (error.tipo) {
        TipoError.SIN_RED -> R.string.error_sin_red
        TipoError.TIEMPO_AGOTADO -> R.string.error_tiempo
        TipoError.SESION_EXPIRADA -> R.string.error_sesion
        TipoError.NO_AUTORIZADO -> R.string.error_permiso
        TipoError.SERVIDOR -> R.string.error_servidor
        else -> R.string.error_generico
    }

    private fun detalleDe(error: ErrorApi): String? = when (error.tipo) {
        TipoError.SOLICITUD_INVALIDA,
        TipoError.CONFLICTO,
        TipoError.NO_ENCONTRADO,
        -> error.mensaje
        else -> null
    }

    private fun publicarError(error: ErrorApi) {
        _estado.value = EstadoPantalla(error = mensajeDe(error), errorDetalle = detalleDe(error))
    }

    fun limpiarEstado() {
        _estado.value = EstadoPantalla()
    }

    fun cambiarIdioma(codigo: String) {
        sesion.cambiarIdioma(codigo)
        viewModelScope.launch { sincronizarPush() }
    }

    fun cambiarEntorno(entorno: Entorno) {
        sesion.cambiarEntorno(entorno)
    }

    fun cambiarServidorLocal(url: String) {
        sesion.cambiarServidorLocal(url)
    }

    fun iniciarSesion(
        correo: String,
        password: String,
        codigoTotp: String?,
        alRequerirSegundoFactor: () -> Unit,
        alEntrar: () -> Unit,
    ) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val resultado = repositorio.iniciarSesion(correo, password, codigoTotp)) {
                is Resultado.Fallo -> publicarError(resultado.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    if (resultado.datos.optBoolean("requiereSegundoFactor", false)) {
                        alRequerirSegundoFactor()
                    } else {
                        sincronizarPush()
                        alEntrar()
                    }
                }
            }
        }
    }

    fun registrar(
        nombre: String,
        correo: String,
        telefono: String,
        password: String,
        alRegistrar: () -> Unit,
    ) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.registrar(nombre, correo, telefono, password)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    alRegistrar()
                }
            }
        }
    }

    fun verificarCorreo(correo: String, codigo: String, alVerificar: () -> Unit) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.verificarCorreo(correo, codigo)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    alVerificar()
                }
            }
        }
    }

    fun reenviarCodigo(correo: String) {
        viewModelScope.launch { repositorio.reenviarCodigo(correo) }
    }

    fun solicitarRecuperacion(correo: String, alEnviar: () -> Unit) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.solicitarRecuperacion(correo)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    alEnviar()
                }
            }
        }
    }

    fun restablecerPassword(
        correo: String,
        codigo: String,
        password: String,
        alRestablecer: () -> Unit,
    ) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.restablecerPassword(correo, codigo, password)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    alRestablecer()
                }
            }
        }
    }

    fun cerrarSesion(alSalir: () -> Unit) {
        viewModelScope.launch {
            repositorio.cerrarSesion()
            _cuenta.value = null
            _movimientos.value = emptyList()
            _tarjetas.value = emptyList()
            _prestamos.value = emptyList()
            _apartados.value = null
            _notificaciones.value = emptyList()
            _perfil.value = null
            _noLeidas.value = 0
            alSalir()
        }
    }

    suspend fun sincronizarPush() {
        RegistroPush.sincronizar(sesion, repositorio)
        when (val r = repositorio.estadoPush()) {
            is Resultado.Exito -> _pushDisponible.value =
                r.datos.optBoolean("disponible", false)
            is Resultado.Fallo -> _pushDisponible.value = false
        }
    }

    fun enviarPushDePrueba() {
        viewModelScope.launch { repositorio.pruebaPush() }
    }

    fun cargarInicio() {
        _estado.value = EstadoPantalla(cargando = true)
        viewModelScope.launch {
            when (val r = repositorio.resumenCuenta()) {
                is Resultado.Fallo -> {
                    publicarError(r.error)
                    return@launch
                }
                is Resultado.Exito -> _cuenta.value = r.datos
            }

            when (val r = repositorio.movimientos(limite = 8)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _movimientos.value = r.datos
                    _estado.value = EstadoPantalla()
                }
            }

            when (val r = repositorio.resumenNotificaciones()) {
                is Resultado.Exito -> _noLeidas.value = r.datos.optInt("noLeidas", 0)
                is Resultado.Fallo -> Unit
            }
        }
    }

    fun cargarMovimientos(tipo: String?) {
        _estado.value = EstadoPantalla(cargando = true)
        viewModelScope.launch {
            when (val r = repositorio.movimientos(limite = 50, tipo = tipo)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _movimientos.value = r.datos
                    _estado.value = EstadoPantalla()
                }
            }
        }
    }

    fun cargarTarjetas() {
        _estado.value = EstadoPantalla(cargando = true)
        viewModelScope.launch {
            when (val r = repositorio.tarjetas()) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _tarjetas.value = r.datos
                    _estado.value = EstadoPantalla()
                    cargarCatalogoCredito()
                }
            }
        }
    }

    fun cargarCatalogoCredito() {
        viewModelScope.launch {
            when (val r = repositorio.catalogoCredito()) {
                is Resultado.Exito -> _catalogoCredito.value = r.datos
                is Resultado.Fallo -> _catalogoCredito.value = null
            }
        }
    }

    suspend fun detalleTarjeta(id: String) = repositorio.detalleTarjeta(id)

    fun cambiarEstadoTarjeta(id: String, bloquear: Boolean) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            val r = if (bloquear) {
                repositorio.bloquearTarjeta(id)
            } else {
                repositorio.desbloquearTarjeta(id)
            }
            when (r) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    cargarTarjetas()
                }
            }
        }
    }

    fun solicitarCredito(
        nivel: String?,
        alTerminar: (SolicitudCredito) -> Unit,
        alFallar: (Int, String?) -> Unit,
    ) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.solicitarCredito(nivel)) {
                is Resultado.Fallo -> {
                    _estado.value = EstadoPantalla()
                    alFallar(mensajeDe(r.error), detalleDe(r.error))
                }
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    alTerminar(r.datos)
                    cargarTarjetas()
                }
            }
        }
    }

    fun cargarPrestamos() {
        _estado.value = EstadoPantalla(cargando = true)
        viewModelScope.launch {
            when (val r = repositorio.prestamos()) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _prestamos.value = r.datos
                    _estado.value = EstadoPantalla()
                }
            }
        }
    }

    suspend fun condicionesPrestamo() = repositorio.condicionesPrestamo()

    fun solicitarPrestamo(monto: Double, plazo: Int, alTerminar: () -> Unit) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.solicitarPrestamo(monto, plazo)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    cargarPrestamos()
                    alTerminar()
                }
            }
        }
    }

    fun pagarPrestamo(id: String, monto: Double, alTerminar: () -> Unit) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.pagarPrestamo(id, monto)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    cargarPrestamos()
                    alTerminar()
                }
            }
        }
    }

    fun cargarApartados() {
        _estado.value = EstadoPantalla(cargando = true)
        viewModelScope.launch {
            when (val r = repositorio.apartados()) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _apartados.value = r.datos
                    _estado.value = EstadoPantalla()
                }
            }
        }
    }

    fun crearApartado(
        nombre: String,
        meta: Double?,
        icono: String,
        montoInicial: Double?,
        alTerminar: () -> Unit,
    ) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.crearApartado(nombre, meta, icono, montoInicial)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    cargarApartados()
                    alTerminar()
                }
            }
        }
    }

    fun moverApartado(
        apartado: Apartado,
        monto: Double,
        guardar: Boolean,
        alTerminar: () -> Unit,
    ) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            val r = if (guardar) {
                repositorio.apartarDinero(apartado.id, monto)
            } else {
                repositorio.devolverDinero(apartado.id, monto)
            }
            when (r) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    cargarApartados()
                    alTerminar()
                }
            }
        }
    }

    fun cerrarApartado(id: String) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.cerrarApartado(id)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    cargarApartados()
                }
            }
        }
    }

    fun cargarNotificaciones() {
        _estado.value = EstadoPantalla(cargando = true)
        viewModelScope.launch {
            when (val r = repositorio.notificaciones()) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _notificaciones.value = r.datos
                    _noLeidas.value = r.datos.count { !it.leida }
                    _estado.value = EstadoPantalla()
                }
            }
            sincronizarPush()
        }
    }

    fun marcarTodasLeidas() {
        viewModelScope.launch {
            repositorio.marcarTodasLeidas()
            cargarNotificaciones()
        }
    }

    fun cargarProveedores() {
        viewModelScope.launch {
            when (val r = repositorio.catalogoServicios()) {
                is Resultado.Exito -> _proveedores.value = r.datos
                is Resultado.Fallo -> publicarError(r.error)
            }
        }
    }

    fun cargarPerfil() {
        _estado.value = EstadoPantalla(cargando = true)
        viewModelScope.launch {
            when (val r = repositorio.perfil()) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _perfil.value = r.datos
                    _estado.value = EstadoPantalla()
                }
            }
        }
    }

    fun actualizarPerfil(nombre: String, telefono: String, alTerminar: () -> Unit) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.actualizarPerfil(nombre, telefono)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    cargarPerfil()
                    alTerminar()
                }
            }
        }
    }

    fun cambiarPassword(
        actual: String,
        nueva: String,
        confirmacion: String,
        alTerminar: () -> Unit,
    ) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.cambiarPassword(actual, nueva, confirmacion)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _estado.value = EstadoPantalla()
                    alTerminar()
                }
            }
        }
    }

    fun transferir(
        cuentaDestino: String,
        monto: Double,
        concepto: String?,
        alTerminar: () -> Unit,
    ) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.transferir(cuentaDestino, monto, concepto)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _comprobante.value = r.datos
                    _estado.value = EstadoPantalla()
                    cargarInicio()
                    alTerminar()
                }
            }
        }
    }

    fun pagarServicio(
        codigo: String,
        referencia: String,
        monto: Double,
        alTerminar: () -> Unit,
    ) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.pagarServicio(codigo, referencia, monto)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _comprobante.value = r.datos
                    _estado.value = EstadoPantalla()
                    cargarInicio()
                    alTerminar()
                }
            }
        }
    }

    fun retirar(monto: Double, alTerminar: () -> Unit) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.retirar(monto)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _comprobante.value = r.datos
                    _estado.value = EstadoPantalla()
                    cargarInicio()
                    alTerminar()
                }
            }
        }
    }

    fun depositar(monto: Double, alTerminar: () -> Unit) {
        _estado.value = EstadoPantalla(procesando = true)
        viewModelScope.launch {
            when (val r = repositorio.depositar(monto)) {
                is Resultado.Fallo -> publicarError(r.error)
                is Resultado.Exito -> {
                    _comprobante.value = r.datos
                    _estado.value = EstadoPantalla()
                    cargarInicio()
                    alTerminar()
                }
            }
        }
    }

    fun limpiarComprobante() {
        _comprobante.value = null
    }

    suspend fun consultarAsistente(mensaje: String) =
        repositorio.consultarAsistente(mensaje)

    suspend fun bienvenidaAsistente() = repositorio.bienvenidaAsistente()
}
