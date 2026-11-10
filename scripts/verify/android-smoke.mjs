// G12 — Android release smoke test on an emulator.
//
// Installs the release APK that G10 built (not a debug build, and not a Metro
// bundle) on an Android emulator and checks, on the device:
//   1. the permissions the installed package actually requests contain none of
//      the N12 blocked permissions (the manifest merger is where these leak in,
//      so only the built artifact can prove it — see F-134);
//   2. a cold launch reaches MainActivity, the process is still alive after the
//      app has had time to load its JS bundle, and the screen shows the app's
//      own UI (not a blank window, a system dialog, or a crash dialog);
//   3. opening a localsampark:// deep link does not crash it;
//   4. logcat has no fatal Java or JavaScript exception from the app.
// Evidence (logcat, UI hierarchy, screenshot, requested permissions) goes to
// the gate's evidence directory.
//
// Device: an already-connected emulator if there is one, otherwise the AVD named
// by $ANDROID_AVD, otherwise the first AVD `emulator -list-avds` reports, booted
// headless and shut down afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

export const APP_ID = 'in.localsampark.app';
export const APP_LABEL = 'LocalSampark'; // @string/app_name

/**
 * If the top window is an ANR dialog for some *other* process (title not naming
 * the app), the tap point of its "Wait" button; otherwise null. Pure (Harness 8).
 */
