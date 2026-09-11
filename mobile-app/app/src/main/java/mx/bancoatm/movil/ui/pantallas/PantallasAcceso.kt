package mx.bancoatm.movil.ui.pantallas

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
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

@Composable
private fun ContenedorFormulario(
    titulo: String,
    contenido: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Spacer(Modifier.height(24.dp))
        Text(
            titulo,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.semantics { heading() },
        )
        contenido()
    }
}

@Composable
fun PantallaAcceso(
    modelo: ModeloBanco,
    alRegistrarse: () -> Unit,
    alRecuperar: () -> Unit,
    correoInicial: String = "",
    avisoInicial: Boolean = false,
) {
    val estado by modelo.estado.collectAsState()
    var correo by remember { mutableStateOf(correoInicial) }
    var password by remember { mutableStateOf("") }
    var codigo by remember { mutableStateOf("") }
    var pideSegundoFactor by remember { mutableStateOf(false) }

    ContenedorFormulario(stringResource(R.string.acceso_titulo)) {
        if (avisoInicial) {
            MensajeEstado(
                texto = stringResource(R.string.registro_cuenta_existente),
                esError = false,
            )
        }
        CampoTexto(
            valor = correo,
            alCambiar = { correo = it; modelo.limpiarEstado() },
            etiqueta = stringResource(R.string.acceso_correo),
            tipoTeclado = KeyboardType.Email,
        )
        CampoTexto(
            valor = password,
            alCambiar = { password = it; modelo.limpiarEstado() },
            etiqueta = stringResource(R.string.acceso_password),
            esPassword = true,
        )

        if (pideSegundoFactor) {
            CampoTexto(
                valor = codigo,
                alCambiar = { codigo = it },
                etiqueta = stringResource(R.string.acceso_totp),
                tipoTeclado = KeyboardType.NumberPassword,
                apoyo = stringResource(R.string.acceso_totp_ayuda),
            )
        }

        MensajeEstado(
            texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
            esError = true,
        )

        BotonPrincipal(
            texto = stringResource(R.string.accion_entrar),
            cargando = estado.procesando,
            habilitado = correo.isNotBlank() && password.isNotBlank(),
            alPulsar = {
                modelo.iniciarSesion(
                    correo = correo,
                    password = password,
                    codigoTotp = codigo.ifBlank { null },
                    alRequerirSegundoFactor = { pideSegundoFactor = true },
                    alEntrar = { },
                )
            },
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = alRecuperar) {
                Text(stringResource(R.string.acceso_olvido))
            }
            TextButton(onClick = alRegistrarse) {
                Text(stringResource(R.string.acceso_crear))
            }
        }

        SelectorIdioma(modelo)
    }
}

