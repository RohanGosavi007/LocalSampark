/**
 * scripts/verify/__tests__/harness.test.mjs
 *
 * Self-tests for the verification harness (Launch Program v3).
 * Proves that the verification harness cannot be gamed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFeatures, parsePlaywrightReport } from '../feature-verifier.mjs';
import { scanTrackedFiles, SECRET_PATTERNS } from '../secret-scanner.mjs';
import { renderStatusMarkdown } from '../render-report.mjs';
import { backendEngineSelection } from '../engine-selection.mjs';
import { disabledDoctorChecks } from '../doctor-checks.mjs';
import { analyzeSmoke, foreignAnrWaitButton, APP_ID } from '../android-smoke.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

test('Harness 1: G18 rejects a feature marked VERIFIED when no tagged test exists', () => {
  const tmpDir = path.join(ROOT, 'node_modules', '.tmp_test_harness_1');
  fs.mkdirSync(tmpDir, { recursive: true });

  const mockFeatures = [
    {
      id: 'C99',
      title: 'Mock Phantom Feature',
      scope: 'launch',
      platforms: ['api', 'web'],
      status: 'VERIFIED', // Gamed / hand-edited status
      evidence: []
    }
  ];

  const mockFeatPath = path.join(tmpDir, 'features.json');
  fs.writeFileSync(mockFeatPath, JSON.stringify(mockFeatures, null, 2), 'utf8');

  try {
    const report = verifyFeatures({
      evidenceDir: tmpDir,
      featuresPath: mockFeatPath,
      writeStatus: false
    });

    assert.equal(report.verifiedCount, 0, 'Must compute 0 verified features when no tests exist');
    assert.equal(report.discrepancies.length, 1, 'Must report discrepancy against hand-edited status');
    assert.equal(report.discrepancies[0].id, 'C99');
    assert.equal(report.discrepancies[0].storedStatus, 'VERIFIED');
    assert.notEqual(report.discrepancies[0].computedStatus, 'VERIFIED');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Harness 2: G18 rejects a feature with a failing tagged test on PostgreSQL only', () => {
  const tmpDir = path.join(ROOT, 'node_modules', '.tmp_test_harness_2');
  fs.mkdirSync(tmpDir, { recursive: true });

  const mockFeatures = [
    {
      id: 'C88',
      title: 'Dual Engine Feature',
      scope: 'launch',
      platforms: ['api'],
      status: 'VERIFIED',
      evidence: []
    }
  ];

  // SQLite report: PASS
  const sqliteReport = {
    testResults: [
      {
        assertionResults: [
          { fullName: '[C88.1] should pass on sqlite', status: 'passed' }
        ]
      }
    ]
  };

  // Postgres report: FAIL
  const postgresReport = {
    testResults: [
      {
        assertionResults: [
          { fullName: '[C88.1] should fail on postgres', status: 'failed' }
        ]
      }
    ]
  };

  const mockFeatPath = path.join(tmpDir, 'features.json');
  fs.writeFileSync(mockFeatPath, JSON.stringify(mockFeatures, null, 2), 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'jest-sqlite.json'), JSON.stringify(sqliteReport), 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'jest-postgres.json'), JSON.stringify(postgresReport), 'utf8');

  try {
    const report = verifyFeatures({
      evidenceDir: tmpDir,
      featuresPath: mockFeatPath,
      writeStatus: false
    });

    assert.equal(report.verifiedCount, 0, 'Feature must NOT be verified when PG fails');
    assert.equal(report.discrepancies.length, 1, 'Must catch PG failure discrepancy');
    assert.equal(report.discrepancies[0].id, 'C88');
    assert.equal(report.discrepancies[0].computedStatus, 'IN PROGRESS');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Harness 3: G14 catches a planted fake secret in a tracked text file', () => {
  const tmpSecretFile = path.join(ROOT, 'node_modules', '.tmp_planted_secret.txt');
  const secretKey = 'JWT_' + 'SECRET';
  const secretVal = '0123456789abcdef'.repeat(2);
  fs.writeFileSync(
    tmpSecretFile,
    `// Temporary test secret\nconst ${secretKey} = "${secretVal}";\n`,
    'utf8'
  );

  try {
    const scanResult = scanTrackedFiles({ explicitFiles: [tmpSecretFile] });
    assert.equal(scanResult.passed, false, 'Secret scanner must fail when fake secret is planted');
    assert.ok(scanResult.violationCount >= 1, 'Must report at least one violation');
    assert.equal(scanResult.violations[0].ruleId, 'HIGH_ENTROPY_SECRET');
  } finally {
    fs.rmSync(tmpSecretFile, { force: true });
  }
});

test('Harness 4: POL-09 flags unverified "100%" or banned hyperbole in launch markdown', () => {
  const bannedPhrases = [
    '100% production ready',
    'zero-defect',
    'enterprise-grade',
    'rock-solid',
    'bulletproof'
  ];

  const bannedPatterns = [
    { pattern: /\b100%\s+production\s+ready\b/i, phrase: '100% production ready' },
    { pattern: /\bzero-defect\b/i, phrase: 'zero-defect' },
    { pattern: /\benterprise-grade\b/i, phrase: 'enterprise-grade' },
    { pattern: /\brock-solid\b/i, phrase: 'rock-solid' },
    { pattern: /\bbulletproof\b/i, phrase: 'bulletproof' }
  ];

  for (const phrase of bannedPhrases) {
    const sampleLine = `Our platform is ${phrase} and certified.`;
    const matched = bannedPatterns.some(bp => bp.pattern.test(sampleLine));
    assert.ok(matched, `POL-09 pattern must catch "${phrase}"`);
  }
});

test('Harness 5: renderStatusMarkdown correctly formats partial vs full run banners', () => {
  const fullSummary = {
    timestamp: '2026-10-25T12:00:00Z',
    evidenceDirectory: 'docs/audit/evidence/verify-full',
    partial: false,
    gatesPassed: 18,
    totalGates: 18,
    gatePassPercentage: '100.0%',
    featureCompletion: '53 / 53 (100.0%)',
    results: []
  };

  const fullMd = renderStatusMarkdown(fullSummary);
  assert.ok(fullMd.includes('FULL VERIFICATION RUN'), 'Full run must show FULL VERIFICATION RUN');

  const partialSummary = {
    ...fullSummary,
    partial: true
  };

  const partialMd = renderStatusMarkdown(partialSummary);
  assert.ok(partialMd.includes('PARTIAL RUN'), 'Partial run must show PARTIAL RUN banner');
});

test('Harness 6: G3 flags a backend suite that pins SQLite without @engine sqlite-only', () => {
  // A throwaway tree shaped like backend/src/__tests__, so the real repo is not touched.
  const tmpRoot = fs.mkdtempSync(path.join(ROOT, 'node_modules', '.tmp-engine-'));
  try {
    const dir = path.join(tmpRoot, 'backend', 'src', '__tests__');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'pinned.test.js'), ["process.env.USE_SQLITE = 'true';", "test('x', () => {});", ''].join('\n'));
    fs.writeFileSync(path.join(dir, 'tagged.test.js'), ['/**', ' * @engine sqlite-only — reason.', ' */', "process.env.USE_SQLITE = 'true';", ''].join('\n'));
    fs.writeFileSync(path.join(dir, 'neutral.test.js'), ["test('x', () => {});", ''].join('\n'));

    const result = backendEngineSelection(tmpRoot);
    assert.deepEqual(result.untaggedPins, ['backend/src/__tests__/pinned.test.js'], 'an untagged pin must be reported');
    assert.deepEqual(result.sqliteOnly, ['backend/src/__tests__/tagged.test.js'], 'a tagged suite is SQLite-only, not a pin');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});


