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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.FactCheck
import androidx.compose.material.icons.filled.Group
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
import androidx.compose.foundation.clickable
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import mx.bancoatm.movil.data.Sesion
import mx.bancoatm.movil.data.UsuarioAdministrativo
import mx.bancoatm.movil.ui.Exportacion
import mx.bancoatm.movil.ui.componentes.BotonSecundario
import mx.bancoatm.movil.ui.componentes.CampoTexto
import mx.bancoatm.movil.R
import mx.bancoatm.movil.data.OperacionAdministrativa
import mx.bancoatm.movil.ui.Dimensiones
import mx.bancoatm.movil.ui.Rutas
import mx.bancoatm.movil.ui.ModeloBanco
import mx.bancoatm.movil.ui.componentes.AccesoCuadricula
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

private data class AccesoAdmin(
    val ruta: String,
    val etiqueta: Int,
    val icono: androidx.compose.ui.graphics.vector.ImageVector,
)

private val accesosAdmin = listOf(
    AccesoAdmin(Rutas.ADMIN_USUARIOS, R.string.admin_menu_usuarios, Icons.Filled.Group),
    AccesoAdmin(Rutas.ADMIN_TARJETAS, R.string.admin_menu_tarjetas, Icons.Filled.CreditCard),
    AccesoAdmin(Rutas.ADMIN_REPORTES, R.string.admin_menu_reportes, Icons.Filled.Assessment),
    AccesoAdmin(Rutas.ADMIN_AUDITORIA, R.string.admin_menu_auditoria, Icons.Filled.FactCheck),
)

