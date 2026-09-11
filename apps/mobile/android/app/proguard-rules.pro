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

# ─── Razorpay (react-native-razorpay) ───────────────────────────────────────
# The Razorpay checkout SDK is the primary payment path. Its Activity, the
# native bridge (com.razorpay.rn) and the SDK itself are all reached
# reflectively, and checkout runs in a WebView that calls back into Java over
# an @JavascriptInterface bridge. R8 renames those bridge methods unless
# JavascriptInterface is kept as an attribute, which silently breaks the
# payment callback in release while debug works fine.
-keep class com.razorpay.** { *; }
-keep class com.razorpay.rn.** { *; }
-dontwarn com.razorpay.**
-keepattributes JavascriptInterface
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet, int);
}
# Razorpay bundles proguard.annotation markers on classes it needs preserved.
-keep class proguard.annotation.Keep
-keep class proguard.annotation.KeepClassMembers
-keep @proguard.annotation.Keep class * { *; }
-keepclassmembers class * { @proguard.annotation.KeepClassMembers *; }

# ─── Stripe (@stripe/stripe-react-native) ───────────────────────────────────
# Declared in package.json and wired through app.json's plugin list, so the
# native SDK really is in the APK. It uses Kotlin serialization and reflection
# throughout; keeping only the pushProvisioning dontwarn was not enough.
-keep class com.reactnativestripesdk.** { *; }
-keep class com.stripe.android.** { *; }
-dontwarn com.stripe.android.**
-dontwarn com.stripe.android.pushProvisioning.**

# ─── react-native-webrtc (intercom / voice) ─────────────────────────────────
# org.webrtc is the prebuilt native AAR: every class there is bound over JNI
# from libjingle_peerconnection_so, so obfuscating it breaks the linkage at
# runtime with UnsatisfiedLinkError.
-keep class org.webrtc.** { *; }
-keep class com.oney.WebRTCModule.** { *; }
-dontwarn org.webrtc.**
-dontwarn com.oney.WebRTCModule.**

# ─── react-native-webview ───────────────────────────────────────────────────
-keep class com.reactnativecommunity.webview.** { *; }

# ─── react-native-vision-camera / Nitro modules ─────────────────────────────
# Nitro resolves hybrid objects by their registered class names from C++.
-keep class com.margelo.nitro.** { *; }
-keep class com.mrousavy.camera.** { *; }
-dontwarn com.margelo.nitro.**

# ─── react-native-worklets ──────────────────────────────────────────────────
-keep class com.swmansion.worklets.** { *; }
-dontwarn com.swmansion.worklets.**

# ─── Sentry ─────────────────────────────────────────────────────────────────
# Keeping line numbers alone is not enough: Sentry's own integrations are
# instantiated by name from the manifest/options.
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# ─── Readable release stack traces ──────────────────────────────────────────
# Without these, a production crash report is unmappable line noise.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
