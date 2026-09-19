package mx.bancoatm.movil.ui

import android.content.Context
import android.content.Intent
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.content.FileProvider
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object Exportacion {

    fun construirCsv(encabezados: List<String>, filas: List<List<String>>): String {
        val constructor = StringBuilder()
        constructor.append(encabezados.joinToString(",") { escapar(it) })
        constructor.append("\r\n")
        filas.forEach { fila ->
            constructor.append(fila.joinToString(",") { escapar(it) })
            constructor.append("\r\n")
        }
        return constructor.toString()
    }

    fun escapar(valor: String): String {
        val limpio = valor.replace("\r", " ").replace("\n", " ")
        return if (limpio.contains(',') || limpio.contains('"')) {
            "\"" + limpio.replace("\"", "\"\"") + "\""
        } else {
            limpio
        }
    }

    fun nombreArchivo(prefijo: String): String {
        val marca = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        return "$prefijo-$marca.csv"
    }

    fun compartirCsv(contexto: Context, nombre: String, contenido: String, asunto: String) {
        val carpeta = File(contexto.cacheDir, "exportaciones")
        if (!carpeta.exists()) {
            carpeta.mkdirs()
        }

        val archivo = File(carpeta, nombre)
        archivo.writeText(contenido, Charsets.UTF_8)

        val uri = FileProvider.getUriForFile(
            contexto,
            contexto.packageName + ".exportaciones",
            archivo,
        )

        val intencion = Intent(Intent.ACTION_SEND).apply {
            type = "text/csv"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, asunto)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        contexto.startActivity(
            Intent.createChooser(intencion, asunto).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
        )
    }

    fun construirHtml(titulo: String, encabezados: List<String>, filas: List<List<String>>): String {
        val cabecera = encabezados.joinToString("") { "<th>${escaparHtml(it)}</th>" }
        val cuerpo = filas.joinToString("") { fila ->
            "<tr>" + fila.joinToString("") { "<td>${escaparHtml(it)}</td>" } + "</tr>"
        }
        return "<html><head><meta charset=\"utf-8\"><style>" +
            "body{font-family:sans-serif;padding:16px;color:#101418}" +
            "h1{font-size:18px;margin-bottom:12px}" +
            "table{width:100%;border-collapse:collapse;font-size:11px}" +
            "th,td{border-bottom:1px solid #d6dee6;padding:6px;text-align:left}" +
            "th{background:#eef3f8}" +
            "</style></head><body><h1>" + escaparHtml(titulo) + "</h1>" +
            "<table><thead><tr>" + cabecera + "</tr></thead><tbody>" + cuerpo +
            "</tbody></table></body></html>"
    }

    fun escaparHtml(valor: String): String = valor
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

    fun imprimir(contexto: Context, titulo: String, html: String) {
        val vista = WebView(contexto)
        vista.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                val gestor = contexto.getSystemService(Context.PRINT_SERVICE) as PrintManager
                val adaptador = view.createPrintDocumentAdapter(titulo)
                gestor.print(
                    titulo,
                    adaptador,
                    PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .build(),
                )
            }
        }
        vista.loadDataWithBaseURL(null, html, "text/HTML", "UTF-8", null)
    }
}
