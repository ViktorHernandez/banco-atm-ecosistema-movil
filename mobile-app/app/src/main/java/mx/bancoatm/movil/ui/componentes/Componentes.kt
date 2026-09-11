package mx.bancoatm.movil.ui.componentes

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import mx.bancoatm.movil.R
import mx.bancoatm.movil.ui.Dimensiones

@Composable
fun CampoTexto(
    valor: String,
    alCambiar: (String) -> Unit,
    etiqueta: String,
    modifier: Modifier = Modifier,
    tipoTeclado: KeyboardType = KeyboardType.Text,
    esPassword: Boolean = false,
    soloLectura: Boolean = false,
    apoyo: String? = null,
    error: Boolean = false,
) {
    var visible by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = valor,
        onValueChange = alCambiar,
        label = { Text(etiqueta) },
        singleLine = true,
        readOnly = soloLectura,
        isError = error,
        supportingText = apoyo?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(keyboardType = tipoTeclado),
        visualTransformation = when {
            !esPassword -> VisualTransformation.None
            visible -> VisualTransformation.None
            else -> PasswordVisualTransformation()
        },
        trailingIcon = if (esPassword) {
            {
                IconButton(onClick = { visible = !visible }) {
                    Icon(
                        imageVector = if (visible) {
                            Icons.Filled.VisibilityOff
                        } else {
                            Icons.Filled.Visibility
                        },
                        contentDescription = stringResource(
                            if (visible) {
                                R.string.accion_ocultar_password
                            } else {
                                R.string.accion_mostrar_password
                            },
                        ),
                    )
                }
            }
        } else {
            null
        },
        modifier = modifier.fillMaxWidth(),
    )
}

@Composable
fun BotonPrincipal(
    texto: String,
    alPulsar: () -> Unit,
    modifier: Modifier = Modifier,
    habilitado: Boolean = true,
    cargando: Boolean = false,
) {
    Button(
        onClick = alPulsar,
        enabled = habilitado && !cargando,
        modifier = modifier.fillMaxWidth().height(52.dp),
    ) {
        if (cargando) {
            CircularProgressIndicator(
                modifier = Modifier.height(20.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        } else {
            Text(texto, style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
fun MensajeEstado(
    texto: String?,
    esError: Boolean,
    modifier: Modifier = Modifier,
) {
    if (texto.isNullOrBlank()) {
        return
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite },
        colors = CardDefaults.cardColors(
            containerColor = if (esError) {
                MaterialTheme.colorScheme.errorContainer
            } else {
                MaterialTheme.colorScheme.primaryContainer
            },
        ),
    ) {
        Text(
            text = texto,
            modifier = Modifier.padding(14.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = if (esError) {
                MaterialTheme.colorScheme.onErrorContainer
            } else {
                MaterialTheme.colorScheme.onPrimaryContainer
            },
        )
    }
}

@Composable
fun Cargando(modifier: Modifier = Modifier, etiqueta: String? = null) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator()
            if (etiqueta != null) {
                Spacer(Modifier.height(12.dp))
                Text(
                    etiqueta,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.semantics {
                        liveRegion = LiveRegionMode.Polite
                    },
                )
            }
        }
    }
}

@Composable
fun EstadoVacio(texto: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxWidth().padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            texto,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun TituloSeccion(
    texto: String,
    modifier: Modifier = Modifier,
    accion: (() -> Unit)? = null,
    textoAccion: String? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            texto,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.semantics { heading() },
        )
        if (accion != null && textoAccion != null) {
            TextButton(onClick = accion) { Text(textoAccion) }
        }
    }
}

@Composable
fun ErrorReintentable(
    mensaje: String,
    alReintentar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            mensaje,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive },
        )
        Spacer(Modifier.height(12.dp))
        TextButton(onClick = alReintentar) {
            Text(stringResource(R.string.accion_reintentar))
        }
    }
}

@Composable
fun DecorativoInvisible(contenido: @Composable () -> Unit) {
    Box(modifier = Modifier.clearAndSetSemantics { contentDescription = "" }) {
        contenido()
    }
}

@Composable
fun TarjetaAccion(
    modifier: Modifier = Modifier,
    descripcion: String? = null,
    alPulsar: () -> Unit,
    contenido: @Composable () -> Unit,
) {
    Card(
        modifier = modifier
            .semantics {
                role = Role.Button
                if (descripcion != null) {
                    contentDescription = descripcion
                }
            }
            .clickable(onClick = alPulsar),
        shape = RoundedCornerShape(Dimensiones.radioTarjeta),
    ) {
        contenido()
    }
}

@Composable
fun BarraProgreso(
    porcentaje: Int,
    descripcion: String,
    modifier: Modifier = Modifier,
) {
    val fraccion = (porcentaje.coerceIn(0, 100)) / 100f

    LinearProgressIndicator(
        progress = { fraccion },
        modifier = modifier.fillMaxWidth().semantics {
            contentDescription = descripcion
            progressBarRangeInfo = ProgressBarRangeInfo(fraccion, 0f..1f)
        },
    )
}
