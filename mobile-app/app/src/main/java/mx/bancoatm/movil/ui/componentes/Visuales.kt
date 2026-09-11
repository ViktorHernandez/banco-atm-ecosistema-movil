package mx.bancoatm.movil.ui.componentes

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import mx.bancoatm.movil.ui.Dimensiones

@Composable
fun IconoCircular(
    icono: ImageVector,
    descripcion: String? = null,
    fondo: Color = MaterialTheme.colorScheme.primaryContainer,
    tinte: Color = MaterialTheme.colorScheme.onPrimaryContainer,
    tamano: androidx.compose.ui.unit.Dp = Dimensiones.iconoCirculo,
) {
    Box(
        modifier = Modifier.size(tamano).background(fondo, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(imageVector = icono, contentDescription = descripcion, tint = tinte)
    }
}

@Composable
fun TarjetaSaldo(
    etiquetaSaldo: String,
    saldo: String,
    cuentaEnmascarada: String,
    visible: Boolean,
    descripcionAlternar: String,
    alAlternar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(Dimensiones.radioTarjetaGrande),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primary,
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = Dimensiones.elevacionDestacada,
        ),
    ) {
        Column(Modifier.padding(Dimensiones.rellenoTarjetaGrande)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    etiquetaSaldo,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(Dimensiones.espacioCompacto),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (cuentaEnmascarada.isNotBlank()) {
                        Row(
                            modifier = Modifier
                                .background(
                                    MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.16f),
                                    RoundedCornerShape(Dimensiones.radioIcono),
                                )
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.CreditCard,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(16.dp),
                            )
                            Text(
                                cuentaEnmascarada,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        }
                    }
                    IconButton(onClick = alAlternar) {
                        Icon(
                            imageVector = if (visible) {
                                Icons.Filled.VisibilityOff
                            } else {
                                Icons.Filled.Visibility
                            },
                            contentDescription = descripcionAlternar,
                            tint = MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                }
            }

            Spacer(Modifier.height(Dimensiones.espacioCompacto))

            Text(
                text = saldo,
                style = MaterialTheme.typography.displaySmall,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        }
    }
}

@Composable
fun AccesoCuadricula(
    texto: String,
    icono: ImageVector,
    modifier: Modifier = Modifier,
    alPulsar: () -> Unit,
) {
    Card(
        modifier = modifier
            .heightIn(min = Dimensiones.alturaAcceso)
            .semantics {
                role = Role.Button
                contentDescription = texto
            }
            .clickable(onClick = alPulsar),
        shape = RoundedCornerShape(Dimensiones.radioTarjeta),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = Dimensiones.elevacionTarjeta,
        ),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(Dimensiones.rellenoTarjeta),
            verticalArrangement = Arrangement.spacedBy(Dimensiones.espacioCompacto),
        ) {
            IconoCircular(icono = icono, tamano = 36.dp)
            Text(
                texto,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun FilaConIcono(
    icono: ImageVector,
    titulo: String,
    subtitulo: String?,
    detalle: String?,
    valor: String,
    colorValor: Color,
    fondoIcono: Color = MaterialTheme.colorScheme.primaryContainer,
    tinteIcono: Color = MaterialTheme.colorScheme.onPrimaryContainer,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = Dimensiones.espacioElemento),
        horizontalArrangement = Arrangement.spacedBy(Dimensiones.espacioElemento),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconoCircular(icono = icono, fondo = fondoIcono, tinte = tinteIcono)
        Column(Modifier.weight(1f)) {
            Text(
                titulo,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (!subtitulo.isNullOrBlank()) {
                Text(
                    subtitulo,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (!detalle.isNullOrBlank()) {
                Text(
                    detalle,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Text(
            text = valor,
            style = MaterialTheme.typography.titleMedium,
            color = colorValor,
            textAlign = TextAlign.End,
        )
    }
}
