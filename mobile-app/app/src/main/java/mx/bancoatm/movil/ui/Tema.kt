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
    background = Color(0xFFF2F5F9),
    onBackground = Color(0xFF101418),
    surface = Color.White,
    onSurface = Color(0xFF101418),
    surfaceVariant = Color(0xFFEEF3F8),
    onSurfaceVariant = Color(0xFF5A6570),
    outline = Color(0xFFD6DEE6),
    outlineVariant = Color(0xFFE8EEF4),
    surfaceTint = Color.Transparent,
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
    background = Color(0xFF0C1014),
    onBackground = Color(0xFFE6E9EC),
    surface = Color(0xFF161B20),
    onSurface = Color(0xFFE6E9EC),
    surfaceVariant = Color(0xFF212930),
    onSurfaceVariant = Color(0xFFA8B2BC),
    outline = Color(0xFF333C45),
    outlineVariant = Color(0xFF262E36),
    surfaceTint = Color.Transparent,
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
)

object ColoresTarjeta {
    val acero = Color(0xFF37474F)
    val oro = Color(0xFF8A6A16)
    val platino = Color(0xFF4A5568)
    val obsidiana = Color(0xFF17202A)
    val debito = Color(0xFF0B4F6C)
}

object Dimensiones {
    val radioTarjeta = 22.dp
    val radioTarjetaGrande = 28.dp
    val radioControl = 16.dp
    val radioIcono = 12.dp
    val radioInsignia = 10.dp

    val espacioSeccion = 24.dp
    val espacioElemento = 12.dp
    val espacioCompacto = 8.dp
    val espacioMinimo = 4.dp
    val margenPantalla = 20.dp
    val rellenoTarjeta = 18.dp
    val rellenoTarjetaGrande = 24.dp
    val rellenoLista = 16.dp

    val elevacionTarjeta = 0.dp
    val elevacionDestacada = 3.dp

    val iconoCirculo = 44.dp
    val iconoCirculoCompacto = 38.dp
    val alturaAcceso = 104.dp
    val alturaControl = 54.dp
    val areaTactilMinima = 48.dp
}

private val tipografia = Typography(
    displayMedium = TextStyle(
        fontSize = 38.sp,
        lineHeight = 44.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-1).sp,
    ),
    displaySmall = TextStyle(
        fontSize = 34.sp,
        lineHeight = 40.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.8).sp,
    ),
    headlineMedium = TextStyle(
        fontSize = 27.sp,
        lineHeight = 33.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.5).sp,
    ),
    headlineSmall = TextStyle(
        fontSize = 22.sp,
        lineHeight = 28.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.3).sp,
    ),
    titleLarge = TextStyle(fontSize = 19.sp, lineHeight = 25.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 23.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    labelLarge = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.SemiBold),
    labelMedium = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Medium),
    labelSmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
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
