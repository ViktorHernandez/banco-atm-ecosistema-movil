package mx.bancoatm.movil.ui.pantallas

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mx.bancoatm.movil.R
import mx.bancoatm.movil.ui.Dimensiones
import mx.bancoatm.movil.data.Apartado
import mx.bancoatm.movil.data.Entorno
import mx.bancoatm.movil.data.Resultado
import mx.bancoatm.movil.ui.ModeloBanco
import mx.bancoatm.movil.ui.componentes.BarraProgreso
import mx.bancoatm.movil.ui.componentes.BotonPrincipal
import mx.bancoatm.movil.ui.componentes.CampoTexto
import mx.bancoatm.movil.ui.componentes.Cargando
import mx.bancoatm.movil.ui.componentes.ErrorReintentable
import mx.bancoatm.movil.ui.componentes.EstadoVacio
import mx.bancoatm.movil.ui.componentes.MensajeEstado
import mx.bancoatm.movil.ui.componentes.TituloSeccion
import mx.bancoatm.movil.ui.formatearFecha
import mx.bancoatm.movil.ui.formatearMoneda

@Composable
private fun FilaApartado(
    apartado: Apartado,
    idioma: String,
    alMover: (Double, Boolean) -> Unit,
    alCerrar: () -> Unit,
) {
    var monto by remember { mutableStateOf("") }
    val valido = monto.toDoubleOrNull()?.let { it > 0 } == true

    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(Dimensiones.radioTarjeta)) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(apartado.nombre, style = MaterialTheme.typography.titleMedium)
                Text(
                    formatearMoneda(apartado.monto, idioma),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            apartado.progreso?.let { progreso ->
                BarraProgreso(
                    porcentaje = progreso,
                    descripcion = stringResource(R.string.apartados_progreso, progreso),
                )
                Text(
                    stringResource(R.string.apartados_progreso, progreso),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            CampoTexto(
                monto,
                { monto = it },
                stringResource(R.string.transferir_monto),
                tipoTeclado = KeyboardType.Decimal,
            )

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(
                    onClick = {
                        monto.toDoubleOrNull()?.let { alMover(it, true) }
                        monto = ""
                    },
                    enabled = valido,
                ) { Text(stringResource(R.string.apartados_guardar_dinero)) }
                TextButton(
                    onClick = {
                        monto.toDoubleOrNull()?.let { alMover(it, false) }
                        monto = ""
                    },
                    enabled = valido,
                ) { Text(stringResource(R.string.apartados_retirar_dinero)) }
            }

            TextButton(onClick = alCerrar) {
                Text(
                    stringResource(R.string.apartados_cerrar),
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }
    }
}

@Composable
fun PantallaApartados(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val resumen by modelo.apartados.collectAsState()
    val idioma by modelo.idioma.collectAsState()

    var nombre by remember { mutableStateOf("") }
    var meta by remember { mutableStateOf("") }
    var mostrarAlta by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { modelo.cargarApartados() }

    if (estado.cargando && resumen == null) {
        Cargando(etiqueta = stringResource(R.string.estado_cargando))
        return
    }

    if (estado.error != null && resumen == null) {
        ErrorReintentable(
            mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
            alReintentar = { modelo.cargarApartados() },
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { EncabezadoOperacion(stringResource(R.string.apartados_titulo), alVolver) }

        item {
            Text(
                stringResource(R.string.apartados_intro),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimensiones.radioTarjeta),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                ),
            ) {
                Column(Modifier.padding(18.dp)) {
                    Text(
                        stringResource(R.string.apartados_disponible) + ": " +
                            formatearMoneda(resumen?.saldoDisponible ?: 0.0, idioma),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        stringResource(R.string.apartados_total) + ": " +
                            formatearMoneda(resumen?.totalApartado ?: 0.0, idioma),
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
            }
        }

        item {
            MensajeEstado(
                texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
                esError = true,
            )
        }

        item {
            TituloSeccion(
                texto = stringResource(R.string.apartados_crear),
                accion = { mostrarAlta = !mostrarAlta },
                textoAccion = stringResource(
                    if (mostrarAlta) R.string.accion_cancelar else R.string.accion_continuar,
                ),
            )
        }

        if (mostrarAlta) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    CampoTexto(
                        nombre,
                        { nombre = it },
                        stringResource(R.string.apartados_nombre),
                    )
                    CampoTexto(
                        meta,
                        { meta = it },
                        stringResource(R.string.apartados_meta),
                        tipoTeclado = KeyboardType.Decimal,
                    )
                    BotonPrincipal(
                        texto = stringResource(R.string.accion_guardar),
                        cargando = estado.procesando,
                        habilitado = nombre.length >= 3,
                        alPulsar = {
                            modelo.crearApartado(
                                nombre,
                                meta.toDoubleOrNull(),
                                "ahorro",
                                null,
                            ) {
                                nombre = ""
                                meta = ""
                                mostrarAlta = false
                            }
                        },
                    )
                }
            }
        }

        val lista = resumen?.apartados.orEmpty()
        if (lista.isEmpty()) {
            item { EstadoVacio(stringResource(R.string.apartados_sin_apartados)) }
        } else {
            items(lista) { apartado ->
                FilaApartado(
                    apartado = apartado,
                    idioma = idioma,
                    alMover = { cantidad, guardar ->
                        modelo.moverApartado(apartado, cantidad, guardar) { }
                    },
                    alCerrar = { modelo.cerrarApartado(apartado.id) },
                )
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
fun PantallaAvisos(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val notificaciones by modelo.notificaciones.collectAsState()
    val pushDisponible by modelo.pushDisponible.collectAsState()
    val idioma by modelo.idioma.collectAsState()

    LaunchedEffect(Unit) { modelo.cargarNotificaciones() }

    if (estado.error != null && notificaciones.isEmpty()) {
        ErrorReintentable(
            mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
            alReintentar = { modelo.cargarNotificaciones() },
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item { EncabezadoOperacion(stringResource(R.string.avisos_titulo), alVolver) }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        stringResource(
                            if (pushDisponible) {
                                R.string.avisos_push_activas
                            } else {
                                R.string.avisos_push_inactivas
                            },
                        ),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    if (pushDisponible) {
                        TextButton(onClick = { modelo.enviarPushDePrueba() }) {
                            Text(stringResource(R.string.avisos_push_probar))
                        }
                    }
                }
            }
        }

        item {
            TituloSeccion(
                texto = stringResource(R.string.avisos_titulo),
                accion = { modelo.marcarTodasLeidas() },
                textoAccion = stringResource(R.string.avisos_marcar),
            )
        }

        when {
            estado.cargando && notificaciones.isEmpty() -> item {
                Cargando(etiqueta = stringResource(R.string.estado_cargando))
            }
            notificaciones.isEmpty() -> item {
                EstadoVacio(stringResource(R.string.avisos_sin_avisos))
            }
            else -> items(notificaciones) { aviso ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (aviso.leida) {
                            MaterialTheme.colorScheme.surface
                        } else {
                            MaterialTheme.colorScheme.primaryContainer
                        },
                    ),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text(aviso.mensaje, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            formatearFecha(aviso.creadaEn, idioma),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
fun PantallaPerfil(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val perfil by modelo.perfil.collectAsState()
    val idioma by modelo.idioma.collectAsState()
    val entorno by modelo.entorno.collectAsState()
    val servidorLocal by modelo.servidorLocal.collectAsState()
    val cuenta by modelo.cuenta.collectAsState()

    var nombre by remember { mutableStateOf("") }
    var telefono by remember { mutableStateOf("") }
    var servidor by remember { mutableStateOf(servidorLocal) }
    var actual by remember { mutableStateOf("") }
    var nueva by remember { mutableStateOf("") }
    var repetir by remember { mutableStateOf("") }
    var aviso by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { modelo.cargarPerfil() }
    LaunchedEffect(perfil) {
        perfil?.let {
            nombre = it.nombreCompleto
            telefono = it.telefono.orEmpty()
        }
    }

    if (estado.cargando && perfil == null) {
        Cargando(etiqueta = stringResource(R.string.estado_cargando))
        return
    }

    if (estado.error != null && perfil == null) {
        ErrorReintentable(
            mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
            alReintentar = { modelo.cargarPerfil() },
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { EncabezadoOperacion(stringResource(R.string.perfil_titulo), alVolver) }

        item {
            Text(
                stringResource(R.string.perfil_cuenta) + ": " +
                    (cuenta?.numeroCuenta ?: ""),
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        item { MensajeEstado(aviso, esError = false) }
        item {
            MensajeEstado(
                texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
                esError = true,
            )
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                TituloSeccion(stringResource(R.string.perfil_datos))
                CampoTexto(nombre, { nombre = it }, stringResource(R.string.registro_nombre))
                CampoTexto(
                    telefono,
                    { telefono = it },
                    stringResource(R.string.registro_telefono),
                    tipoTeclado = KeyboardType.Phone,
                )
                CampoTexto(
                    valor = perfil?.correo.orEmpty(),
                    alCambiar = { },
                    etiqueta = stringResource(R.string.acceso_correo),
                    soloLectura = true,
                )
                BotonPrincipal(
                    texto = stringResource(R.string.accion_guardar),
                    cargando = estado.procesando,
                    habilitado = nombre.length >= 3,
                    alPulsar = { modelo.actualizarPerfil(nombre, telefono) { } },
                )
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                TituloSeccion(stringResource(R.string.perfil_password))
                CampoTexto(
                    actual,
                    { actual = it },
                    stringResource(R.string.perfil_password_actual),
                    esPassword = true,
                )
                CampoTexto(
                    nueva,
                    { nueva = it },
                    stringResource(R.string.recuperar_nueva),
                    esPassword = true,
                )
                CampoTexto(
                    repetir,
                    { repetir = it },
                    stringResource(R.string.registro_password_repetir),
                    esPassword = true,
                    error = repetir.isNotBlank() && repetir != nueva,
                )
                BotonPrincipal(
                    texto = stringResource(R.string.accion_guardar),
                    cargando = estado.procesando,
                    habilitado = actual.isNotBlank() && nueva.length >= 8 && nueva == repetir,
                    alPulsar = {
                        modelo.cambiarPassword(actual, nueva, repetir) {
                            actual = ""
                            nueva = ""
                            repetir = ""
                        }
                    },
                )
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                TituloSeccion(stringResource(R.string.perfil_idioma))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = idioma == "es",
                        onClick = { modelo.cambiarIdioma("es") },
                        label = { Text("Español") },
                    )
                    FilterChip(
                        selected = idioma == "en",
                        onClick = { modelo.cambiarIdioma("en") },
                        label = { Text("English") },
                    )
                }
            }
        }

        if (modelo.sesion.permiteEntornoLocal()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    TituloSeccion(stringResource(R.string.perfil_entorno))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = entorno == Entorno.LOCAL,
                            onClick = { modelo.cambiarEntorno(Entorno.LOCAL) },
                            label = { Text(stringResource(R.string.perfil_entorno_local)) },
                        )
                        FilterChip(
                            selected = entorno == Entorno.PRODUCCION,
                            onClick = { modelo.cambiarEntorno(Entorno.PRODUCCION) },
                            label = {
                                Text(stringResource(R.string.perfil_entorno_produccion))
                            },
                        )
                    }
                    CampoTexto(
                        servidor,
                        { servidor = it },
                        stringResource(R.string.perfil_servidor_local),
                        tipoTeclado = KeyboardType.Uri,
                    )
                    TextButton(onClick = { modelo.cambiarServidorLocal(servidor) }) {
                        Text(stringResource(R.string.accion_guardar))
                    }
                }
            }
        }

        item {
            BotonPrincipal(
                texto = stringResource(R.string.perfil_cerrar_sesion),
                alPulsar = { modelo.cerrarSesion { } },
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
fun PantallaAsistente(modelo: ModeloBanco, alVolver: () -> Unit) {
    val alcance = rememberCoroutineScope()
    val idioma by modelo.idioma.collectAsState()

    var mensaje by remember { mutableStateOf("") }
    var conversacion by remember { mutableStateOf(listOf<Pair<Boolean, String>>()) }
    var sugerencias by remember { mutableStateOf(listOf<String>()) }
    var esperando by remember { mutableStateOf(false) }
    var errorBienvenida by remember { mutableStateOf(false) }
    var recarga by remember { mutableStateOf(0) }

    LaunchedEffect(idioma, recarga) {
        when (val r = modelo.bienvenidaAsistente()) {
            is Resultado.Exito -> {
                errorBienvenida = false
                conversacion = listOf(false to r.datos.respuesta)
                sugerencias = r.datos.sugerencias
            }
            is Resultado.Fallo -> errorBienvenida = true
        }
    }

    val enviar: (String) -> Unit = { texto ->
        if (texto.isNotBlank() && !esperando) {
            conversacion = conversacion + (true to texto)
            esperando = true
            alcance.launch {
                when (val r = modelo.consultarAsistente(texto)) {
                    is Resultado.Exito -> {
                        conversacion = conversacion + (false to r.datos.respuesta)
                        sugerencias = r.datos.sugerencias
                    }
                    is Resultado.Fallo -> {
                        conversacion = conversacion + (false to r.error.mensaje)
                    }
                }
                esperando = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        EncabezadoOperacion(stringResource(R.string.asistente_titulo), alVolver)

        if (errorBienvenida && conversacion.isEmpty()) {
            ErrorReintentable(
                mensaje = stringResource(R.string.asistente_error),
                alReintentar = { recarga += 1 },
            )
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(conversacion) { (esUsuario, texto) ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (esUsuario) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant
                        },
                    ),
                ) {
                    Text(texto, modifier = Modifier.padding(14.dp))
                }
            }

            if (sugerencias.isNotEmpty()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        sugerencias.forEach { sugerencia ->
                            TextButton(onClick = { enviar(sugerencia) }) {
                                Text(sugerencia)
                            }
                        }
                    }
                }
            }
        }

        CampoTexto(
            mensaje,
            { mensaje = it },
            stringResource(R.string.asistente_escribir),
        )
        BotonPrincipal(
            texto = stringResource(R.string.accion_enviar),
            cargando = esperando,
            habilitado = mensaje.isNotBlank(),
            alPulsar = {
                enviar(mensaje)
                mensaje = ""
            },
        )
        Spacer(Modifier.height(16.dp))
    }
}
