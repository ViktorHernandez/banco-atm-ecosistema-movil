package mx.bancoatm.movil.ui.pantallas

import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.SouthWest
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.AlertDialog
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import mx.bancoatm.movil.R
import mx.bancoatm.movil.data.Movimiento
import mx.bancoatm.movil.ui.ModeloBanco
import mx.bancoatm.movil.ui.Rutas
import mx.bancoatm.movil.ui.componentes.Cargando
import mx.bancoatm.movil.ui.componentes.ErrorReintentable
import mx.bancoatm.movil.ui.Dimensiones
import mx.bancoatm.movil.ui.componentes.AccesoCuadricula
import mx.bancoatm.movil.ui.componentes.EstadoVacio
import mx.bancoatm.movil.ui.componentes.FilaConIcono
import mx.bancoatm.movil.ui.componentes.FilaOpcion
import mx.bancoatm.movil.ui.componentes.Separador
import mx.bancoatm.movil.ui.componentes.TarjetaAgrupada
import mx.bancoatm.movil.ui.componentes.TarjetaSaldo
import mx.bancoatm.movil.ui.componentes.TituloSeccion
import mx.bancoatm.movil.ui.formatearFecha
import mx.bancoatm.movil.ui.formatearMoneda

@Composable
fun etiquetaTipo(tipo: String): String = when (tipo) {
    "RETIRO" -> stringResource(R.string.tipo_retiro)
    "DEPOSITO" -> stringResource(R.string.tipo_deposito)
    "TRANSFERENCIA" -> stringResource(R.string.tipo_transferencia)
    "PAGO_SERVICIO" -> stringResource(R.string.tipo_pago_servicio)
    "PRESTAMO" -> stringResource(R.string.tipo_prestamo)
    "PAGO_PRESTAMO" -> stringResource(R.string.tipo_pago_prestamo)
    "APARTADO_ABONO" -> stringResource(R.string.tipo_apartado_abono)
    "APARTADO_RETIRO" -> stringResource(R.string.tipo_apartado_retiro)
    else -> tipo
}

@Composable
fun FilaMovimiento(movimiento: Movimiento, idioma: String) {
    val esAbono = movimiento.signo == "ABONO"

    FilaConIcono(
        icono = iconoDeMovimiento(movimiento.tipo, esAbono),
        titulo = etiquetaTipo(movimiento.tipo),
        subtitulo = formatearFecha(movimiento.fecha, idioma),
        detalle = movimiento.contraparte,
        valor = (if (esAbono) "+ " else "\u2212 ") + formatearMoneda(movimiento.monto, idioma),
        colorValor = if (esAbono) {
            MaterialTheme.colorScheme.tertiary
        } else {
            MaterialTheme.colorScheme.error
        },
        fondoIcono = if (esAbono) {
            MaterialTheme.colorScheme.tertiary.copy(alpha = 0.14f)
        } else {
            MaterialTheme.colorScheme.error.copy(alpha = 0.12f)
        },
        tinteIcono = if (esAbono) {
            MaterialTheme.colorScheme.tertiary
        } else {
            MaterialTheme.colorScheme.error
        },
    )
}

private fun iconoDeMovimiento(tipo: String, esAbono: Boolean): ImageVector = when (tipo) {
    "TRANSFERENCIA" -> Icons.Filled.SwapHoriz
    "PAGO_SERVICIO" -> Icons.Filled.Payments
    "RETIRO" -> Icons.Filled.SouthWest
    "DEPOSITO" -> Icons.Filled.AccountBalanceWallet
    "PRESTAMO", "PAGO_PRESTAMO" -> Icons.Filled.ReceiptLong
    "APARTADO_ABONO", "APARTADO_RETIRO" -> Icons.Filled.Savings
    else -> if (esAbono) Icons.Filled.SouthWest else Icons.Filled.Payments
}

