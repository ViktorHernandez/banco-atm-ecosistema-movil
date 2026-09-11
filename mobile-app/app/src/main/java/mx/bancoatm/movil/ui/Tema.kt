package mx.bancoatm.movil.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Primario = Color(0xFF0B4F6C)
private val PrimarioClaro = Color(0xFF1E7BA6)
private val Acento = Color(0xFF01A7C2)
private val Peligro = Color(0xFFB3261E)
private val Exito = Color(0xFF1B6B3A)

private val esquemaClaro = lightColorScheme(
    primary = Primario,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD3E9F3),
    onPrimaryContainer = Color(0xFF04303F),
    secondary = Acento,
    onSecondary = Color.White,
    tertiary = Exito,
    background = Color(0xFFF6F8FA),
    onBackground = Color(0xFF14181B),
    surface = Color.White,
    onSurface = Color(0xFF14181B),
    surfaceVariant = Color(0xFFE6ECF0),
    onSurfaceVariant = Color(0xFF43494D),
    error = Peligro,
    onError = Color.White,
)

private val esquemaOscuro = darkColorScheme(
    primary = PrimarioClaro,
    onPrimary = Color(0xFF00293A),
    primaryContainer = Color(0xFF0B4F6C),
    onPrimaryContainer = Color(0xFFD3E9F3),
    secondary = Acento,
    onSecondary = Color(0xFF00303A),
    tertiary = Color(0xFF6FD79B),
    background = Color(0xFF101417),
    onBackground = Color(0xFFE1E3E5),
    surface = Color(0xFF181D21),
    onSurface = Color(0xFFE1E3E5),
    surfaceVariant = Color(0xFF2A3136),
    onSurfaceVariant = Color(0xFFC0C7CC),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
)

object Dimensiones {
    val radioTarjeta = 20.dp
    val radioTarjetaGrande = 24.dp
    val radioControl = 14.dp
    val radioIcono = 14.dp

    val espacioSeccion = 20.dp
    val espacioElemento = 12.dp
    val espacioCompacto = 8.dp
    val margenPantalla = 16.dp
    val rellenoTarjeta = 18.dp
    val rellenoTarjetaGrande = 22.dp

    val elevacionTarjeta = 0.dp
    val elevacionDestacada = 2.dp

    val iconoCirculo = 40.dp
    val alturaAcceso = 96.dp
}

private val tipografia = Typography(
    displayMedium = TextStyle(fontSize = 36.sp, fontWeight = FontWeight.Bold),
    displaySmall = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.Bold),
    headlineMedium = TextStyle(fontSize = 26.sp, fontWeight = FontWeight.Bold),
    headlineSmall = TextStyle(fontSize = 21.sp, fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontSize = 19.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Medium),
    bodyLarge = TextStyle(fontSize = 16.sp),
    bodyMedium = TextStyle(fontSize = 14.sp),
    labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium),
    labelMedium = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Medium),
    labelSmall = TextStyle(fontSize = 12.sp),
)

@Composable
fun TemaBancoAtm(
    oscuro: Boolean = isSystemInDarkTheme(),
    contenido: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (oscuro) esquemaOscuro else esquemaClaro,
        typography = tipografia,
        content = contenido,
    )
}