test('Harness 7: G9 rejects an expo-doctor check switched off without a passing replacement suite', () => {
  const tmpRoot = fs.mkdtempSync(path.join(ROOT, 'node_modules', '.tmp-doctor-'));
  try {
    const writePkg = (doctor) => fs.writeFileSync(path.join(tmpRoot, 'package.json'), JSON.stringify({ expo: { doctor } }));
    const pass = 'PASS __tests__/nativeConfigSync.test.js\nTests: 8 passed';

    writePkg({ reactNativeDirectoryCheck: { exclude: ['x'] } });
    assert.deepEqual(disabledDoctorChecks(tmpRoot, ''), { disabled: [], unreplaced: [] }, 'nothing switched off');

    writePkg({ appConfigFieldsNotSyncedCheck: { enabled: false } });
    assert.deepEqual(disabledDoctorChecks(tmpRoot, pass).unreplaced, [], 'replacement suite passed (posix path)');
    assert.deepEqual(disabledDoctorChecks(tmpRoot, 'PASS __tests__\\nativeConfigSync.test.js').unreplaced, [], 'replacement suite passed (windows path)');
    assert.deepEqual(disabledDoctorChecks(tmpRoot, 'FAIL __tests__/nativeConfigSync.test.js').unreplaced, ['appConfigFieldsNotSyncedCheck'], 'a failing replacement suite does not count');
    assert.deepEqual(disabledDoctorChecks(tmpRoot, 'PASS __tests__/theme.test.js').unreplaced, ['appConfigFieldsNotSyncedCheck'], 'a replacement suite that did not run does not count');

    writePkg({ someOtherCheck: { enabled: false } });
    assert.deepEqual(disabledDoctorChecks(tmpRoot, pass).unreplaced, ['someOtherCheck'], 'a check with no mapped suite can never be switched off');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Harness 8: G12 smoke verdict fails on leaked permissions, crashes, blank screens and a dead process', () => {
  const ui = (n) => Array.from({ length: n }, (_, i) => `<node text="Item ${i}" package="${APP_ID}" />`).join('');
  const ok = {
    requestedPermissions: ['android.permission.INTERNET', 'android.permission.CAMERA'],
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    launched: true, aliveAfterLaunch: true, aliveAfterDeepLink: true,
    resumedActivity: `topResumedActivity=ActivityRecord{1 u0 ${APP_ID}/.MainActivity t5}`,
    uiXml: ui(5), logcat: 'I/ReactNativeJS( 123): Running "main"',
  };
  assert.equal(analyzeSmoke(ok).passed, true, 'a healthy launch passes');

  const fails = (patch, why) => assert.equal(analyzeSmoke({ ...ok, ...patch }).passed, false, why);
  fails({ requestedPermissions: [...ok.requestedPermissions, 'android.permission.RECORD_AUDIO'] }, 'a blocked permission in the installed APK fails');
  fails({ aliveAfterLaunch: false }, 'a process that died after launch fails');
  fails({ aliveAfterDeepLink: false }, 'a crash on the deep link fails');
  fails({ uiXml: ui(1) }, 'a blank screen fails');
  fails({ resumedActivity: 'topResumedActivity=ActivityRecord{1 u0 com.android.launcher3/.Launcher}' }, 'the launcher in front fails');
  fails({ logcat: 'E/AndroidRuntime( 123): FATAL EXCEPTION: main' }, 'a fatal Java exception fails');
  fails({ logcat: 'E/ReactNativeJS( 123): TypeError: undefined is not a function' }, 'a JS TypeError fails');
  fails({ uiXml: ui(5) + `<node text="LocalSampark keeps stopping" package="android" />` }, 'a system crash dialog fails');

  // Real lines from the first G12 run: after a reinstall Android starts
  // receivers for the removed install's uid (u0a192), which die; the app runs
  // as u0a193. Only the installed uid's processes may count.
  const startNew = `I/ActivityManager(  547): Start proc 4182:${APP_ID}/u0a193 for next-top-activity {${APP_ID}/${APP_ID}.MainActivity}`;
  const startOld = `I/ActivityManager(  547): Start proc 4291:${APP_ID}/u0a192 for broadcast {${APP_ID}/expo.modules.taskManager.TaskBroadcastReceiver}`;
  const fatalOld = 'E/AndroidRuntime( 4291): FATAL EXCEPTION: main';
  const fatalNew = 'E/AndroidRuntime( 4182): FATAL EXCEPTION: main';
  const withUid = (logcat) => ({ ...ok, appUid: 10193, logcat });
  assert.equal(analyzeSmoke(withUid([startNew, startOld, fatalOld].join('\n'))).passed, true, "the removed install's dying receiver does not count");
  fails(withUid([startNew, startOld, fatalNew].join('\n')), "the installed app's own fatal exception counts");
  fails({ ...withUid('E/AndroidRuntime( 5000): FATAL EXCEPTION: main'), extraPids: ['5000'] }, 'the live pid counts even if its Start proc line was not captured');
  fails({ ...ok, appUid: null, logcat: fatalOld }, 'without a known uid every fatal line counts');

  // Real dialog from the second G12 run: a cold-booted emulator's own System UI
  // ANR over the app. It is not the app's failure; the runner taps "Wait".
  const sysUiAnr = '<node text="System UI isn\'t responding" resource-id="android:id/alertTitle" package="android" bounds="[138,960][941,1050]" />'
    + '<node text="Wait" resource-id="android:id/aerr_wait" package="android" bounds="[71,1212][1009,1344]" />';
  assert.equal(analyzeSmoke({ ...ok, uiXml: ui(5) + sysUiAnr }).passed, true, "another process's ANR dialog is not the app's failure");
  assert.deepEqual(foreignAnrWaitButton(sysUiAnr), { title: "System UI isn't responding", x: 540, y: 1278 }, 'Wait is tapped at the centre of its bounds');
  const appAnr = sysUiAnr.replace("System UI isn't responding", "LocalSampark isn't responding");
  assert.equal(foreignAnrWaitButton(appAnr), null, "the app's own ANR is never dismissed");
  fails({ uiXml: ui(5) + appAnr }, "the app's own ANR dialog fails");
});

test('Harness 9: G18 reads tagged Playwright results by project, and flaky or failed runs do not count as passes', () => {
  const tmpRoot = fs.mkdtempSync(path.join(ROOT, 'node_modules', '.tmp-pw-'));
  try {
    const t = (projectName, status) => ({ projectName, status });
    const report = { suites: [{ title: 'web/checkout.spec.js', specs: [], suites: [{ title: 'Checkout', suites: [], specs: [
      { title: '[C8.1] places a COD order', tests: [t('web-chromium', 'expected'), t('visual', 'expected')] },
      { title: '[C9.1] tracks the order', tests: [t('web-chromium', 'flaky')] },
      { title: '[A4.1] admin cancels an order', tests: [t('admin-chromium', 'unexpected')] },
      { title: '[C5.1] search', tests: [t('web-chromium', 'skipped')] },
      { title: 'untagged spec', tests: [t('web-chromium', 'expected')] },
    ] }] }] };
    const file = path.join(tmpRoot, 'playwright.json');
    fs.writeFileSync(file, JSON.stringify(report));
    const r = parsePlaywrightReport(file);
    const by = (id) => r.filter((x) => x.featureId === id).map((x) => `${x.platform}:${x.status}`);
    assert.deepEqual(by('C8'), ['web:passed'], 'a web-* pass counts once; the visual project is not platform proof');
    assert.equal(r.find((x) => x.featureId === 'C8').title, 'Checkout > [C8.1] places a COD order');
    assert.deepEqual(by('C9'), ['web:failed'], 'a flaky test is not a pass');
    assert.deepEqual(by('A4'), ['admin:failed'], 'admin-* maps to the admin platform');
    assert.deepEqual(by('C5'), ['web:skipped']);
    assert.equal(r.length, 4, 'untagged specs are ignored');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
