/**
 * Config plugin: N12 Android Permission Trimming for Google Play Store Policy.
 *
 * Strips restricted and dangerous permissions that trigger Play Store rejections
 * when non-commerce verticals (telephony intercom, background audio) are off:
 *   - RECORD_AUDIO
 *   - MODIFY_AUDIO_SETTINGS
 *   - SYSTEM_ALERT_WINDOW
 *   - BIND_TELECOM_CONNECTION_SERVICE
 *   - FOREGROUND_SERVICE_MICROPHONE
 *   - READ_MEDIA_IMAGES (replaced by Android System Photo Picker)
 *   - READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE
 */
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const BLACKLISTED_PERMISSIONS = new Set([
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
]);

const BLACKLISTED_SERVICES = new Set([
  'io.wazo.callkeep.VoiceConnectionService',
]);

function withTrimmedPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;

    // Filter out blacklisted permissions
    if (manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'].filter(
        (p) => !BLACKLISTED_PERMISSIONS.has(p?.$?.['android:name'])
      );
    }

    // Filter out blacklisted telecom background services
    try {
      const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
      if (application.service) {
        application.service = application.service.filter(
          (s) => !BLACKLISTED_SERVICES.has(s?.$?.['android:name'])
        );
      }
    } catch {
      // Main application missing or not yet generated
    }

    return cfg;
  });
}

module.exports = withTrimmedPermissions;
