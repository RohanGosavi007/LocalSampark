# Milestone M7: Android Release Hardening, Permissions & E2E Smoke Design Spec

## 1. Executive Summary & Objective

Milestone M7 accomplishes production-grade Android release hardening for LocalSampark, satisfying Google Play Store policy compliance and operational release requirements:
- **N12 (Android Permission Audit & Hardening)**: Complete audit and strict declaration of only essential runtime permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `INTERNET`, `POST_NOTIFICATIONS`, `VIBRATE`). Complete elimination of dangerous or undeclared permissions (`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `BIND_TELECOM_CONNECTION_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`).
- **N16 (AAB & Release Toolchain)**: Release bundle configuration, keystore properties template for Google Play App Signing, and ProGuard / Hermes bytecode optimization rules.
- **E2E Smoke & Mobile Regression Verification**: Comprehensive Jest test suite execution across mobile components, edge rankers, geofence monitors, secure storage, and permission isolation.

---

## 2. Permission Hardening (N12)

### 2.1 Google Play Policy Compliance & Gating

Under Google Play policies, declaring telephony connection services (`BIND_TELECOM_CONNECTION_SERVICE`) or microphone recording (`RECORD_AUDIO`) triggers strict app rejection unless the app listing's core primary purpose is VOIP calling. 

For the LocalSampark hyper-local commerce and delivery platform:
1. **Telecom Connection Service Removed**: `withCallKeepConnectionService` and `VoiceConnectionService` have been completely stripped from `app.json` and `AndroidManifest.xml`.
2. **Microphone Permissions Removed**: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, and `FOREGROUND_SERVICE_MICROPHONE` removed from all configs and manifests.
3. **Storage Permissions Modernized**:
   - Modern Android (API 33+) provides the system Photo Picker, which grants URI read access directly to selected files without requesting broad media permissions.
   - Broad `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, and `READ_MEDIA_IMAGES` are stripped, satisfying Google Play Data Safety policies.

### 2.2 Authorized Permissions Matrix

| Permission | Purpose | Justification |
| :--- | :--- | :--- |
| `ACCESS_FINE_LOCATION` | Precise delivery address resolution & rider dispatch | Required for buyer location pin & rider fleet tracking |
| `ACCESS_COARSE_LOCATION` | Approximate neighborhood & city-tier matching | Required for local catalog search & store discovery |
| `CAMERA` | Barcode/QR scanning & return/replacement proof capture | Required for proof-of-delivery & defective item uploads |
| `INTERNET` | API requests, WebSocket updates, and media transfers | Core network connectivity |
| `POST_NOTIFICATIONS` | Order status updates & rider assignment alerts | Real-time notifications for orders and delivery milestones |
| `VIBRATE` | Haptic feedback on scans and alerts | Rider alert feedback |

### 2.3 Expo Config Plugin Enforcer (`withTrimmedPermissions.js`)

To prevent any third-party Expo or React Native package from silently injecting restricted permissions into the generated `AndroidManifest.xml` during `npx expo prebuild`, we implemented an Expo config plugin:

```javascript
// apps/mobile/plugins/withTrimmedPermissions.js
const { withAndroidManifest } = require('@expo/config-plugins');

const BLACKLISTED_PERMISSIONS = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
];

module.exports = function withTrimmedPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    // Strip blacklisted permissions and telecom services...
    return config;
  });
};
```

---

## 3. Release Toolchain & Bytecode Optimization (N16)

### 3.1 Play App Signing & Keystore Template

Release signing credentials must never be committed to git. A template `apps/mobile/android/keystore.properties.example` provides the structure for developers and CI/CD pipelines:
- `MYAPP_UPLOAD_STORE_FILE=release.keystore`
- `MYAPP_UPLOAD_KEY_ALIAS=localsampark`
- `MYAPP_UPLOAD_STORE_PASSWORD=***`
- `MYAPP_UPLOAD_KEY_PASSWORD=***`

The `android/app/build.gradle` is configured to read these properties safely when building release AABs (`bundleRelease`).

### 3.2 Hermes Bytecode & ProGuard / R8 Rules

- **Hermes Engine**: Enabled by default (`hermesEnabled: true` in `app.json`), compiling JavaScript into optimized bytecode (`.hbc`). Tested and verified across 5,551 modules with zero bundling errors.
- **ProGuard / R8 (`apps/mobile/android/app/proguard-rules.pro`)**:
  - Hermes runtime preservation (`-keep class com.facebook.hermes.** { *; }`)
  - TurboModules and JNI bridges preservation
  - WatermelonDB native SQLite bindings preservation
  - Razorpay payment gateway WebView JavaScriptInterface preservation (`-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }`)
  - Sentry crash reporting line number and source mapping retention

---

## 4. Automated Verification & Test Coverage

### 4.1 Permissions Audit Suite (`apps/mobile/__tests__/permissionsAudit.test.js`)

Added 6 dedicated regression tests:
1. `[N12.1]`: Validates that `app.json` contains strictly authorized permissions and zero restricted permissions.
2. `[N12.2]`: Validates that `app.json` plugins list includes `withTrimmedPermissions` and excludes dangerous call/audio plugins.
3. `[N12.3]`: Validates that `AndroidManifest.xml` contains no forbidden permissions or telecom services (`VoiceConnectionService`).
4. `[N12.4]`: Validates that `withTrimmedPermissions.js` exists and exports a valid config plugin.
5. `[N16.1]`: Validates that `keystore.properties.example` exists with required release keys.
6. `[N16.2]`: Validates that `proguard-rules.pro` configures Hermes, TurboModules, and WebViews.

### 4.2 Suite Results
- **Mobile Unit Test Suite**: 12/12 suites PASS, 239/239 tests PASS.
- **Expo Android Export**: `npx expo export --platform android` cleanly compiled 5,551 modules with Hermes bytecode.
