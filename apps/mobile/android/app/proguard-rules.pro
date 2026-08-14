# Project-specific ProGuard/R8 rules.
#
# R8 is enabled for release builds via android.enableMinifyInReleaseBuilds in
# gradle.properties, together with resource shrinking. Anything reached only
# through reflection or JNI must be kept explicitly or the release build will
# crash where the debug build does not.

# ─── React Native core ──────────────────────────────────────────────────────
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keepclassmembers class * { @com.facebook.common.internal.DoNotStrip *; }

# Native methods and the JNI bridge.
-keepclasseswithmembernames class * { native <methods>; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.uimanager.** { *; }

# Methods invoked from JS via the bridge.
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod <methods>; }
-keepclassmembers class * extends com.facebook.react.bridge.JavaScriptModule { <methods>; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule { <methods>; }

# ─── Hermes ─────────────────────────────────────────────────────────────────
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.hermes.reactexecutor.** { *; }

# ─── New Architecture (Fabric / TurboModules) ───────────────────────────────
# newArchEnabled=true, so the generated codegen specs must survive.
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.viewmanagers.** { *; }
-dontwarn com.facebook.react.**

# ─── Expo ───────────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }
-keepclassmembers class * { @expo.modules.core.interfaces.ExpoMethod <methods>; }
-dontwarn expo.modules.**

# ─── Firebase / Google Play Services ────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ─── react-native-reanimated ────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.common.** { *; }
-dontwarn com.swmansion.**

# ─── react-native-screens / gesture-handler / safe-area ─────────────────────
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# ─── react-native-svg ───────────────────────────────────────────────────────
-keep public class com.horcrux.svg.** { *; }

# ─── react-native-maps ──────────────────────────────────────────────────────
-keep class com.rnmaps.maps.** { *; }
-dontwarn com.rnmaps.maps.**

# ─── react-native-callkeep ──────────────────────────────────────────────────
-keep class io.wazo.callkeep.** { *; }
-dontwarn io.wazo.callkeep.**

# ─── WatermelonDB (JSI + SQLite) ────────────────────────────────────────────
-keep class com.nozbe.watermelondb.** { *; }
-dontwarn com.nozbe.watermelondb.**

# ─── OkHttp / Okio (networking, used by RN and Firebase) ────────────────────
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ─── Gson / JSON reflection ─────────────────────────────────────────────────
# Gson resolves fields reflectively, so generic signatures and annotations must
# be preserved or deserialisation silently yields nulls in release builds.
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepclassmembers,allowobfuscation class * { @com.google.gson.annotations.SerializedName <fields>; }

# ─── Kotlin ─────────────────────────────────────────────────────────────────
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# ─── Stripe (transitively present, not used) ────────────────────────────────
-dontwarn com.stripe.android.pushProvisioning.**

# ─── Readable release stack traces ──────────────────────────────────────────
# Without these, a production crash report is unmappable line noise.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
