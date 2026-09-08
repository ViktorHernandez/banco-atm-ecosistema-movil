-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses,EnclosingMethod
-keepattributes SourceFile,LineNumberTable

-keep class mx.bancoatm.movil.data.** { *; }

-keep class org.json.** { *; }
-dontwarn org.json.**

-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

-dontwarn kotlinx.coroutines.**
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