@Composable
fun PantallaPanelAdmin(modelo: ModeloBanco, alElegir: (String) -> Unit) {
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

        item { TituloSeccion(stringResource(R.string.inicio_accesos)) }

        items(accesosAdmin.chunked(2)) { fila ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
            ) {
                fila.forEach { acceso ->
                    AccesoCuadricula(
                        texto = stringResource(acceso.etiqueta),
                        icono = acceso.icono,
                        modifier = Modifier.weight(1f),
                    ) { alElegir(acceso.ruta) }
                }
                if (fila.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
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

@Composable
fun PantallaAdminUsuarios(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val usuarios by modelo.usuariosAdmin.collectAsState()
    var busqueda by remember { mutableStateOf("") }
    var seleccionado by remember { mutableStateOf<UsuarioAdministrativo?>(null) }

    LaunchedEffect(Unit) { modelo.cargarUsuariosAdmin() }

    val filtrados = usuarios.filter {
        val texto = busqueda.trim().lowercase()
        texto.isBlank() ||
            it.nombreCompleto.lowercase().contains(texto) ||
            it.correo.lowercase().contains(texto) ||
            it.numeroCuenta.orEmpty().contains(texto)
    }

    seleccionado?.let { usuario ->
        val destino = if (usuario.rol == Sesion.ROL_ADMINISTRADOR) {
            Sesion.ROL_CLIENTE
        } else {
            Sesion.ROL_ADMINISTRADOR
        }
        AlertDialog(
            onDismissRequest = { seleccionado = null },
            title = { Text(stringResource(R.string.admin_cambiar_rol)) },
            text = {
                Text(
                    stringResource(
                        R.string.admin_cambiar_rol_detalle,
                        usuario.nombreCompleto,
                        stringResource(etiquetaRol(destino)),
                    ),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    modelo.cambiarRolUsuario(usuario.id, destino) { seleccionado = null }
                }) { Text(stringResource(R.string.accion_confirmar)) }
            },
            dismissButton = {
                TextButton(onClick = { seleccionado = null }) {
                    Text(stringResource(R.string.accion_cancelar))
                }
            },
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = Dimensiones.margenPantalla),
        verticalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
    ) {
        item { EncabezadoOperacion(stringResource(R.string.admin_menu_usuarios), alVolver) }

        item {
            CampoTexto(
                valor = busqueda,
                alCambiar = { busqueda = it },
                etiqueta = stringResource(R.string.admin_buscar_usuario),
            )
        }

        if (estado.cargando && usuarios.isEmpty()) {
            item { Cargando(etiqueta = stringResource(R.string.estado_cargando)) }
        }

        if (estado.error != null && usuarios.isEmpty()) {
            item {
                ErrorReintentable(
                    mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
                    alReintentar = { modelo.cargarUsuariosAdmin() },
                )
            }
        }

        if (filtrados.isEmpty() && !estado.cargando) {
            item { EstadoVacio(stringResource(R.string.admin_sin_usuarios)) }
        } else {
            item {
                TarjetaAgrupada {
                    filtrados.forEachIndexed { indice, usuario ->
                        FilaUsuarioAdmin(usuario) { seleccionado = usuario }
                        if (indice < filtrados.lastIndex) {
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
private fun FilaUsuarioAdmin(usuario: UsuarioAdministrativo, alPulsar: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = alPulsar)
            .padding(vertical = Dimensiones.espacioElemento),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(usuario.nombreCompleto, style = MaterialTheme.typography.titleMedium)
            Insignia(stringResource(etiquetaRol(usuario.rol)))
        }
        Text(
            usuario.correo,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (!usuario.numeroCuenta.isNullOrBlank()) {
            Text(
                usuario.numeroCuenta,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private fun etiquetaRol(rol: String): Int =
    if (rol == Sesion.ROL_ADMINISTRADOR) R.string.rol_administrador else R.string.rol_cliente

@Composable
fun PantallaAdminTarjetas(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val tarjetas by modelo.tarjetasAdmin.collectAsState()

    LaunchedEffect(Unit) { modelo.cargarTarjetasAdmin() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = Dimensiones.margenPantalla),
        verticalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
    ) {
        item { EncabezadoOperacion(stringResource(R.string.admin_menu_tarjetas), alVolver) }

        if (estado.cargando && tarjetas.isEmpty()) {
            item { Cargando(etiqueta = stringResource(R.string.estado_cargando)) }
        }

        if (estado.error != null && tarjetas.isEmpty()) {
            item {
                ErrorReintentable(
                    mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
                    alReintentar = { modelo.cargarTarjetasAdmin() },
                )
            }
        }

        if (tarjetas.isEmpty() && !estado.cargando) {
            item { EstadoVacio(stringResource(R.string.admin_sin_tarjetas)) }
        } else {
            item {
                TarjetaAgrupada {
                    tarjetas.forEachIndexed { indice, tarjeta ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = Dimensiones.espacioElemento),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    tarjeta.titular ?: stringResource(R.string.admin_sin_titular),
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Insignia(tarjeta.estado)
                            }
                            Text(
                                tarjeta.numeroTarjeta,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (tarjeta.intentosFallidos > 0) {
                                Text(
                                    stringResource(
                                        R.string.admin_intentos_fallidos,
                                        tarjeta.intentosFallidos,
                                    ),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.error,
                                )
                            }
                        }
                        if (indice < tarjetas.lastIndex) {
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
fun PantallaAdminReportes(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val resumen by modelo.resumenAdmin.collectAsState()
    val idioma by modelo.idioma.collectAsState()
    val contexto = LocalContext.current

    LaunchedEffect(Unit) { modelo.cargarResumenAdmin() }

    val encabezados = listOf(
        stringResource(R.string.admin_col_fecha),
        stringResource(R.string.admin_col_operacion),
        stringResource(R.string.admin_col_canal),
        stringResource(R.string.admin_col_origen),
        stringResource(R.string.admin_col_destino),
        stringResource(R.string.admin_col_estado),
        stringResource(R.string.admin_col_monto),
    )
    val titulo = stringResource(R.string.admin_menu_reportes)

    fun filas(): List<List<String>> = resumen?.ultimasOperaciones.orEmpty().map { operacion ->
        listOf(
            operacion.fecha?.let { formatearFecha(it, idioma) } ?: "",
            operacion.tipo,
            operacion.canal,
            operacion.origen.orEmpty(),
            operacion.destino.orEmpty(),
            operacion.estado,
            operacion.monto.toString(),
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = Dimensiones.margenPantalla),
        verticalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
    ) {
        item { EncabezadoOperacion(titulo, alVolver) }

        if (estado.cargando && resumen == null) {
            item { Cargando(etiqueta = stringResource(R.string.estado_cargando)) }
        }

        if (estado.error != null && resumen == null) {
            item {
                ErrorReintentable(
                    mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
                    alReintentar = { modelo.cargarResumenAdmin() },
                )
            }
        }

        resumen?.let { datos ->
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(Dimensiones.espacioCompacto),
                ) {
                    BotonSecundario(
                        texto = stringResource(R.string.admin_descargar_csv),
                        modifier = Modifier.weight(1f),
                    ) {
                        Exportacion.compartirCsv(
                            contexto,
                            Exportacion.nombreArchivo("reporte-operaciones"),
                            Exportacion.construirCsv(encabezados, filas()),
                            titulo,
                        )
                    }
                    BotonSecundario(
                        texto = stringResource(R.string.admin_imprimir),
                        modifier = Modifier.weight(1f),
                    ) {
                        Exportacion.imprimir(
                            contexto,
                            titulo,
                            Exportacion.construirHtml(titulo, encabezados, filas()),
                        )
                    }
                }
            }

            item { TituloSeccion(stringResource(R.string.admin_por_tipo)) }
            item {
                TarjetaAgrupada {
                    val porTipo = datos.ultimasOperaciones.groupBy { it.tipo }
                    if (porTipo.isEmpty()) {
                        Text(
                            stringResource(R.string.admin_sin_operaciones),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    porTipo.entries.forEachIndexed { indice, entrada ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = Dimensiones.espacioCompacto),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                etiquetaTipo(entrada.key),
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Text(
                                formatearMoneda(
                                    entrada.value.sumOf { it.monto },
                                    idioma,
                                ),
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                        if (indice < porTipo.size - 1) {
                            Separador()
                        }
                    }
                }
            }

            item { TituloSeccion(stringResource(R.string.admin_ultimas)) }
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
fun PantallaAdminAuditoria(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    val registros by modelo.auditoria.collectAsState()
    val idioma by modelo.idioma.collectAsState()
    val contexto = LocalContext.current
    var busqueda by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { modelo.cargarAuditoria() }

    val filtrados = registros.filter {
        val texto = busqueda.trim().uppercase()
        texto.isBlank() ||
            it.accion.uppercase().contains(texto) ||
            it.canal.uppercase().contains(texto) ||
            it.usuario.orEmpty().uppercase().contains(texto)
    }

    val encabezados = listOf(
        stringResource(R.string.admin_col_fecha),
        stringResource(R.string.admin_col_accion),
        stringResource(R.string.admin_col_canal),
        stringResource(R.string.admin_col_usuario),
        stringResource(R.string.admin_col_entidad),
        stringResource(R.string.admin_col_detalle),
    )
    val titulo = stringResource(R.string.admin_menu_auditoria)

    fun filas(): List<List<String>> = filtrados.map { registro ->
        listOf(
            registro.fecha?.let { formatearFecha(it, idioma) } ?: "",
            registro.accion,
            registro.canal,
            registro.usuario.orEmpty(),
            registro.entidadAfectada.orEmpty(),
            registro.detalle.orEmpty(),
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = Dimensiones.margenPantalla),
        verticalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
    ) {
        item { EncabezadoOperacion(titulo, alVolver) }

        item {
            CampoTexto(
                valor = busqueda,
                alCambiar = { busqueda = it },
                etiqueta = stringResource(R.string.admin_buscar_auditoria),
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(Dimensiones.espacioCompacto),
            ) {
                BotonSecundario(
                    texto = stringResource(R.string.admin_descargar_csv),
                    modifier = Modifier.weight(1f),
                ) {
                    Exportacion.compartirCsv(
                        contexto,
                        Exportacion.nombreArchivo("auditoria"),
                        Exportacion.construirCsv(encabezados, filas()),
                        titulo,
                    )
                }
                BotonSecundario(
                    texto = stringResource(R.string.admin_imprimir),
                    modifier = Modifier.weight(1f),
                ) {
                    Exportacion.imprimir(
                        contexto,
                        titulo,
                        Exportacion.construirHtml(titulo, encabezados, filas()),
                    )
                }
            }
        }

        if (estado.cargando && registros.isEmpty()) {
            item { Cargando(etiqueta = stringResource(R.string.estado_cargando)) }
        }

        if (estado.error != null && registros.isEmpty()) {
            item {
                ErrorReintentable(
                    mensaje = estado.errorDetalle ?: stringResource(estado.error!!),
                    alReintentar = { modelo.cargarAuditoria() },
                )
            }
        }

        if (filtrados.isEmpty() && !estado.cargando) {
            item { EstadoVacio(stringResource(R.string.admin_sin_auditoria)) }
        } else {
            item {
                TarjetaAgrupada {
                    filtrados.forEachIndexed { indice, registro ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = Dimensiones.espacioElemento),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    registro.accion,
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Insignia(registro.canal)
                            }
                            registro.fecha?.let {
                                Text(
                                    formatearFecha(it, idioma),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            if (!registro.usuario.isNullOrBlank()) {
                                Text(
                                    registro.usuario,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            if (!registro.detalle.isNullOrBlank()) {
                                Text(
                                    registro.detalle,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        if (indice < filtrados.lastIndex) {
                            Separador()
                        }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(Dimensiones.espacioSeccion)) }
    }
}
