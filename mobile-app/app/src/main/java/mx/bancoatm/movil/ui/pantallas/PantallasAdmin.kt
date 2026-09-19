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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.SouthWest
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import mx.bancoatm.movil.R
import mx.bancoatm.movil.data.OperacionAdministrativa
import mx.bancoatm.movil.ui.Dimensiones
import mx.bancoatm.movil.ui.ModeloBanco
import mx.bancoatm.movil.ui.componentes.BarraProgreso
import mx.bancoatm.movil.ui.componentes.Cargando
import mx.bancoatm.movil.ui.componentes.ErrorReintentable
import mx.bancoatm.movil.ui.componentes.EstadoVacio
import mx.bancoatm.movil.ui.componentes.FilaConIcono
import mx.bancoatm.movil.ui.componentes.Insignia
import mx.bancoatm.movil.ui.componentes.Separador
import mx.bancoatm.movil.ui.componentes.TarjetaAgrupada
import mx.bancoatm.movil.ui.componentes.TituloSeccion
import mx.bancoatm.movil.ui.formatearFecha
import mx.bancoatm.movil.ui.formatearMoneda

@Composable
fun PantallaPanelAdmin(modelo: ModeloBanco) {
    val estado by modelo.estado.collectAsState()
    val resumen by modelo.resumenAdmin.collectAsState()
    val perfil by modelo.perfil.collectAsState()
    val idioma by modelo.idioma.collectAsState()

    LaunchedEffect(Unit) {
        modelo.cargarPerfil()
        modelo.cargarResumenAdmin()
    }

    if (estado.cargando && resumen == null) {
        Cargando()
        return
    }

    if (estado.error != null && resumen == null) {
        ErrorReintentable(
            mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
            alReintentar = { modelo.cargarResumenAdmin() },
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(Dimensiones.margenPantalla),
        verticalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    stringResource(R.string.admin_panel_titulo),
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.semantics { heading() },
                )
                Insignia(stringResource(R.string.rol_administrador))
            }
            Text(
                perfil?.nombreCompleto.orEmpty(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            Text(
                stringResource(R.string.admin_panel_descripcion),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        val datos = resumen

        if (datos == null) {
            item { EstadoVacio(stringResource(R.string.admin_sin_datos)) }
            return@LazyColumn
        }

        item {
            TarjetaAgrupada {
                FilaDato(
                    stringResource(R.string.admin_usuarios),
                    datos.usuarios.toString(),
                    stringResource(R.string.admin_usuarios_detalle),
                )
                Separador()
                FilaDato(
                    stringResource(R.string.admin_cuentas),
                    datos.cuentas.toString(),
                    stringResource(R.string.admin_cuentas_detalle),
                )
                Separador()
                FilaDato(
                    stringResource(R.string.admin_monto_operado),
                    formatearMoneda(datos.montoOperado, idioma),
                    stringResource(R.string.admin_monto_detalle),
                )
            }
        }

        item { TituloSeccion(stringResource(R.string.admin_por_canal)) }
        item {
            TarjetaAgrupada {
                val total = datos.porCanal.sumOf { it.second }.coerceAtLeast(1)
                datos.porCanal.forEachIndexed { indice, (canal, cantidad) ->
                    val porcentaje = cantidad * 100 / total
                    Text(
                        "${etiquetaCanal(canal)}  ·  $cantidad  ·  $porcentaje %",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    BarraProgreso(
                        porcentaje = porcentaje,
                        descripcion = stringResource(R.string.admin_porcentaje, porcentaje),
                    )
                    if (indice < datos.porCanal.lastIndex) {
                        Spacer(Modifier.height(Dimensiones.espacioCompacto))
                    }
                }
            }
        }

        item { TituloSeccion(stringResource(R.string.admin_resultado)) }
        item {
            TarjetaAgrupada {
                val total = (datos.exitosas + datos.fallidas).coerceAtLeast(1)
                Text(
                    stringResource(R.string.admin_exitosas, datos.exitosas),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.tertiary,
                )
                BarraProgreso(
                    porcentaje = datos.exitosas * 100 / total,
                    descripcion = stringResource(R.string.admin_porcentaje, datos.exitosas * 100 / total),
                )
                Spacer(Modifier.height(Dimensiones.espacioCompacto))
                Text(
                    stringResource(R.string.admin_fallidas, datos.fallidas),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.error,
                )
                BarraProgreso(
                    porcentaje = datos.fallidas * 100 / total,
                    descripcion = stringResource(R.string.admin_porcentaje, datos.fallidas * 100 / total),
                )
                Spacer(Modifier.height(Dimensiones.espacioCompacto))
                Text(
                    stringResource(
                        R.string.admin_analizadas,
                        datos.transaccionesAnalizadas,
                    ),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item { TituloSeccion(stringResource(R.string.admin_ultimas)) }

        if (datos.ultimasOperaciones.isEmpty()) {
            item { EstadoVacio(stringResource(R.string.admin_sin_operaciones)) }
        } else {
            item {
                TarjetaAgrupada {
                    datos.ultimasOperaciones.forEachIndexed { indice, operacion ->
                        FilaOperacionAdmin(operacion, idioma)
                        if (indice < datos.ultimasOperaciones.lastIndex) {
                            Separador()
                        }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(Dimensiones.espacioSeccion)) }
    }
}

@Composable
private fun FilaDato(titulo: String, valor: String, detalle: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = Dimensiones.espacioCompacto),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(titulo, style = MaterialTheme.typography.titleMedium)
            Text(
                detalle,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            valor,
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.primary,
        )
    }
}

@Composable
private fun FilaOperacionAdmin(operacion: OperacionAdministrativa, idioma: String) {
    val exitosa = operacion.estado == "EXITOSA"

    FilaConIcono(
        icono = when (operacion.tipo) {
            "TRANSFERENCIA" -> Icons.Filled.SwapHoriz
            "PAGO_SERVICIO" -> Icons.Filled.Payments
            "RETIRO" -> Icons.Filled.SouthWest
            "DEPOSITO" -> Icons.Filled.AccountBalanceWallet
            else -> Icons.Filled.CreditCard
        },
        titulo = etiquetaTipo(operacion.tipo),
        subtitulo = etiquetaCanal(operacion.canal),
        detalle = operacion.fecha?.let { formatearFecha(it, idioma) },
        valor = formatearMoneda(operacion.monto, idioma),
        colorValor = if (exitosa) {
            MaterialTheme.colorScheme.onSurface
        } else {
            MaterialTheme.colorScheme.error
        },
        fondoIcono = if (exitosa) {
            MaterialTheme.colorScheme.primaryContainer
        } else {
            MaterialTheme.colorScheme.error.copy(alpha = 0.12f)
        },
        tinteIcono = if (exitosa) {
            MaterialTheme.colorScheme.onPrimaryContainer
        } else {
            MaterialTheme.colorScheme.error
        },
    )
}

@Composable
private fun etiquetaCanal(canal: String): String = when (canal) {
    "APP" -> stringResource(R.string.canal_app)
    "WEB" -> stringResource(R.string.canal_web)
    "ATM" -> stringResource(R.string.canal_atm)
    else -> canal
}
