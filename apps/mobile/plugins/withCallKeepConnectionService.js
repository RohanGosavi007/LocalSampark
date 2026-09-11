/**
 * Config plugin: register react-native-callkeep's ConnectionService.
 *
 * react-native-callkeep ships io.wazo.callkeep.VoiceConnectionService but
 * deliberately does not declare it in its own AndroidManifest — the app has to,
 * so that Telecom can verify the BIND_TELECOM_CONNECTION_SERVICE guard. Without
 * that declaration TelecomManager.registerPhoneAccount() throws
 *
 *     java.lang.SecurityException: Registering a PhoneAccount requires either:
 *     (1) The Service definition requires that the ConnectionService is guarded
 *     with the BIND_TELECOM_CONNECTION_SERVICE ...
 *
 * on the native modules thread, which JS cannot catch — it kills the process at
 * startup as soon as RNCallKeep.setup() runs.
 *
 * The declaration also exists directly in android/app/src/main/AndroidManifest.xml,
 * which is what Gradle and EAS actually build from. This plugin exists so that
 * `expo prebuild` (which regenerates that file from app.json) cannot silently
 * drop it and reintroduce the crash. Both paths are idempotent and agree.
 *
 * Imported from `expo/config-plugins` rather than `@expo/config-plugins`, which
 * is the sub-export Expo expects apps to use and avoids the installed
 * @expo/config-plugins major-version drift.
 */
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const SERVICE_NAME = 'io.wazo.callkeep.VoiceConnectionService';
const BIND_PERMISSION = 'android.permission.BIND_TELECOM_CONNECTION_SERVICE';

// VoiceConnectionService only ever starts a foreground service of type
// MICROPHONE (Constants.FOREGROUND_SERVICE_TYPE_MICROPHONE = 128), so this
// stays narrow rather than requesting the phoneCall/camera types too — those
// carry extra Play Console policy review for no benefit here.
const FOREGROUND_SERVICE_TYPE = 'microphone';

const REQUIRED_PERMISSIONS = [
  BIND_PERMISSION,
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
];

function withCallKeepConnectionService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;

    // ── Permissions ────────────────────────────────────────────────────────
    manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
    for (const name of REQUIRED_PERMISSIONS) {
      const already = manifest.manifest['uses-permission'].some(
        (p) => p?.$?.['android:name'] === name
      );
      if (!already) {
        manifest.manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }

    // ── ConnectionService ──────────────────────────────────────────────────
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    application.service = application.service || [];

    const existing = application.service.find(
      (s) => s?.$?.['android:name'] === SERVICE_NAME
    );

    // Attributes are re-asserted on an existing entry rather than skipped, so a
    // partially-declared service (the failure mode that caused the crash) is
    // repaired rather than left alone.
    const attributes = {
      'android:name': SERVICE_NAME,
      'android:label': '@string/app_name',
      // The guard. Telecom refuses to register the PhoneAccount without it.
      'android:permission': BIND_PERMISSION,
      'android:foregroundServiceType': FOREGROUND_SERVICE_TYPE,
      // Must be exported so the system Telecom stack can bind it; the
      // android:permission guard above is what keeps everything else out.
      'android:exported': 'true',
    };

    const intentFilter = [{ action: [{ $: { 'android:name': 'android.telecom.ConnectionService' } }] }];

    if (existing) {
      existing.$ = { ...existing.$, ...attributes };
      existing['intent-filter'] = intentFilter;
    } else {
      application.service.push({ $: attributes, 'intent-filter': intentFilter });
    }

    return cfg;
  });
}

module.exports = withCallKeepConnectionService;
