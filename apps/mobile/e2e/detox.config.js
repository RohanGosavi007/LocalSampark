/**
 * Mobile App Detox E2E Test Configuration
 * Configures Detox for testing the React Native / Expo app on Android emulator.
 */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: '../../localsampark_latest_build39.apk',
      build: 'cd ../.. && npx expo run:android --variant debug',
      reversePorts: [5000],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: '../../localsampark_latest_build39.apk',
      build: 'cd ../.. && npx expo run:android --variant release',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug',
    },
  },
};
