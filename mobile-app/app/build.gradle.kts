import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

val archivoFirma = rootProject.file("keystore.properties")
val datosFirma = Properties().apply {
    if (archivoFirma.exists()) {
        archivoFirma.inputStream().use { load(it) }
    }
}

fun valorFirma(clave: String): String? =
    (datosFirma.getProperty(clave) ?: System.getenv(clave))?.takeIf { it.isNotBlank() }

val rutaAlmacenClaves = valorFirma("ALMACEN_CLAVES_RUTA")
val firmaConfigurada = rutaAlmacenClaves != null &&
    rootProject.file(rutaAlmacenClaves).exists() &&
    valorFirma("ALMACEN_CLAVES_PASSWORD") != null &&
    valorFirma("CLAVE_ALIAS") != null &&
    valorFirma("CLAVE_PASSWORD") != null

android {
    namespace = "mx.bancoatm.movil"
    compileSdk = 35

    defaultConfig {
        applicationId = "mx.bancoatm.movil"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        vectorDrawables { useSupportLibrary = true }
    }

    signingConfigs {
        if (firmaConfigurada) {
            create("publicacion") {
                storeFile = rootProject.file(rutaAlmacenClaves!!)
                storePassword = valorFirma("ALMACEN_CLAVES_PASSWORD")
                keyAlias = valorFirma("CLAVE_ALIAS")
                keyPassword = valorFirma("CLAVE_PASSWORD")
                enableV1Signing = true
                enableV2Signing = true
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            buildConfigField("String", "API_LOCAL", "\"http://10.0.2.2:3000\"")
            buildConfigField(
                "String",
                "API_PRODUCCION",
                "\"https://banco-atm-api-movil.onrender.com\"",
            )
            buildConfigField("boolean", "USAR_PRODUCCION", "true")
            buildConfigField("boolean", "PERMITIR_ENTORNO_LOCAL", "true")
        }
        release {
            if (firmaConfigurada) {
                signingConfig = signingConfigs.getByName("publicacion")
            }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            buildConfigField("String", "API_LOCAL", "\"http://10.0.2.2:3000\"")
            buildConfigField(
                "String",
                "API_PRODUCCION",
                "\"https://banco-atm-api-movil.onrender.com\"",
            )
            buildConfigField("boolean", "USAR_PRODUCCION", "true")
            buildConfigField("boolean", "PERMITIR_ENTORNO_LOCAL", "false")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    }

    testOptions {
        unitTests {
            isReturnDefaultValues = true
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.navigation:navigation-compose:2.8.4")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("org.json:json:20240303")

    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
