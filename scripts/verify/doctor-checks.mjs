// expo-doctor checks that apps/mobile turns off (G9).
//
// A doctor check may be switched off in apps/mobile/package.json
// (`expo.doctor.<check>.enabled: false`) only when a mobile Jest suite checks
// the same thing more precisely. Each such check is mapped to its suite here,
// and G9 fails if a check is off with no mapped suite, or the suite did not
// run and pass in that same gate run. Switching a check off is therefore never
// by itself a way to make G9 pass.
import fs from 'node:fs';
import path from 'node:path';

export const DOCTOR_CHECK_REPLACEMENTS = {
  // Committed android/ is not regenerated from app.json; the suite compares it
  // with what `expo config --type introspect` says prebuild would generate.
  appConfigFieldsNotSyncedCheck: '__tests__/nativeConfigSync.test.js',
};

/**
 * { disabled: string[], unreplaced: string[] } for the doctor config in
 * `<mobileDir>/package.json`, given the combined stdout/stderr of the mobile
 * Jest run.
 */
export function disabledDoctorChecks(mobileDir, jestOutput, replacements = DOCTOR_CHECK_REPLACEMENTS) {
  let doctor = {};
  try {
    doctor = JSON.parse(fs.readFileSync(path.join(mobileDir, 'package.json'), 'utf8'))?.expo?.doctor ?? {};
  } catch {
    doctor = {};
  }
  const disabled = Object.entries(doctor)
    .filter(([, cfg]) => cfg && typeof cfg === 'object' && cfg.enabled === false)
    .map(([name]) => name);

  const passed = (suite) => {
    const escaped = suite.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '[\\\\/]');
    return new RegExp(`^\\s*PASS\\s+${escaped}\\b`, 'm').test(jestOutput || '');
  };
  const unreplaced = disabled.filter((name) => !replacements[name] || !passed(replacements[name]));
  return { disabled, unreplaced };
}
