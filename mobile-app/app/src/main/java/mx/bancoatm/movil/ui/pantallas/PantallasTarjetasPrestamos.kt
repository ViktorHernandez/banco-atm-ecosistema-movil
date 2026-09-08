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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import mx.bancoatm.movil.data.CatalogoCredito
import mx.bancoatm.movil.data.DetalleTarjeta
import mx.bancoatm.movil.data.NivelCredito
import mx.bancoatm.movil.data.Prestamo
import mx.bancoatm.movil.data.Resultado
import mx.bancoatm.movil.data.SolicitudCredito
import mx.bancoatm.movil.data.Tarjeta
import mx.bancoatm.movil.ui.ModeloBanco
import mx.bancoatm.movil.ui.componentes.BarraProgreso
import mx.bancoatm.movil.ui.componentes.BotonPrincipal
import mx.bancoatm.movil.ui.componentes.CampoTexto
import mx.bancoatm.movil.ui.componentes.Cargando
import mx.bancoatm.movil.ui.componentes.ErrorReintentable
import mx.bancoatm.movil.ui.componentes.EstadoVacio
import mx.bancoatm.movil.ui.componentes.MensajeEstado
import mx.bancoatm.movil.ui.etiquetaBeneficio
import mx.bancoatm.movil.ui.etiquetaNivel
import mx.bancoatm.movil.ui.formatearMoneda

@Composable
private fun etiquetaEstadoPrestamo(estado: String): String = when (estado) {
    "APROBADO" -> stringResource(R.string.prestamo_estado_aprobado)
    "RECHAZADO" -> stringResource(R.string.prestamo_estado_rechazado)
    "LIQUIDADO" -> stringResource(R.string.prestamo_estado_liquidado)
    else -> estado
}

@Composable
private fun etiquetaEstado(estado: String): String = when (estado) {
    "ACTIVA" -> stringResource(R.string.tarjetas_activa)
    "BLOQUEADA" -> stringResource(R.string.tarjetas_bloqueada)
    else -> stringResource(R.string.tarjetas_inactiva)
}

