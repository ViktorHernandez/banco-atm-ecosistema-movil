package mx.bancoatm.movil.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Grid4x4
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import mx.bancoatm.movil.R
import mx.bancoatm.movil.ui.pantallas.PantallaAcceso
import mx.bancoatm.movil.ui.pantallas.PantallaApartados
import mx.bancoatm.movil.ui.pantallas.PantallaAsistente
import mx.bancoatm.movil.ui.pantallas.PantallaAvisos
import mx.bancoatm.movil.ui.pantallas.PantallaDeposito
import mx.bancoatm.movil.ui.pantallas.PantallaInicio
import mx.bancoatm.movil.ui.pantallas.PantallaMas
import mx.bancoatm.movil.ui.pantallas.PantallaMovimientos
import mx.bancoatm.movil.ui.pantallas.PantallaOperar
import mx.bancoatm.movil.ui.pantallas.PantallaPagoServicio
import mx.bancoatm.movil.ui.pantallas.PantallaPerfil
import mx.bancoatm.movil.ui.pantallas.PantallaPrestamos
import mx.bancoatm.movil.ui.pantallas.PantallaRecuperar
import mx.bancoatm.movil.ui.pantallas.PantallaRegistro
import mx.bancoatm.movil.ui.pantallas.PantallaRetiro
import mx.bancoatm.movil.ui.pantallas.PantallaTarjetas
import mx.bancoatm.movil.ui.pantallas.PantallaTransferencia

object Rutas {
    const val ACCESO = "acceso"
    const val REGISTRO = "registro"
    const val RECUPERAR = "recuperar"
    const val INICIO = "inicio"
    const val MOVIMIENTOS = "movimientos"
    const val OPERAR = "operar"
    const val TARJETAS = "tarjetas"
    const val MAS = "mas"
    const val TRANSFERENCIA = "transferencia"
    const val PAGO = "pago"
    const val RETIRO = "retiro"
    const val DEPOSITO = "deposito"
    const val APARTADOS = "apartados"
    const val PRESTAMOS = "prestamos"
    const val AVISOS = "avisos"
    const val PERFIL = "perfil"
    const val ASISTENTE = "asistente"
}

private data class Pestana(
    val ruta: String,
    val etiqueta: Int,
    val icono: ImageVector,
)

private val pestanas = listOf(
    Pestana(Rutas.INICIO, R.string.menu_inicio, Icons.Filled.Home),
    Pestana(Rutas.MOVIMIENTOS, R.string.menu_movimientos, Icons.Filled.ListAlt),
    Pestana(Rutas.OPERAR, R.string.menu_operar, Icons.Filled.Grid4x4),
    Pestana(Rutas.TARJETAS, R.string.menu_tarjetas, Icons.Filled.CreditCard),
    Pestana(Rutas.MAS, R.string.menu_mas, Icons.Filled.MoreHoriz),
)

@Composable
fun NavegacionBanco(modelo: ModeloBanco) {
    val autenticado by modelo.autenticado.collectAsState()
    val navegador = rememberNavController()

    if (!autenticado) {
        var correoExistente by rememberSaveable { mutableStateOf("") }
        var avisoCuentaExistente by rememberSaveable { mutableStateOf(false) }

        NavHost(navController = navegador, startDestination = Rutas.ACCESO) {
            composable(Rutas.ACCESO) {
                PantallaAcceso(
                    modelo = modelo,
                    alRegistrarse = {
                        avisoCuentaExistente = false
                        navegador.navigate(Rutas.REGISTRO)
                    },
                    alRecuperar = { navegador.navigate(Rutas.RECUPERAR) },
                    correoInicial = correoExistente,
                    avisoInicial = avisoCuentaExistente,
                )
            }
            composable(Rutas.REGISTRO) {
                PantallaRegistro(
                    modelo = modelo,
                    alVolver = { navegador.popBackStack() },
                    alExistirCuenta = { correo ->
                        correoExistente = correo
                        avisoCuentaExistente = true
                        navegador.popBackStack(Rutas.ACCESO, inclusive = false)
                    },
                )
            }
            composable(Rutas.RECUPERAR) {
                PantallaRecuperar(modelo = modelo, alVolver = { navegador.popBackStack() })
            }
        }
        return
    }

    ContenedorPrincipal(modelo, navegador)
}

@Composable
private fun ContenedorPrincipal(modelo: ModeloBanco, navegador: NavHostController) {
    val entrada by navegador.currentBackStackEntryAsState()
    val rutaActual = entrada?.destination?.route
    val mostrarBarra = pestanas.any { it.ruta == rutaActual }

    Scaffold(
        bottomBar = {
            if (mostrarBarra) {
                NavigationBar {
                    pestanas.forEach { pestana ->
                        NavigationBarItem(
                            selected = rutaActual == pestana.ruta,
                            onClick = {
                                if (rutaActual != pestana.ruta) {
                                    navegador.navigate(pestana.ruta) {
                                        popUpTo(Rutas.INICIO) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = {
                                Icon(pestana.icono, contentDescription = null)
                            },
                            label = { Text(stringResource(pestana.etiqueta)) },
                        )
                    }
                }
            }
        },
    ) { relleno ->
        Box(Modifier.padding(relleno)) {
            NavHost(navController = navegador, startDestination = Rutas.INICIO) {
                composable(Rutas.INICIO) {
                    PantallaInicio(
                        modelo = modelo,
                        alVerMovimientos = { navegador.navigate(Rutas.MOVIMIENTOS) },
                        alOperar = { navegador.navigate(it) },
                    )
                }
                composable(Rutas.MOVIMIENTOS) { PantallaMovimientos(modelo) }
                composable(Rutas.OPERAR) {
                    PantallaOperar(alElegir = { navegador.navigate(it) })
                }
                composable(Rutas.TARJETAS) { PantallaTarjetas(modelo) }
                composable(Rutas.MAS) {
                    PantallaMas(
                        modelo = modelo,
                        alElegir = { navegador.navigate(it) },
                    )
                }
                composable(Rutas.TRANSFERENCIA) {
                    PantallaTransferencia(modelo) { navegador.popBackStack() }
                }
                composable(Rutas.PAGO) {
                    PantallaPagoServicio(modelo) { navegador.popBackStack() }
                }
                composable(Rutas.RETIRO) {
                    PantallaRetiro(modelo) { navegador.popBackStack() }
                }
                composable(Rutas.DEPOSITO) {
                    PantallaDeposito(modelo) { navegador.popBackStack() }
                }
                composable(Rutas.APARTADOS) {
                    PantallaApartados(modelo) { navegador.popBackStack() }
                }
                composable(Rutas.PRESTAMOS) {
                    PantallaPrestamos(modelo) { navegador.popBackStack() }
                }
                composable(Rutas.AVISOS) {
                    PantallaAvisos(modelo) { navegador.popBackStack() }
                }
                composable(Rutas.PERFIL) {
                    PantallaPerfil(modelo) { navegador.popBackStack() }
                }
                composable(Rutas.ASISTENTE) {
                    PantallaAsistente(modelo) { navegador.popBackStack() }
                }
            }
        }
    }
}