@Composable
fun PantallaRegistro(
    modelo: ModeloBanco,
    alVolver: () -> Unit,
    alExistirCuenta: (String) -> Unit = {},
) {
    val estado by modelo.estado.collectAsState()
    var nombre by remember { mutableStateOf("") }
    var correo by remember { mutableStateOf("") }
    var telefono by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var repetir by remember { mutableStateOf("") }
    var codigo by remember { mutableStateOf("") }
    var enviado by remember { mutableStateOf(false) }
    var verificado by remember { mutableStateOf(false) }

    val distintas = repetir.isNotBlank() && password != repetir

    ContenedorFormulario(stringResource(R.string.registro_titulo)) {
        if (!enviado) {
            CampoTexto(nombre, { nombre = it }, stringResource(R.string.registro_nombre))
            CampoTexto(
                correo,
                { correo = it },
                stringResource(R.string.acceso_correo),
                tipoTeclado = KeyboardType.Email,
            )
            CampoTexto(
                telefono,
                { telefono = it },
                stringResource(R.string.registro_telefono),
                tipoTeclado = KeyboardType.Phone,
            )
            CampoTexto(
                password,
                { password = it },
                stringResource(R.string.acceso_password),
                esPassword = true,
            )
            CampoTexto(
                valor = repetir,
                alCambiar = { repetir = it },
                etiqueta = stringResource(R.string.registro_password_repetir),
                esPassword = true,
                error = distintas,
                apoyo = if (distintas) {
                    stringResource(R.string.registro_password_distinta)
                } else {
                    null
                },
            )

            MensajeEstado(
                texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
                esError = true,
            )

            BotonPrincipal(
                texto = stringResource(R.string.accion_continuar),
                cargando = estado.procesando,
                habilitado = nombre.isNotBlank() && correo.isNotBlank() &&
                    telefono.isNotBlank() && password.length >= 8 && !distintas,
                alPulsar = {
                    modelo.registrar(
                        nombre = nombre,
                        correo = correo,
                        telefono = telefono,
                        password = password,
                        alRegistrar = { enviado = true },
                        alExistirCuenta = alExistirCuenta,
                    )
                },
            )
        } else if (!verificado) {
            Text(
                stringResource(R.string.registro_enviado),
                style = MaterialTheme.typography.bodyMedium,
            )
            CampoTexto(
                codigo,
                { codigo = it },
                stringResource(R.string.registro_codigo),
                tipoTeclado = KeyboardType.NumberPassword,
            )

            MensajeEstado(
                texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
                esError = true,
            )

            BotonPrincipal(
                texto = stringResource(R.string.registro_verificar),
                cargando = estado.procesando,
                habilitado = codigo.length == 6,
                alPulsar = {
                    modelo.verificarCorreo(correo, codigo) { verificado = true }
                },
            )
            TextButton(onClick = { modelo.reenviarCodigo(correo) }) {
                Text(stringResource(R.string.registro_reenviar))
            }
        } else {
            MensajeEstado(
                texto = stringResource(R.string.registro_listo),
                esError = false,
            )
            BotonPrincipal(
                texto = stringResource(R.string.accion_entrar),
                alPulsar = alVolver,
            )
        }

        TextButton(onClick = alVolver) { Text(stringResource(R.string.accion_volver)) }
    }
}

@Composable
fun PantallaRecuperar(modelo: ModeloBanco, alVolver: () -> Unit) {
    val estado by modelo.estado.collectAsState()
    var correo by remember { mutableStateOf("") }
    var codigo by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var solicitado by remember { mutableStateOf(false) }
    var listo by remember { mutableStateOf(false) }

    ContenedorFormulario(stringResource(R.string.recuperar_titulo)) {
        if (!solicitado) {
            CampoTexto(
                correo,
                { correo = it },
                stringResource(R.string.acceso_correo),
                tipoTeclado = KeyboardType.Email,
            )
            MensajeEstado(
                texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
                esError = true,
            )
            BotonPrincipal(
                texto = stringResource(R.string.recuperar_solicitar),
                cargando = estado.procesando,
                habilitado = correo.isNotBlank(),
                alPulsar = {
                    modelo.solicitarRecuperacion(correo) { solicitado = true }
                },
            )
        } else if (!listo) {
            MensajeEstado(
                texto = stringResource(R.string.recuperar_enviado),
                esError = false,
            )
            CampoTexto(
                codigo,
                { codigo = it },
                stringResource(R.string.registro_codigo),
                tipoTeclado = KeyboardType.NumberPassword,
            )
            CampoTexto(
                password,
                { password = it },
                stringResource(R.string.recuperar_nueva),
                esPassword = true,
            )
            MensajeEstado(
                texto = estado.errorDetalle ?: estado.error?.let { stringResource(it) },
                esError = true,
            )
            BotonPrincipal(
                texto = stringResource(R.string.accion_guardar),
                cargando = estado.procesando,
                habilitado = codigo.isNotBlank() && password.length >= 8,
                alPulsar = {
                    modelo.restablecerPassword(correo, codigo, password) { listo = true }
                },
            )
        } else {
            MensajeEstado(stringResource(R.string.recuperar_listo), esError = false)
            BotonPrincipal(
                texto = stringResource(R.string.accion_entrar),
                alPulsar = alVolver,
            )
        }

        TextButton(onClick = alVolver) { Text(stringResource(R.string.accion_volver)) }
    }
}

@Composable
fun SelectorIdioma(modelo: ModeloBanco) {
    val idioma by modelo.idioma.collectAsState()

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
    ) {
        TextButton(
            onClick = { modelo.cambiarIdioma("es") },
            enabled = idioma != "es",
        ) { Text("Español") }
        TextButton(
            onClick = { modelo.cambiarIdioma("en") },
            enabled = idioma != "en",
        ) { Text("English") }
    }
}