@Composable
private fun TarjetaVisual(
    tarjeta: Tarjeta,
    detalle: DetalleTarjeta?,
    idioma: String,
    alAlternarDetalle: () -> Unit,
    alCambiarEstado: () -> Unit,
) {
    val esCredito = tarjeta.tipo == "CREDITO"

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (esCredito) {
                MaterialTheme.colorScheme.secondary
            } else {
                MaterialTheme.colorScheme.primary
            },
        ),
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    stringResource(
                        if (esCredito) R.string.tarjetas_credito else R.string.tarjetas_debito,
                    ) + if (esCredito && tarjeta.nivel != null) {
                        " · " + etiquetaNivel(tarjeta.nivel)
                    } else {
                        ""
                    },
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Text(
                    etiquetaEstado(tarjeta.estado),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            }

            Spacer(Modifier.height(16.dp))

            Text(
                detalle?.numeroCompleto?.chunked(4)?.joinToString(" ")
                    ?: tarjeta.numeroEnmascarado,
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onPrimary,
            )

            Spacer(Modifier.height(12.dp))

            tarjeta.titular?.let {
                Text(
                    stringResource(R.string.tarjetas_titular) + ": " + it,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            }

            if (detalle != null) {
                Text(
                    stringResource(R.string.tarjetas_vence) + ": " + detalle.expiraEn,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Text(
                    "CVV: " + detalle.cvv,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            }

            if (esCredito && tarjeta.limiteCredito != null) {
                Spacer(Modifier.height(10.dp))
                Text(
                    stringResource(R.string.tarjetas_limite) + ": " +
                        formatearMoneda(tarjeta.limiteCredito, idioma),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                tarjeta.creditoDisponible?.let {
                    Text(
                        stringResource(R.string.tarjetas_disponible) + ": " +
                            formatearMoneda(it, idioma),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }

            if (esCredito && tarjeta.beneficios.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Text(
                    stringResource(R.string.tarjetas_beneficios),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.semantics { heading() },
                )
                Spacer(Modifier.height(4.dp))
                tarjeta.beneficios.forEach { beneficio ->
                    Text(
                        "• " + etiquetaBeneficio(beneficio),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
                tarjeta.anualidad?.let { cuota ->
                    Spacer(Modifier.height(6.dp))
                    Text(
                        stringResource(R.string.tarjetas_anualidad) + ": " + if (cuota > 0) {
                            formatearMoneda(cuota, idioma)
                        } else {
                            stringResource(R.string.tarjetas_sin_anualidad)
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(onClick = alAlternarDetalle) {
                    Text(
                        stringResource(
                            if (detalle == null) {
                                R.string.tarjetas_ver_datos
                            } else {
                                R.string.tarjetas_ocultar_datos
                            },
                        ),
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
                TextButton(onClick = alCambiarEstado) {
                    Text(
                        stringResource(
                            if (tarjeta.estado == "BLOQUEADA") {
                                R.string.tarjetas_desbloquear
                            } else {
                                R.string.tarjetas_bloquear
                            },
                        ),
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
        }
    }
}

@Composable
fun PantallaTarjetas(modelo: ModeloBanco) {
    val estado by modelo.estado.collectAsState()
    val tarjetas by modelo.tarjetas.collectAsState()
    val idioma by modelo.idioma.collectAsState()
    val alcance = rememberCoroutineScope()

    var detalles by remember { mutableStateOf(mapOf<String, DetalleTarjeta>()) }
    var aviso by remember { mutableStateOf<String?>(null) }
    var avisoError by remember { mutableStateOf<String?>(null) }
    var solicitud by remember { mutableStateOf<SolicitudCredito?>(null) }
    val catalogo by modelo.catalogoCredito.collectAsState()
    val errorDetalleTarjeta = stringResource(R.string.tarjetas_detalle_error)
    val errorSolicitud = stringResource(R.string.tarjetas_solicitud_error)

    LaunchedEffect(Unit) { modelo.cargarTarjetas() }

    if (estado.cargando && tarjetas.isEmpty()) {
        Cargando(etiqueta = stringResource(R.string.estado_cargando))
        return
    }

    if (estado.error != null && tarjetas.isEmpty()) {
        ErrorReintentable(
            mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
            alReintentar = { modelo.cargarTarjetas() },
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Spacer(Modifier.height(16.dp))
            Text(
                stringResource(R.string.tarjetas_titulo),
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.semantics { heading() },
            )
        }

        item { MensajeEstado(aviso, esError = false) }
        item { MensajeEstado(avisoError, esError = true) }

        if (tarjetas.isEmpty()) {
            item { EstadoVacio(stringResource(R.string.tarjetas_sin_tarjetas)) }
        } else {
            items(tarjetas) { tarjeta ->
                TarjetaVisual(
                    tarjeta = tarjeta,
                    detalle = detalles[tarjeta.id],
                    idioma = idioma,
                    alAlternarDetalle = {
                        if (detalles.containsKey(tarjeta.id)) {
                            detalles = detalles - tarjeta.id
                        } else {
                            alcance.launch {
                                when (val r = modelo.detalleTarjeta(tarjeta.id)) {
                                    is Resultado.Exito -> {
                                        avisoError = null
                                        detalles = detalles + (tarjeta.id to r.datos)
                                    }
                                    is Resultado.Fallo ->
                                        avisoError = errorDetalleTarjeta
                                }
                            }
                        }
                    },
                    alCambiarEstado = {
                        modelo.cambiarEstadoTarjeta(
                            tarjeta.id,
                            tarjeta.estado != "BLOQUEADA",
                        )
                    },
                )
            }
        }

        item {
            SeccionCatalogoCredito(
                catalogo = catalogo,
                idioma = idioma,
                procesando = estado.procesando,
                alSolicitar = { nivel ->
                    avisoError = null
                    modelo.solicitarCredito(
                        nivel = nivel,
                        alTerminar = { resultado -> solicitud = resultado },
                        alFallar = { _, detalle ->
                            avisoError = detalle ?: errorSolicitud
                        },
                    )
                },
            )
            Spacer(Modifier.height(24.dp))
        }
    }

    solicitud?.let { resultado ->
        AlertDialog(
            onDismissRequest = { solicitud = null },
            title = {
                Text(
                    stringResource(
                        if (resultado.aprobada) {
                            R.string.tarjetas_solicitud_aprobada
                        } else {
                            R.string.tarjetas_solicitud_registrada
                        },
                    ),
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (resultado.mensaje.isNotBlank()) {
                        Text(resultado.mensaje)
                    }
                    val nueva = resultado.tarjeta
                    if (nueva != null && nueva.beneficios.isNotEmpty()) {
                        Text(
                            stringResource(R.string.tarjetas_beneficios),
                            style = MaterialTheme.typography.labelLarge,
                        )
                        nueva.beneficios.forEach { beneficio ->
                            Text(
                                "• " + etiquetaBeneficio(beneficio),
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { solicitud = null }) {
                    Text(stringResource(R.string.accion_aceptar))
                }
            },
        )
    }
}

@Composable
private fun SeccionCatalogoCredito(
    catalogo: CatalogoCredito?,
    idioma: String,
    procesando: Boolean,
    alSolicitar: (String) -> Unit,
) {
    if (catalogo == null) {
        return
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            stringResource(R.string.tarjetas_catalogo_titulo),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.semantics { heading() },
        )
        Text(
            stringResource(
                R.string.tarjetas_catalogo_saldo,
                formatearMoneda(catalogo.saldoActual, idioma),
            ),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        when {
            !catalogo.hayCupo -> MensajeEstado(
                stringResource(R.string.tarjetas_catalogo_sin_cupo),
                esError = false,
            )
            catalogo.solicitables.isEmpty() -> MensajeEstado(
                stringResource(R.string.tarjetas_catalogo_sin_opciones),
                esError = false,
            )
            else -> catalogo.solicitables.forEach { nivel ->
                FilaNivelCredito(
                    nivel = nivel,
                    idioma = idioma,
                    procesando = procesando,
                    alSolicitar = alSolicitar,
                )
            }
        }
    }
}

@Composable
private fun FilaNivelCredito(
    nivel: NivelCredito,
    idioma: String,
    procesando: Boolean,
    alSolicitar: (String) -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    etiquetaNivel(nivel.nivel, nivel.nombre),
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    stringResource(R.string.tarjetas_nivel_disponible),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.tertiary,
                )
            }

            if (nivel.recomendada) {
                Text(
                    stringResource(R.string.tarjetas_nivel_recomendada),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            Text(
                stringResource(R.string.tarjetas_saldo_minimo) + ": " +
                    formatearMoneda(nivel.saldoMinimo, idioma),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            nivel.lineaEstimada?.let { linea ->
                Text(
                    stringResource(R.string.tarjetas_linea_estimada) + ": " +
                        formatearMoneda(linea, idioma),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Text(
                stringResource(R.string.tarjetas_anualidad) + ": " + if (nivel.anualidad > 0) {
                    formatearMoneda(nivel.anualidad, idioma)
                } else {
                    stringResource(R.string.tarjetas_sin_anualidad)
                },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            nivel.beneficios.forEach { beneficio ->
                Text(
                    "• " + etiquetaBeneficio(beneficio),
                    style = MaterialTheme.typography.labelSmall,
                )
            }

            OutlinedButton(
                onClick = { alSolicitar(nivel.nivel) },
                enabled = !procesando,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.tarjetas_solicitar))
            }
        }
    }
}

@Composable
private fun FilaPrestamo(
    prestamo: Prestamo,
    idioma: String,
    alPagar: (Double) -> Unit,
) {
    var monto by remember { mutableStateOf("") }
    val progreso = if (prestamo.totalAPagar > 0) {
        (prestamo.totalPagado / prestamo.totalAPagar).toFloat().coerceIn(0f, 1f)
    } else {
        0f
    }

    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    formatearMoneda(prestamo.monto, idioma),
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    etiquetaEstadoPrestamo(prestamo.estado),
                    style = MaterialTheme.typography.labelSmall,
                )
            }

            Text(
                stringResource(R.string.prestamos_pago_mensual) + ": " +
                    formatearMoneda(prestamo.pagoMensual, idioma),
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                stringResource(R.string.prestamos_pendiente) + ": " +
                    formatearMoneda(prestamo.capitalPendiente, idioma),
                style = MaterialTheme.typography.bodyMedium,
            )

            BarraProgreso(
                porcentaje = (progreso * 100).toInt(),
                descripcion = stringResource(
                    R.string.prestamos_progreso,
                    (progreso * 100).toInt(),
                ),
            )

            if (prestamo.capitalPendiente > 0) {
                CampoTexto(
                    monto,
                    { monto = it },
                    stringResource(R.string.prestamos_monto),
                    tipoTeclado = KeyboardType.Decimal,
                )
                TextButton(
                    onClick = {
                        monto.toDoubleOrNull()?.let { alPagar(it) }
                        monto = ""
                    },
                    enabled = monto.toDoubleOrNull()?.let { it > 0 } == true,
                ) { Text(stringResource(R.string.prestamos_pagar)) }
            }
        }
    }
}

@Composable
fun PantallaPrestamos(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val prestamos by modelo.prestamos.collectAsState()
    val idioma by modelo.idioma.collectAsState()

    var monto by remember { mutableStateOf("") }
    var plazo by remember { mutableStateOf("12") }

    LaunchedEffect(Unit) { modelo.cargarPrestamos() }

    if (estado.cargando && prestamos.isEmpty()) {
        Cargando(etiqueta = stringResource(R.string.estado_cargando))
        return
    }

    if (estado.error != null && prestamos.isEmpty()) {
        ErrorReintentable(
            mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
            alReintentar = { modelo.cargarPrestamos() },
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { EncabezadoOperacion(stringResource(R.string.prestamos_titulo), alVolver) }

        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        stringResource(R.string.prestamos_solicitar),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    CampoTexto(
                        monto,
                        { monto = it },
                        stringResource(R.string.prestamos_monto),
                        tipoTeclado = KeyboardType.Decimal,
                    )
                    CampoTexto(
                        plazo,
                        { plazo = it.filter { c -> c.isDigit() } },
                        stringResource(R.string.prestamos_plazo),
                        tipoTeclado = KeyboardType.Number,
                    )
                    MensajeEstado(
                        texto = estado.errorDetalle
                            ?: estado.error?.let { stringResource(it) },
                        esError = true,
                    )
                    BotonPrincipal(
                        texto = stringResource(R.string.prestamos_solicitar),
                        cargando = estado.procesando,
                        habilitado = monto.toDoubleOrNull()?.let { it > 0 } == true &&
                            plazo.toIntOrNull()?.let { it > 0 } == true,
                        alPulsar = {
                            modelo.solicitarPrestamo(
                                monto.toDouble(),
                                plazo.toInt(),
                            ) { monto = "" }
                        },
                    )
                }
            }
        }

        if (prestamos.isEmpty()) {
            item { EstadoVacio(stringResource(R.string.prestamos_sin_prestamos)) }
        } else {
            items(prestamos) { prestamo ->
                FilaPrestamo(prestamo, idioma) { cantidad ->
                    modelo.pagarPrestamo(prestamo.id, cantidad) { }
                }
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}