export function foreignAnrWaitButton(uiXml, appLabel = APP_LABEL) {
  const nodes = uiXml.match(/<node[^>]*>/g) || [];
  const title = nodes.find((n) => /resource-id="android:id\/alertTitle"/.test(n));
  const wait = nodes.find((n) => /resource-id="android:id\/aerr_wait"/.test(n));
  if (!title || !wait) return null;
  const text = (title.match(/text="([^"]*)"/) || [])[1] || '';
  if (text.toLowerCase().includes(appLabel.toLowerCase())) return null;
  const b = (wait.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/) || []).slice(1).map(Number);
  if (b.length !== 4) return null;
  return { title: text, x: Math.round((b[0] + b[2]) / 2), y: Math.round((b[1] + b[3]) / 2) };
}
const SETTLE_MS = 25000;
// The search param makes expo-router serialise a query string on navigation,
// which exercises the patched query-string import in the release bundle (G13).
const DEEP_LINK = 'localsampark://shops?q=smoke';

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Pure verdict over what was collected from the device (self-tested in harness.test.mjs). */
export function analyzeSmoke({ requestedPermissions = [], blockedPermissions = [], launched, aliveAfterLaunch, aliveAfterDeepLink, resumedActivity = '', uiXml = '', logcat = '', appUid = null, extraPids = [], appLabel = APP_LABEL }) {
  const failures = [];
  const leaked = blockedPermissions.filter((p) => requestedPermissions.includes(p));
  if (leaked.length) failures.push(`release APK requests blocked permission(s): ${leaked.join(', ')}`);
  if (!launched) failures.push('am start did not launch MainActivity');
  if (!aliveAfterLaunch) failures.push(`process not running ${SETTLE_MS / 1000}s after launch`);
  if (!aliveAfterDeepLink) failures.push(`process not running after opening ${DEEP_LINK}`);
  if (!resumedActivity.includes(APP_ID)) failures.push(`foreground activity is not the app (${resumedActivity.trim() || 'none'})`);

  const appNodes = (uiXml.match(new RegExp(`<node[^>]*package="${APP_ID.replace(/\./g, '\\.')}"[^>]*>`, 'g')) || []);
  const textNodes = appNodes.filter((n) => /\stext="[^"]+"/.test(n) || /content-desc="[^"]+"/.test(n));
  if (textNodes.length < 3) failures.push(`app UI shows ${textNodes.length} labelled element(s); expected a rendered screen`);
  // uiautomator's attribute order is not guaranteed, so test each node whole.
  // Only a dialog naming the app counts. A cold-booted emulator often shows
  // "System UI isn't responding" for its own processes (the runner answers
  // those with "Wait" before dumping again; see dismissForeignAnr).
  const crashDialog = (uiXml.match(/<node[^>]*>/g) || []).some((n) =>
    /package="android"/.test(n) && new RegExp(`text="${appLabel}[^"]*(keeps stopping|isn't responding|has stopped)`, 'i').test(n));
  if (crashDialog) failures.push('crash/ANR dialog for the app on screen');

  // Reinstalling makes Android start broadcast receivers for the *removed*
  // install's uid, which die in handleBindApplication (seen on the first G12 run).
  // With the installed uid known, only processes ActivityManager started for
  // that uid count; without it, every fatal line counts.
  const lines = logcat.split(/\r?\n/);
  const pidOf = (l) => (l.match(/^\w\/[^(]*\(\s*(\d+)\)/) || [])[1];
  let appPids = null;
  if (appUid != null) {
    appPids = new Set(extraPids.map(String));
    const re = new RegExp(`Start proc (\\d+):${APP_ID.replace(/\./g, '\\.')}[^/\\s]*/u(\\d+)a(\\d+)`);
    for (const l of lines) {
      const m = l.match(re);
      if (m && 100000 * Number(m[2]) + 10000 + Number(m[3]) === appUid) appPids.add(m[1]);
    }
  }
  const ours = (l) => appPids === null || appPids.has(pidOf(l));
  const fatal = lines.filter((l) => ours(l) && (
    /FATAL EXCEPTION/.test(l) ||
    /JavascriptException|ReactNativeJS.*(Unhandled|TypeError|ReferenceError|Invariant Violation)/.test(l)
  ));
  if (fatal.length) failures.push(`fatal exception(s) in logcat:\n    ${fatal.slice(0, 10).join('\n    ')}`);

  return { passed: failures.length === 0, failures, labelledElements: textNodes.length };
}

function sdkDir(root) {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (process.env.ANDROID_SDK_ROOT) return process.env.ANDROID_SDK_ROOT;
  const lp = path.join(root, 'apps', 'mobile', 'android', 'local.properties');
  if (fs.existsSync(lp)) {
    const m = fs.readFileSync(lp, 'utf8').match(/^sdk\.dir=(.+)$/m);
    if (m) return m[1].trim().replace(/\\:/g, ':').replace(/\\\\/g, '\\');
  }
  return process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : '';
}

export function runAndroidSmoke({ root, evidenceDir }) {
  const lines = [];
  const note = (s) => lines.push(s);
  const exe = process.platform === 'win32' ? '.exe' : '';
  const sdk = sdkDir(root);
  const adbPath = path.join(sdk, 'platform-tools', `adb${exe}`);
  const emulatorPath = path.join(sdk, 'emulator', `emulator${exe}`);
  const done = (passed, summary) => ({ passed, summary, log: lines.join('\n') });

  if (!fs.existsSync(adbPath)) return done(false, `adb not found (Android SDK: ${sdk || 'unset'})`);
  const adb = (args, opts = {}) => {
    const r = spawnSync(adbPath, args, { encoding: opts.binary ? 'buffer' : 'utf8', timeout: opts.timeout ?? 120000, maxBuffer: 64 * 1024 * 1024 });
    return { code: r.status ?? 1, out: r.stdout ?? '', err: (r.stderr ?? '').toString() };
  };

  const apkDir = path.join(root, 'apps', 'mobile', 'android', 'app', 'build', 'outputs', 'apk', 'release');
  const apk = fs.existsSync(apkDir) ? fs.readdirSync(apkDir).find((f) => f.endsWith('.apk')) : null;
  if (!apk) return done(false, 'No release APK — G10 must build it first');
  const apkPath = path.join(apkDir, apk);
  note(`APK: ${apkPath} (${fs.statSync(apkPath).mtime.toISOString()})`);

  // ── device ────────────────────────────────────────────────────────────────
  const online = () => adb(['devices']).out.split(/\r?\n/).filter((l) => /^emulator-\d+\s+device$/.test(l.trim())).map((l) => l.split(/\s+/)[0]);
  let serial = online()[0];
  let startedEmulator = false;
  if (!serial) {
    if (!fs.existsSync(emulatorPath)) return done(false, `No emulator running and none installed at ${emulatorPath}`);
    const avds = spawnSync(emulatorPath, ['-list-avds'], { encoding: 'utf8' }).stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const avd = process.env.ANDROID_AVD || avds[0];
    if (!avd) return done(false, 'No Android Virtual Device configured');
    note(`Booting AVD ${avd} headless`);
    // The emulator's own output goes to the evidence folder: a boot that never
    // came online used to leave nothing to diagnose it with.
    const emuLogPath = path.join(evidenceDir, 'G12-emulator.log');
    const emuLog = fs.openSync(emuLogPath, 'w');
    const emu = spawn(emulatorPath, ['-avd', avd, '-no-window', '-no-audio', '-no-boot-anim', '-no-snapshot-save', '-gpu', 'swiftshader_indirect'], { detached: true, stdio: ['ignore', emuLog, emuLog] });
    emu.unref();
    startedEmulator = true;
    const deadline = Date.now() + 600000;
    while (Date.now() < deadline && !(serial = online()[0])) sleep(3000);
    if (!serial) {
      const tail = fs.readFileSync(emuLogPath, 'utf8').split(/\r?\n/).filter((l) => /ERROR|FATAL|WARNING|lock/i.test(l)).slice(-15).join('\n  ');
      note(`emulator log (errors/warnings):\n  ${tail || '(none)'}`);
      return done(false, 'Emulator did not come online within 10 minutes (see G12-emulator.log)');
    }
  }
  const sh = (args, opts) => adb(['-s', serial, ...args], opts);
  const bootDeadline = Date.now() + 360000;
  while (Date.now() < bootDeadline && sh(['shell', 'getprop', 'sys.boot_completed']).out.trim() !== '1') sleep(3000);
  if (sh(['shell', 'getprop', 'sys.boot_completed']).out.trim() !== '1') return done(false, `${serial} did not finish booting`);
  note(`Device: ${serial} — Android ${sh(['shell', 'getprop', 'ro.build.version.release']).out.trim()} (${sh(['shell', 'getprop', 'ro.product.cpu.abi']).out.trim()})`);

  const savedScales = {};
  try {
    // ── install ─────────────────────────────────────────────────────────────
    sh(['uninstall', APP_ID]); // a previous build may be signed with another key
    const inst = sh(['install', '-r', '-g', apkPath], { timeout: 300000 });
    note(`install: ${(inst.out + inst.err).trim()}`);
    if (!/Success/.test(inst.out)) return done(false, 'adb install failed');

    const dump = sh(['shell', 'dumpsys', 'package', APP_ID]).out;
    const reqBlock = (dump.split(/requested permissions:/)[1] || '').split(/\n\s*(install permissions|runtime permissions|User \d+):/)[0];
    const requestedPermissions = reqBlock.split(/\r?\n/).map((l) => l.trim().split(':')[0]).filter((l) => l.includes('.permission.') || l.startsWith('android.'));
    const require = createRequire(path.join(root, 'apps', 'mobile', 'package.json'));
    const { BLOCKED_PERMISSIONS } = require('./plugins/withTrimmedPermissions');
    fs.writeFileSync(path.join(evidenceDir, 'G12-requested-permissions.txt'), requestedPermissions.join('\n') + '\n');
    note(`requested permissions (${requestedPermissions.length}):\n  ${requestedPermissions.join('\n  ')}`);

    // Android 14 prints appId=; older releases userId=.
    const appUid = Number((dump.match(/\b(?:userId|appId)=(\d+)/) || [])[1]) || null;
    note(`installed uid: ${appUid ?? 'unknown (every fatal line will count)'}`);

    // Let the system finish the reinstall (it starts receivers for the removed
    // install's uid) and start from a stopped app, so the cold launch below is
    // the one being measured.
    sleep(10000);
    sh(['shell', 'am', 'force-stop', APP_ID]);

    // A screen that never goes idle (Reanimated loops) makes `uiautomator dump`
    // give up. With the system animation scales at 0 Android reports reduced
    // motion, which Reanimated honours. Restored in `finally`.
    const scaleKeys = ['window_animation_scale', 'transition_animation_scale', 'animator_duration_scale'];
    for (const k of scaleKeys) {
      savedScales[k] = sh(['shell', 'settings', 'get', 'global', k]).out.trim();
      sh(['shell', 'settings', 'put', 'global', k, '0']);
    }

    // ── launch ──────────────────────────────────────────────────────────────
    sh(['logcat', '-c']);
    const start = sh(['shell', 'am', 'start', '-W', '-n', `${APP_ID}/.MainActivity`], { timeout: 120000 });
    note(`am start: ${start.out.trim()}`);
    const launched = /Status: ok/.test(start.out) || /LaunchState/.test(start.out);
    sleep(SETTLE_MS);
    const alive = () => sh(['shell', 'pidof', APP_ID]).out.trim() !== '';
    const aliveAfterLaunch = alive();
    const resumedActivity = (sh(['shell', 'dumpsys', 'activity', 'activities']).out.match(/(topResumedActivity|mResumedActivity)[^\n]*/) || [''])[0];
    note(`resumed: ${resumedActivity.trim()}`);

    let uiXml = '';
    for (let attempt = 1; attempt <= 4; attempt++) {
      const d = sh(['shell', 'uiautomator', 'dump', '/data/local/tmp/ls-ui.xml'], { timeout: 60000 });
      note(`uiautomator dump (attempt ${attempt}): ${(d.out + d.err).trim()}`);
      uiXml = sh(['exec-out', 'cat', '/data/local/tmp/ls-ui.xml']).out;
      if (!uiXml.includes('<hierarchy')) { sleep(3000); continue; }
      // An ANR dialog for another process ("System UI isn't responding" on a
      // cold-booted emulator) covers the app and is all the dump shows.
      const wait = foreignAnrWaitButton(uiXml);
      if (!wait) break;
      note(`dismissing "${wait.title}" with Wait`);
      sh(['shell', 'input', 'tap', String(wait.x), String(wait.y)]);
      sleep(3000);
    }
    fs.writeFileSync(path.join(evidenceDir, 'G12-ui.xml'), uiXml);
    const png = sh(['exec-out', 'screencap', '-p'], { binary: true }).out;
    if (png && png.length) fs.writeFileSync(path.join(evidenceDir, 'G12-launch.png'), png);

    // ── deep link ───────────────────────────────────────────────────────────
    // adb joins the arguments into one device-shell command line, so the URI is
    // single-quoted to keep "?" from being read as a glob.
    const link = sh(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `'${DEEP_LINK}'`, APP_ID]);
    note(`deep link: ${link.out.trim()}`);
    sleep(8000);
    const aliveAfterDeepLink = alive();

    const logcat = sh(['logcat', '-d', '-v', 'brief'], { timeout: 60000 }).out;
    fs.writeFileSync(path.join(evidenceDir, 'G12-logcat.txt'), logcat);

    const livePid = sh(['shell', 'pidof', APP_ID]).out.trim();
    const verdict = analyzeSmoke({
      requestedPermissions, blockedPermissions: BLOCKED_PERMISSIONS, launched, aliveAfterLaunch,
      aliveAfterDeepLink, resumedActivity, uiXml, logcat, appUid, extraPids: livePid ? livePid.split(/\s+/) : [],
    });
    note(`labelled app UI elements: ${verdict.labelledElements}`);
    if (!verdict.passed) note(`FAILURES:\n  ${verdict.failures.join('\n  ')}`);
    return done(verdict.passed, verdict.passed
      ? `Release APK installed on ${serial}, launched, survived ${SETTLE_MS / 1000}s + deep link, ${verdict.labelledElements} UI elements, no blocked permissions, no fatal exceptions`
      : `Smoke failed: ${verdict.failures.map((f) => f.split('\n')[0]).join('; ')}`);
  } finally {
    for (const [k, v] of Object.entries(savedScales)) {
      sh(['shell', 'settings', 'put', 'global', k, v && v !== 'null' ? v : '1']);
    }
    if (startedEmulator) sh(['emu', 'kill']);
  }
}
