# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo and Firebase
-keep class expo.modules.** { *; }
-keep class com.google.firebase.** { *; }

# OkHttp and Networking
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Gson / JSON
-keep class com.google.gson.** { *; }

# Ignore Stripe missing classes
-dontwarn com.stripe.android.pushProvisioning.**

# WatermelonDB
-keep class com.nozbe.watermelondb.** { *; }
-dontwarn com.nozbe.watermelondb.**

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
