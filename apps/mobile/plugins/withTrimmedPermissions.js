/**
 * Config plugin: N12 Android Permission Trimming for Google Play Store Policy.
 *
 * Keeps restricted and dangerous permissions out of the release APK while the
 * non-commerce verticals (telephony intercom, background audio) are off:
 *   - RECORD_AUDIO / MODIFY_AUDIO_SETTINGS / FOREGROUND_SERVICE_MICROPHONE
 *   - SYSTEM_ALERT_WINDOW
 *   - BIND_TELECOM_CONNECTION_SERVICE and react-native-callkeep's phone
 *     permissions (CALL_PHONE, READ_PHONE_STATE, READ_PHONE_NUMBERS,
 *     MANAGE_OWN_CALLS). CallKeep is optional in WebRTCIntercomMobile and its
 *     ConnectionService is not declared, so it cannot run on Android anyway.
 *   - READ_MEDIA_IMAGES (replaced by Android System Photo Picker)
 *   - READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE
 *
 * Most of these do not come from the app's own manifest. expo-audio,
 * expo-image-picker and react-native-callkeep declare them in their library
 * manifests, and Gradle's manifest merger copies them into the APK. Deleting
 * the entries from the app manifest — which is what this plugin used to do —
 * therefore removed nothing from the build, and also deleted the
 * `tools:node="remove"` markers that `android.blockedPermissions` writes. Each
 * permission is now written as a `tools:node="remove"` marker (Expo's own
 * blocked-permissions helper), which is what tells the merger to drop it.
 *
 * android/app/src/main/AndroidManifest.xml carries the same markers;
 * __tests__/nativeConfigSync.test.js checks the two agree.
 */
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const BLOCKED_PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.CALL_PHONE',
  'android.permission.READ_PHONE_STATE',
  'android.permission.READ_PHONE_NUMBERS',
  'android.permission.MANAGE_OWN_CALLS',
];

const BLOCKED_SERVICES = new Set([
  'io.wazo.callkeep.VoiceConnectionService',
]);

function withTrimmedPermissions(config) {
  // Adds a tools:node="remove" marker per permission (replacing any plain
  // entry of the same name a template or an earlier plugin added).
  config = AndroidConfig.Permissions.withBlockedPermissions(config, BLOCKED_PERMISSIONS);

  return withAndroidManifest(config, (cfg) => {
    // Drop the telecom background service if anything declared it.
    try {
      const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
      if (application.service) {
        application.service = application.service.filter(
          (s) => !BLOCKED_SERVICES.has(s?.$?.['android:name'])
        );
      }
    } catch {
      // Main application missing or not yet generated
    }
    return cfg;
  });
}

module.exports = withTrimmedPermissions;
module.exports.BLOCKED_PERMISSIONS = BLOCKED_PERMISSIONS;
module.exports.BLOCKED_SERVICES = BLOCKED_SERVICES;
