package mx.bancoatm.movil.ui.pantallas

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import mx.bancoatm.movil.R
import mx.bancoatm.movil.ui.ModeloBanco
import mx.bancoatm.movil.ui.componentes.BotonPrincipal
import mx.bancoatm.movil.ui.componentes.CampoTexto
import mx.bancoatm.movil.ui.componentes.MensajeEstado
import mx.bancoatm.movil.ui.formatearMoneda

@Composable
fun EncabezadoOperacion(titulo: String, alVolver: () -> Unit) {
    Column {
        Spacer(Modifier.height(16.dp))
        Text(
            titulo,
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.semantics { heading() },
        )
        Spacer(Modifier.height(4.dp))
        TextButton(onClick = alVolver) {
            Text(stringResource(R.string.accion_volver))
        }
    }
}

@Composable
fun DialogoComprobante(modelo: ModeloBanco, alCerrar: () -> Unit) {
    val comprobante by modelo.comprobante.collectAsState()
    val idioma by modelo.idioma.collectAsState()
    val actual = comprobante ?: return

    AlertDialog(
        onDismissRequest = {
            modelo.limpiarComprobante()
            alCerrar()
        },
        title = { Text(stringResource(R.string.comprobante_titulo)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    formatearMoneda(actual.monto, idioma),
                    style = MaterialTheme.typography.headlineSmall,
                )
                Text(
                    stringResource(R.string.comprobante_folio) + ": " + actual.folio,
                    style = MaterialTheme.typography.bodyMedium,
                )
                actual.saldoResultante?.let {
                    Text(
                        stringResource(R.string.comprobante_saldo) + ": " +
                            formatearMoneda(it, idioma),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                actual.descripcion?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium)
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                modelo.limpiarComprobante()
                alCerrar()
            }) { Text(stringResource(R.string.accion_aceptar)) }
        },
    )
}

@Composable
private fun ContenedorOperacion(
    titulo: String,
    alVolver: () -> Unit,
    contenido: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        EncabezadoOperacion(titulo, alVolver)
        contenido()
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun PantallaTransferencia(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val comprobante by modelo.comprobante.collectAsState()
    var destino by remember { mutableStateOf("") }
    var monto by remember { mutableStateOf("") }
    var concepto by remember { mutableStateOf("") }

    val montoValido = monto.toDoubleOrNull()?.let { it > 0 } == true

    ContenedorOperacion(stringResource(R.string.transferir_titulo), alVolver) {
        CampoTexto(
            destino,
            { destino = it.filter { caracter -> caracter.isDigit() } },
            stringResource(R.string.transferir_destino),
            tipoTeclado = KeyboardType.Number,
        )
        CampoTexto(
            monto,
            { monto = it },
            stringResource(R.string.transferir_monto),
            tipoTeclado = KeyboardType.Decimal,
        )
        CampoTexto(
            concepto,
            { concepto = it },
            stringResource(R.string.transferir_concepto),
        )

        MensajeEstado(
            texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
            esError = true,
        )

        BotonPrincipal(
            texto = stringResource(R.string.transferir_confirmar),
            cargando = estado.procesando,
            habilitado = destino.length >= 6 && montoValido,
            alPulsar = {
                modelo.transferir(
                    destino,
                    monto.toDouble(),
                    concepto.ifBlank { null },
                ) { }
            },
        )
    }

    if (comprobante != null) {
        DialogoComprobante(modelo, alVolver)
    }
}

@Composable
fun PantallaPagoServicio(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val proveedores by modelo.proveedores.collectAsState()
    val comprobante by modelo.comprobante.collectAsState()
    val idioma by modelo.idioma.collectAsState()

    var codigo by remember { mutableStateOf("") }
    var referencia by remember { mutableStateOf("") }
    var monto by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { modelo.cargarProveedores() }

    val elegido = proveedores.firstOrNull { it.codigo == codigo }
    val montoValido = monto.toDoubleOrNull()?.let { valor ->
        elegido == null || (valor >= elegido.montoMinimo && valor <= elegido.montoMaximo)
    } == true && monto.toDoubleOrNull()?.let { it > 0 } == true

    ContenedorOperacion(stringResource(R.string.pago_titulo), alVolver) {
        Text(
            stringResource(R.string.pago_proveedor),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.semantics { heading() },
        )
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            proveedores.forEach { proveedor ->
                FilterChip(
                    modifier = Modifier.fillMaxWidth(),
                    selected = codigo == proveedor.codigo,
                    onClick = { codigo = proveedor.codigo },
                    label = { Text(proveedor.nombre) },
                )
            }
        }

        elegido?.let {
            Text(
                formatearMoneda(it.montoMinimo, idioma) + " — " +
                    formatearMoneda(it.montoMaximo, idioma),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        CampoTexto(
            referencia,
            { referencia = it },
            stringResource(R.string.pago_referencia),
        )
        CampoTexto(
            monto,
            { monto = it },
            stringResource(R.string.transferir_monto),
            tipoTeclado = KeyboardType.Decimal,
        )

        MensajeEstado(
            texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
            esError = true,
        )

        BotonPrincipal(
            texto = stringResource(R.string.pago_confirmar),
            cargando = estado.procesando,
            habilitado = codigo.isNotBlank() && referencia.length >= 4 && montoValido,
            alPulsar = {
                modelo.pagarServicio(codigo, referencia, monto.toDouble()) { }
            },
        )
    }

    if (comprobante != null) {
        DialogoComprobante(modelo, alVolver)
    }
}

@Composable
private fun PantallaMontoSimple(
    titulo: String,
    modelo: ModeloBanco,
    alVolver: () -> Unit,
    alConfirmar: (Double) -> Unit,
) {
    val estado by modelo.estado.collectAsState()
    val comprobante by modelo.comprobante.collectAsState()
    var monto by remember { mutableStateOf("") }

    val valido = monto.toDoubleOrNull()?.let { it > 0 } == true

    ContenedorOperacion(titulo, alVolver) {
        CampoTexto(
            monto,
            { monto = it },
            stringResource(R.string.transferir_monto),
            tipoTeclado = KeyboardType.Decimal,
        )

        MensajeEstado(
            texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
            esError = true,
        )

        BotonPrincipal(
            texto = stringResource(R.string.accion_continuar),
            cargando = estado.procesando,
            habilitado = valido,
            alPulsar = { alConfirmar(monto.toDouble()) },
        )
    }

    if (comprobante != null) {
        DialogoComprobante(modelo, alVolver)
    }
}

@Composable
fun PantallaRetiro(modelo: ModeloBanco, alVolver: () -> Unit) {
    PantallaMontoSimple(
        titulo = stringResource(R.string.retiro_titulo),
        modelo = modelo,
        alVolver = alVolver,
        alConfirmar = { modelo.retirar(it) { } },
    )
}

@Composable
fun PantallaDeposito(modelo: ModeloBanco, alVolver: () -> Unit) {
    PantallaMontoSimple(
        titulo = stringResource(R.string.deposito_titulo),
        modelo = modelo,
        alVolver = alVolver,
        alConfirmar = { modelo.depositar(it) { } },
    )
}
