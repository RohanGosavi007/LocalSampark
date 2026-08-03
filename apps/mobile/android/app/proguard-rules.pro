# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ══════════════════════════════════════════════════════════════════════
# React Native Core
# ══════════════════════════════════════════════════════════════════════
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers class * {
    @com.facebook.proguard.annotations.KeepGettersAndSetters *;
}

# ══════════════════════════════════════════════════════════════════════
# react-native-reanimated
# ══════════════════════════════════════════════════════════════════════
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ══════════════════════════════════════════════════════════════════════
# react-native-gesture-handler
# ══════════════════════════════════════════════════════════════════════
-keep class com.swmansion.gesturehandler.** { *; }

# ══════════════════════════════════════════════════════════════════════
# react-native-screens
# ══════════════════════════════════════════════════════════════════════
-keep class com.swmansion.rnscreens.** { *; }

# ══════════════════════════════════════════════════════════════════════
# react-native-svg
# ══════════════════════════════════════════════════════════════════════
-keep class com.horcrux.svg.** { *; }

# ══════════════════════════════════════════════════════════════════════
# react-native-maps
# ══════════════════════════════════════════════════════════════════════
-keep class com.airbnb.android.react.maps.** { *; }

# ══════════════════════════════════════════════════════════════════════
# WatermelonDB (@nozbe/watermelondb) — uses JNI/reflection for SQLite
# ══════════════════════════════════════════════════════════════════════
-keep class com.nozbe.watermelondb.** { *; }

# ══════════════════════════════════════════════════════════════════════
# Stripe (@stripe/stripe-react-native)
# ══════════════════════════════════════════════════════════════════════
-keep class com.stripe.** { *; }
-keep class com.reactnativestripesdk.** { *; }
-dontwarn com.stripe.android.pushProvisioning.**

# ══════════════════════════════════════════════════════════════════════
# Razorpay (react-native-razorpay)
# ══════════════════════════════════════════════════════════════════════
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# ══════════════════════════════════════════════════════════════════════
# Expo modules
# ══════════════════════════════════════════════════════════════════════
-keep class expo.modules.** { *; }

# ══════════════════════════════════════════════════════════════════════
# OkHttp & Okio (networking)
# ══════════════════════════════════════════════════════════════════════
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ══════════════════════════════════════════════════════════════════════
# Prevent R8 from stripping interfaces used by reflection
# ══════════════════════════════════════════════════════════════════════
-keep interface * { *; }

# Add any project specific keep options here:

# ══════════════════════════════════════════════════════════════════════
# Supabase & Firebase
# ══════════════════════════════════════════════════════════════════════
-keep class io.supabase.** { *; }
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ══════════════════════════════════════════════════════════════════════
# Hermes Engine (critical for release builds)
# ══════════════════════════════════════════════════════════════════════
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.hermes.**

# ══════════════════════════════════════════════════════════════════════
# AsyncStorage & SecureStore — used for session persistence
# ══════════════════════════════════════════════════════════════════════
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ══════════════════════════════════════════════════════════════════════
# SoLoader — required for native library loading on app startup
# ══════════════════════════════════════════════════════════════════════
-keep class com.facebook.soloader.** { *; }
-dontwarn com.facebook.soloader.**

# ══════════════════════════════════════════════════════════════════════
# React Native Networking (Fetch API bridge)
# ══════════════════════════════════════════════════════════════════════
-keep class com.facebook.react.modules.network.** { *; }

# ══════════════════════════════════════════════════════════════════════
# Prevent R8 from removing annotations used by Kotlin serialization
# ══════════════════════════════════════════════════════════════════════
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
