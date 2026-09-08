package mx.bancoatm.movil

import android.Manifest
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import mx.bancoatm.movil.ui.ModeloBanco
import mx.bancoatm.movil.ui.NavegacionBanco
import mx.bancoatm.movil.ui.TemaBancoAtm
import mx.bancoatm.movil.ui.localeDe

class MainActivity : ComponentActivity() {

    private val permisoNotificaciones = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val aplicacion = application as AplicacionBanco

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permisoNotificaciones.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        val fabrica = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                ModeloBanco(aplicacion.repositorio, aplicacion.sesion) as T
        }

        setContent {
            val modelo: ModeloBanco = viewModel(factory = fabrica)
            val idioma by modelo.idioma.collectAsState()

            val contextoLocalizado = remember(idioma) {
                aplicarIdioma(this, idioma)
            }

            val configuracion = LocalConfiguration.current

            CompositionLocalProvider(
                LocalContext provides contextoLocalizado,
                LocalConfiguration provides configuracion,
            ) {
                TemaBancoAtm {
                    NavegacionBanco(modelo)
                }
            }
        }
    }

    private fun aplicarIdioma(contexto: Context, idioma: String): Context {
        val configuracion = Configuration(contexto.resources.configuration)
        configuracion.setLocale(localeDe(idioma))
        return contexto.createConfigurationContext(configuracion)
    }
}