@Composable
fun PantallaInicio(
    modelo: ModeloBanco,
    alVerMovimientos: () -> Unit,
    alOperar: (String) -> Unit,
) {
    val estado by modelo.estado.collectAsState()
    val cuenta by modelo.cuenta.collectAsState()
    val movimientos by modelo.movimientos.collectAsState()
    val idioma by modelo.idioma.collectAsState()
    var visible by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) { modelo.cargarInicio() }

    if (estado.cargando && cuenta == null) {
        Cargando(etiqueta = stringResource(R.string.estado_cargando))
        return
    }

    if (estado.error != null && cuenta == null) {
        ErrorReintentable(
            mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
            alReintentar = { modelo.cargarInicio() },
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = Dimensiones.margenPantalla),
        verticalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
    ) {
        item {
            Spacer(Modifier.height(16.dp))
            Text(
                stringResource(
                    R.string.inicio_saludo,
                    cuenta?.titular?.substringBefore(" ") ?: "",
                ),
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.semantics { heading() },
            )
        }

        item {
            TarjetaSaldo(
                etiquetaSaldo = stringResource(R.string.inicio_saldo),
                saldo = if (visible) {
                    formatearMoneda(cuenta?.saldo ?: 0.0, idioma)
                } else {
                    "\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                },
                cuentaEnmascarada = cuenta?.numeroCuentaEnmascarado.orEmpty(),
                visible = visible,
                descripcionAlternar = stringResource(
                    if (visible) R.string.inicio_ocultar_saldo else R.string.inicio_mostrar_saldo,
                ),
                alAlternar = { visible = !visible },
            )
        }

        item { Spacer(Modifier.height(Dimensiones.espacioCompacto)) }

        item {
            TituloSeccion(texto = stringResource(R.string.inicio_accesos))
        }

        items(accesosRapidos.chunked(2)) { fila ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
            ) {
                fila.forEach { acceso ->
                    AccesoCuadricula(
                        texto = stringResource(acceso.etiqueta),
                        icono = acceso.icono,
                        modifier = Modifier.weight(1f),
                    ) { alOperar(acceso.ruta) }
                }
                if (fila.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }

        item { Spacer(Modifier.height(Dimensiones.espacioCompacto)) }

        item {
            TituloSeccion(
                texto = stringResource(R.string.inicio_movimientos),
                accion = alVerMovimientos,
                textoAccion = stringResource(R.string.inicio_ver_todo),
            )
        }

        if (movimientos.isEmpty()) {
            item { EstadoVacio(stringResource(R.string.inicio_sin_movimientos)) }
        } else {
            item {
                TarjetaAgrupada {
                    movimientos.forEachIndexed { indice, movimiento ->
                        FilaMovimiento(movimiento, idioma)
                        if (indice < movimientos.lastIndex) {
                            Separador()
                        }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

private data class AccesoRapidoInicio(
    val ruta: String,
    val etiqueta: Int,
    val icono: ImageVector,
)

private val accesosRapidos = listOf(
    AccesoRapidoInicio(Rutas.TRANSFERENCIA, R.string.operar_transferir, Icons.Filled.SwapHoriz),
    AccesoRapidoInicio(Rutas.PAGO, R.string.operar_pagar, Icons.Filled.Payments),
    AccesoRapidoInicio(Rutas.APARTADOS, R.string.operar_apartados, Icons.Filled.Savings),
    AccesoRapidoInicio(Rutas.ASISTENTE, R.string.operar_asistente, Icons.Filled.Chat),
)


@Composable
fun PantallaMovimientos(modelo: ModeloBanco) {
    val estado by modelo.estado.collectAsState()
    val movimientos by modelo.movimientos.collectAsState()
    val idioma by modelo.idioma.collectAsState()
    var filtro by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(filtro) { modelo.cargarMovimientos(filtro) }

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Spacer(Modifier.height(16.dp))
        Text(
            stringResource(R.string.menu_movimientos),
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.semantics { heading() },
        )
        Spacer(Modifier.height(12.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf(
                null to stringResource(R.string.inicio_ver_todo),
                "TRANSFERENCIA" to stringResource(R.string.tipo_transferencia),
                "PAGO_SERVICIO" to stringResource(R.string.tipo_pago_servicio),
                "RETIRO" to stringResource(R.string.tipo_retiro),
                "DEPOSITO" to stringResource(R.string.tipo_deposito),
            ).forEach { (valor, etiqueta) ->
                FilterChip(
                    selected = filtro == valor,
                    onClick = { filtro = valor },
                    label = { Text(etiqueta, maxLines = 1) },
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        when {
            estado.cargando -> Cargando(etiqueta = stringResource(R.string.estado_cargando))
            estado.error != null -> ErrorReintentable(
                mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
                alReintentar = { modelo.cargarMovimientos(filtro) },
            )
            movimientos.isEmpty() -> EstadoVacio(
                stringResource(R.string.inicio_sin_movimientos),
            )
            else -> LazyColumn {
                items(movimientos) { FilaMovimiento(it, idioma) }
            }
        }
    }
}

private data class OpcionMenu(
    val ruta: String,
    val etiqueta: Int,
    val detalle: Int,
    val icono: ImageVector,
)

private val operacionesDinero = listOf(
    OpcionMenu(
        Rutas.TRANSFERENCIA,
        R.string.operar_transferir,
        R.string.operar_transferir_detalle,
        Icons.Filled.SwapHoriz,
    ),
    OpcionMenu(
        Rutas.PAGO,
        R.string.operar_pagar,
        R.string.operar_pagar_detalle,
        Icons.Filled.Payments,
    ),
    OpcionMenu(
        Rutas.RETIRO,
        R.string.operar_retirar,
        R.string.operar_retirar_detalle,
        Icons.Filled.SouthWest,
    ),
    OpcionMenu(
        Rutas.DEPOSITO,
        R.string.operar_depositar,
        R.string.operar_depositar_detalle,
        Icons.Filled.AccountBalanceWallet,
    ),
)

private val operacionesProductos = listOf(
    OpcionMenu(
        Rutas.APARTADOS,
        R.string.operar_apartados,
        R.string.operar_apartados_detalle,
        Icons.Filled.Savings,
    ),
    OpcionMenu(
        Rutas.PRESTAMOS,
        R.string.operar_prestamos,
        R.string.operar_prestamos_detalle,
        Icons.Filled.ReceiptLong,
    ),
)

@Composable
fun PantallaOperar(alElegir: (String) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(Dimensiones.margenPantalla),
        verticalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
    ) {
        item {
            Text(
                stringResource(R.string.menu_operar),
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.semantics { heading() },
            )
        }

        item { TituloSeccion(stringResource(R.string.operar_grupo_dinero)) }
        item {
            TarjetaAgrupada {
                operacionesDinero.forEachIndexed { indice, opcion ->
                    FilaOpcion(
                        icono = opcion.icono,
                        titulo = stringResource(opcion.etiqueta),
                        detalle = stringResource(opcion.detalle),
                        alPulsar = { alElegir(opcion.ruta) },
                    )
                    if (indice < operacionesDinero.lastIndex) {
                        Separador()
                    }
                }
            }
        }

        item { TituloSeccion(stringResource(R.string.operar_grupo_productos)) }
        item {
            TarjetaAgrupada {
                operacionesProductos.forEachIndexed { indice, opcion ->
                    FilaOpcion(
                        icono = opcion.icono,
                        titulo = stringResource(opcion.etiqueta),
                        detalle = stringResource(opcion.detalle),
                        alPulsar = { alElegir(opcion.ruta) },
                    )
                    if (indice < operacionesProductos.lastIndex) {
                        Separador()
                    }
                }
            }
        }

        item { Spacer(Modifier.height(Dimensiones.espacioSeccion)) }
    }
}

@Composable
fun PantallaMas(modelo: ModeloBanco, alElegir: (String) -> Unit) {
    val noLeidas by modelo.noLeidas.collectAsState()
    var confirmarSalida by remember { mutableStateOf(false) }

    val opciones = listOf(
        Triple(Rutas.AVISOS, R.string.operar_avisos, Icons.Filled.Notifications),
        Triple(Rutas.PERFIL, R.string.operar_perfil, Icons.Filled.Person),
        Triple(Rutas.ASISTENTE, R.string.operar_asistente, Icons.Filled.Chat),
        Triple(Rutas.PRESTAMOS, R.string.operar_prestamos, Icons.Filled.ReceiptLong),
        Triple(Rutas.APARTADOS, R.string.operar_apartados, Icons.Filled.Savings),
    )

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(Dimensiones.margenPantalla),
        verticalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
    ) {
        item {
            Text(
                stringResource(R.string.menu_mas),
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.semantics { heading() },
            )
        }
        item {
            TarjetaAgrupada {
                opciones.forEachIndexed { indice, (ruta, etiqueta, icono) ->
                    FilaOpcion(
                        icono = icono,
                        titulo = stringResource(etiqueta),
                        detalle = null,
                        contador = if (ruta == Rutas.AVISOS) noLeidas else 0,
                        destacado = ruta == Rutas.AVISOS && noLeidas > 0,
                        alPulsar = { alElegir(ruta) },
                    )
                    if (indice < opciones.lastIndex) {
                        Separador()
                    }
                }
            }
        }
        item {
            TarjetaAgrupada {
                FilaOpcion(
                    icono = Icons.Filled.Logout,
                    titulo = stringResource(R.string.perfil_cerrar_sesion),
                    detalle = null,
                    alPulsar = { confirmarSalida = true },
                )
            }
            Spacer(Modifier.height(Dimensiones.espacioSeccion))
        }
    }

    if (confirmarSalida) {
        AlertDialog(
            onDismissRequest = { confirmarSalida = false },
            title = { Text(stringResource(R.string.perfil_cerrar_sesion)) },
            text = { Text(stringResource(R.string.accion_cerrar_sesion_pregunta)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmarSalida = false
                    modelo.cerrarSesion { }
                }) { Text(stringResource(R.string.perfil_cerrar_sesion)) }
            },
            dismissButton = {
                TextButton(onClick = { confirmarSalida = false }) {
                    Text(stringResource(R.string.accion_cancelar))
                }
            },
        )
    }
}
