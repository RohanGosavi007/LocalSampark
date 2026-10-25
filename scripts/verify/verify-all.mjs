/**
 * scripts/verify/verify-all.mjs
 *
 * Master Verification Gate Runner for LocalSampark Launch Program v3.
 * Executes Gates G1 through G18 per strict uncheatable forensic specifications.
 *
 * Usage:
 *   node scripts/verify/verify-all.mjs
 *   node scripts/verify/verify-all.mjs --skip-android
 *   node scripts/verify/verify-all.mjs --only G1,G13,G14,G15
 *   node scripts/verify/verify-all.mjs --write-status
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { runLaunchPolicyTests } from './launch-policy.mjs';
import { verifyFeatures } from './feature-verifier.mjs';
import { scanTrackedFiles } from './secret-scanner.mjs';
import { renderStatusMarkdown } from './render-report.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

// Parse CLI flags
const args = process.argv.slice(2);
let onlyGates = null;
let skipAndroid = false;
let isWriteStatusMode = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--only=')) {
    onlyGates = arg.slice(7).split(',').map(s => s.trim().toUpperCase());
  } else if (arg === '--only' && args[i + 1]) {
    onlyGates = args[i + 1].split(',').map(s => s.trim().toUpperCase());
  } else if (arg === '--skip-android') {
    skipAndroid = true;
  } else if (arg === '--write-status') {
    isWriteStatusMode = true;
  }
}

// Ensure evidence directory exists
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const evidenceDirName = `verify-${timestamp}`;
const evidenceDir = path.join(ROOT, 'docs', 'audit', 'evidence', evidenceDirName);
fs.mkdirSync(evidenceDir, { recursive: true });

function runCmd(cmd, cmdArgs, { cwd = ROOT, env = process.env, timeout = 300000 } = {}) {
  const isWindows = process.platform === 'win32';
  const formattedArgs = isWindows
    ? cmdArgs.map((a) => (typeof a === 'string' && a.includes(' ') && !a.startsWith('"') ? `"${a}"` : a))
    : cmdArgs;

  try {
    const res = spawnSync(cmd, formattedArgs, {
      cwd,
      env: { ...env, FORCE_COLOR: '0', CI: 'true' },
      encoding: 'utf8',
      timeout,
      shell: isWindows,
      maxBuffer: 20 * 1024 * 1024
    });
    return {
      code: res.status !== null ? res.status : 1,
      stdout: res.stdout || '',
      stderr: res.stderr || (res.error ? res.error.message : ''),
      error: res.error
    };
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: err.message,
      error: err
    };
  }
}

function scrubSecrets(content) {
  let scrubbed = content;
  scrubbed = scrubbed.replace(/eyJ[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}/g, '[REDACTED_JWT]');
  scrubbed = scrubbed.replace(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]');
  scrubbed = scrubbed.replace(/rzp_(?:live|test)_[a-zA-Z0-9]{14}/g, '[REDACTED_RAZORPAY_KEY]');
  scrubbed = scrubbed.replace(/postgresql:\/\/[^:]+:([^@]+)@/g, 'postgresql://postgres:[REDACTED_PASSWORD]@');
  return scrubbed;
}

function writeLog(gateId, content) {
  const logPath = path.join(evidenceDir, `${gateId}.txt`);
  const scrubbed = scrubSecrets(content);
  fs.writeFileSync(logPath, scrubbed, 'utf8');
  return `docs/audit/evidence/${evidenceDirName}/${gateId}.txt`;
}

function getTestPostgresEnv() {
  const localEnvPath = path.join(ROOT, 'backend', '.env.test.local');
  const defaults = {
    USE_SQLITE: 'false',
    TEST_USE_POSTGRES: '1',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_NAME: 'localsampark_test',
    DB_USER: 'postgres',
    DB_PASSWORD: 'password'
  };

  if (fs.existsSync(localEnvPath)) {
    const lines = fs.readFileSync(localEnvPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        defaults[key] = val;
      }
    }
  }

  const dbUrl = defaults.DATABASE_URL || `postgresql://${defaults.DB_USER}:${defaults.DB_PASSWORD}@${defaults.DB_HOST}:${defaults.DB_PORT}/${defaults.DB_NAME}`;

  return {
    ...process.env,
    ...defaults,
    DATABASE_URL: dbUrl,
    DIRECT_URL: dbUrl,
    SUPABASE_URL: '',
    NODE_ENV: 'test'
  };
}

// -------------------------------------------------------------
// Gate Implementations (G1 - G18)
// -------------------------------------------------------------

const gates = [
  {
    id: 'G1',
    name: 'Backend ESLint',
    category: 'Code Quality',
    run: () => {
      const res = runCmd('npm', ['run', 'lint', '--', '--quiet'], { cwd: path.join(ROOT, 'backend') });
      const log = writeLog('G1', `=== Backend ESLint Execution ===\nExit Code: ${res.code}\n\nSTDOUT:\n${res.stdout}\n\nSTDERR:\n${res.stderr}`);
      return {
        passed: res.code === 0,
        summary: res.code === 0 ? 'Backend ESLint reported 0 errors' : 'Backend ESLint reported errors',
        log
      };
    }
  },
  {
    id: 'G2',
    name: 'Backend Jest on SQLite',
    category: 'Unit & Integration Tests',
    run: () => {
      const jsonReportPath = path.join(evidenceDir, 'jest-sqlite.json');
      const env = {
        ...process.env,
        USE_SQLITE: 'true',
        TEST_USE_POSTGRES: '',
        DATABASE_URL: '',
        DIRECT_URL: '',
        SUPABASE_URL: '',
        NODE_ENV: 'test'
      };
      const res = runCmd('npx', ['jest', '--forceExit', '--json', `--outputFile=${jsonReportPath}`], {
        cwd: path.join(ROOT, 'backend'),
        env,
        timeout: 240000
      });

      let summary = 'Backend Jest on SQLite failed';
      let passed = false;

      if (fs.existsSync(jsonReportPath)) {
        try {
          const report = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
          passed = report.numFailedTests === 0 && report.numPassedTests > 0;
          summary = `${report.numPassedTests} passed, ${report.numFailedTests} failed across ${report.numTotalTestSuites} test suites`;
        } catch {
          passed = false;
        }
      }

      const log = writeLog('G2', `=== Backend Jest on SQLite Execution ===\nExit Code: ${res.code}\nSummary: ${summary}\n\nSTDOUT:\n${res.stdout}\n\nSTDERR:\n${res.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G3',
    name: 'Backend Jest on local PostgreSQL + PostGIS',
    category: 'PostgreSQL Verification',
    run: () => {
      const env = getTestPostgresEnv();
      const jsonReportPath = path.join(evidenceDir, 'jest-postgres.json');
      const res = runCmd('npx', ['jest', '--forceExit', '--json', `--outputFile=${jsonReportPath}`], {
        cwd: path.join(ROOT, 'backend'),
        env,
        timeout: 240000
      });

      let summary = 'Postgres Jest execution failed or local DB unreachable';
      let passed = false;

      if (fs.existsSync(jsonReportPath)) {
        try {
          const report = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
          passed = report.numFailedTests === 0 && report.numPassedTests > 0;
          summary = `${report.numPassedTests} passed, ${report.numFailedTests} failed on PostgreSQL (${env.DB_NAME})`;
        } catch {
          passed = false;
        }
      }

      const log = writeLog('G3', `=== Backend Jest on PostgreSQL Execution ===\nDatabase: ${env.DB_NAME} on ${env.DB_HOST}:${env.DB_PORT}\nExit Code: ${res.code}\nSummary: ${summary}\n\nSTDOUT:\n${res.stdout}\n\nSTDERR:\n${res.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G4',
    name: 'Database Migrations & Seed Idempotency',
    category: 'Database Integrity',
    run: () => {
      // 1. Run sqlite migration and verify seed
      const resMigrateSqlite = runCmd('node', ['src/migrations/run.js'], { cwd: path.join(ROOT, 'backend'), env: { ...process.env, USE_SQLITE: 'true', NODE_ENV: 'test' } });
      const resSeedSqlite = runCmd('node', ['src/seeds/seed-investor-demo.js', '--verify'], { cwd: path.join(ROOT, 'backend'), env: { ...process.env, USE_SQLITE: 'true', NODE_ENV: 'test' } });
      const sqlitePassed = resMigrateSqlite.code === 0 && resSeedSqlite.code === 0;

      // 2. Run PG migration and seed verify
      const pgEnv = getTestPostgresEnv();
      const resMigratePg = runCmd('node', ['src/migrations/run.js'], { cwd: path.join(ROOT, 'backend'), env: pgEnv });
      const resSeedPg = runCmd('node', ['src/seeds/seed-investor-demo.js', '--verify'], { cwd: path.join(ROOT, 'backend'), env: pgEnv });
      const pgPassed = resMigratePg.code === 0 && resSeedPg.code === 0;

      const passed = sqlitePassed && pgPassed;
      const summary = passed
        ? 'Dual-engine migrations and demo seed verify succeeded'
        : `Migration/Seed failure: SQLite=${sqlitePassed ? 'PASS' : 'FAIL'}, Postgres=${pgPassed ? 'PASS' : 'FAIL'}`;

      const log = writeLog('G4', `=== SQLite Migration Output ===\n${resMigrateSqlite.stdout}\n${resMigrateSqlite.stderr}\n\n=== SQLite Seed Verify ===\n${resSeedSqlite.stdout}\n${resSeedSqlite.stderr}\n\n=== Postgres Migration ===\n${resMigratePg.stdout}\n${resMigratePg.stderr}\n\n=== Postgres Seed Verify ===\n${resSeedPg.stdout}\n${resSeedPg.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G5',
    name: 'Route-Auth Matrix Test (N11)',
    category: 'Security & Access Control',
    run: () => {
      const matrixScript = path.join(ROOT, 'scripts', 'verify', 'route-auth-matrix.mjs');
      if (!fs.existsSync(matrixScript)) {
        const log = writeLog('G5', 'route-auth-matrix.mjs test script not found');
        return { passed: false, summary: 'Route-auth matrix test missing', log };
      }
      const res = runCmd('node', [matrixScript], { cwd: ROOT });
      const log = writeLog('G5', `=== Route-Auth Matrix Test ===\n${res.stdout}\n${res.stderr}`);
      return { passed: res.code === 0, summary: res.code === 0 ? 'All write routes pass auth gate' : 'Unauthenticated write routes detected outside allowlist', log };
    }
  },
  {
    id: 'G6',
    name: 'Concurrency & Idempotency Suite on Postgres (L7)',
    category: 'Data Integrity & Concurrency',
    run: () => {
      const concurrencyTest = path.join(ROOT, 'backend', 'src', '__tests__', 'concurrency.test.js');
      if (!fs.existsSync(concurrencyTest)) {
        const log = writeLog('G6', 'Postgres concurrency and idempotency test suite missing');
        return { passed: false, summary: 'Concurrency suite on Postgres missing', log };
      }
      const env = getTestPostgresEnv();
      const res = runCmd('npx', ['jest', 'concurrency.test.js', '--forceExit'], { cwd: path.join(ROOT, 'backend'), env });
      const log = writeLog('G6', `=== Concurrency & Idempotency Test ===\n${res.stdout}\n${res.stderr}`);
      return { passed: res.code === 0, summary: res.code === 0 ? 'Concurrency & idempotency suite passed on PostgreSQL' : 'Race condition or non-idempotency detected', log };
    }
  },
  {
    id: 'G7',
    name: 'Web Unit Tests & Production Build',
    category: 'Web App',
    run: () => {
      const resTest = runCmd('npm', ['test'], { cwd: path.join(ROOT, 'apps', 'web') });
      const resBuild = runCmd('npm', ['run', 'build'], { cwd: path.join(ROOT, 'apps', 'web'), timeout: 240000 });

      const passed = resTest.code === 0 && resBuild.code === 0;
      const summary = passed ? 'Web tests and Next.js production build passed' : `Web failure: test exit=${resTest.code}, build exit=${resBuild.code}`;
      const log = writeLog('G7', `=== Web Tests Output ===\n${resTest.stdout}\n${resTest.stderr}\n\n=== Web Build Output ===\n${resBuild.stdout}\n${resBuild.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G8',
    name: 'Admin Tests & Production Build',
    category: 'Admin Console',
    run: () => {
      const resTest = runCmd('npm', ['test'], { cwd: path.join(ROOT, 'apps', 'admin') });
      const resBuild = runCmd('npm', ['run', 'build'], { cwd: path.join(ROOT, 'apps', 'admin'), timeout: 240000 });

      const passed = resTest.code === 0 && resBuild.code === 0;
      const summary = passed ? 'Admin tests and production build passed' : `Admin failure: test exit=${resTest.code}, build exit=${resBuild.code}`;
      const log = writeLog('G8', `=== Admin Tests Output ===\n${resTest.stdout}\n${resTest.stderr}\n\n=== Admin Build Output ===\n${resBuild.stdout}\n${resBuild.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G9',
    name: 'Mobile Jest, ESLint, expo-doctor & export',
    category: 'Mobile App',
    isAndroid: true,
    run: () => {
      if (skipAndroid) {
        const log = writeLog('G9', 'Gate skipped due to --skip-android flag');
        return { passed: false, skipped: true, summary: 'Skipped (--skip-android)', log };
      }

      const resDoctor = runCmd('npx', ['expo-doctor'], { cwd: path.join(ROOT, 'apps', 'mobile') });
      const resLint = runCmd('npx', ['eslint', '.', '--quiet'], { cwd: path.join(ROOT, 'apps', 'mobile') });
      const resTest = runCmd('npx', ['jest', '--runInBand'], { cwd: path.join(ROOT, 'apps', 'mobile'), timeout: 120000 });
      const resExport = runCmd('npx', ['expo', 'export', '--platform', 'android'], { cwd: path.join(ROOT, 'apps', 'mobile'), timeout: 180000 });

      // Read owner-approved exceptions from docs/launch/accepted-exceptions.json
      let approvedDoctorChecks = [];
      const exFile = path.join(ROOT, 'docs', 'launch', 'accepted-exceptions.json');
      if (fs.existsSync(exFile)) {
        try {
          approvedDoctorChecks = JSON.parse(fs.readFileSync(exFile, 'utf8'))
            .filter(e => e.gate === 'G9' && e.ownerApproved !== null && e.ownerApproved !== undefined)
            .map(e => e.description);
        } catch {}
      }

      const failedChecks = (resDoctor.stdout.match(/✖\s+([^\r\n]+)/g) || []).map(m => m.replace(/✖\s+/, '').trim());
      const unacceptedFails = failedChecks.filter(c => !approvedDoctorChecks.some(a => c.includes(a)));
      const doctorOk = resDoctor.code === 0 || (failedChecks.length > 0 && unacceptedFails.length === 0);

      const passed = doctorOk && resLint.code === 0 && resTest.code === 0 && resExport.code === 0;
      const summary = passed 
        ? `Mobile Jest, ESLint, expo-doctor${approvedDoctorChecks.length > 0 ? ' (with owner-approved exceptions)' : ''}, and export passed`
        : `Doctor=${resDoctor.code} (unaccepted: ${unacceptedFails.join('; ') || 'none'}), Lint=${resLint.code}, Test=${resTest.code}, Export=${resExport.code}`;
      const log = writeLog('G9', `=== expo-doctor Output ===\n${resDoctor.stdout}\n${resDoctor.stderr}\n\n=== ESLint Output ===\n${resLint.stdout}\n${resLint.stderr}\n\n=== Jest Output ===\n${resTest.stdout}\n${resTest.stderr}\n\n=== Expo Export Output ===\n${resExport.stdout}\n${resExport.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G10',
    name: 'Android assembleRelease Build & Artifact Proof',
    category: 'Mobile Build Artifacts',
    isAndroid: true,
    run: () => {
      if (skipAndroid) {
        const log = writeLog('G10', 'Gate skipped due to --skip-android flag');
        return { passed: false, skipped: true, summary: 'Skipped (--skip-android)', log };
      }

      const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
      const androidDir = path.join(ROOT, 'apps', 'mobile', 'android');

      if (!fs.existsSync(androidDir)) {
        const log = writeLog('G10', 'apps/mobile/android directory not found');
        return { passed: false, summary: 'Android project directory missing', log };
      }

      const res = runCmd(path.join(androidDir, gradlew), ['assembleRelease'], { cwd: androidDir, timeout: 600000 });

      // Inspect built release APK artifact
      let artifactProof = 'No release APK artifact discovered';
      const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release');
      if (fs.existsSync(apkDir)) {
        const apks = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
        if (apks.length > 0) {
          const apkPath = path.join(apkDir, apks[0]);
          const stat = fs.statSync(apkPath);
          const hash = crypto.createHash('sha256').update(fs.readFileSync(apkPath)).digest('hex');
          artifactProof = `Artifact: ${apks[0]} | Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB | SHA-256: ${hash} | Built: ${stat.mtime.toISOString()}`;
        }
      }

      const passed = res.code === 0;
      const summary = passed ? `Release APK generated (${artifactProof})` : 'assembleRelease failed';
      const log = writeLog('G10', `=== gradlew assembleRelease Output ===\nExit Code: ${res.code}\n${artifactProof}\n\nSTDOUT:\n${res.stdout}\n\nSTDERR:\n${res.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G11',
    name: 'Playwright E2E Commerce Persona Journeys',
    category: 'End-to-End Testing',
    run: () => {
      const res = runCmd('npx', ['playwright', 'test', '--project=web-chromium'], { cwd: ROOT, timeout: 300000 });
      const log = writeLog('G11', `=== Playwright E2E Output ===\n${res.stdout}\n${res.stderr}`);
      return { passed: res.code === 0, summary: res.code === 0 ? 'Playwright E2E commerce flows passed' : 'E2E tests failed or not executed', log };
    }
  },
  {
    id: 'G12',
    name: 'Android Release Smoke Test on Emulator',
    category: 'Mobile Runtime Smoke',
    isAndroid: true,
    run: () => {
      if (skipAndroid) {
        const log = writeLog('G12', 'Gate skipped due to --skip-android flag');
        return { passed: false, skipped: true, summary: 'Skipped (--skip-android)', log };
      }
      const log = writeLog('G12', 'Android emulator smoke tests (Maestro/Detox) pending M7/V6 execution on host');
      return { passed: false, summary: 'Android release smoke test pending (V6)', log };
    }
  },
  {
    id: 'G13',
    name: 'Dependency Vulnerability Audit (N4)',
    category: 'Security & Dependencies',
    run: () => {
      const resRoot = runCmd('npm', ['audit', '--omit=dev', '--json'], { cwd: ROOT });
      const resMobile = runCmd('npm', ['audit', '--omit=dev', '--json'], { cwd: path.join(ROOT, 'apps', 'mobile') });

      let exceptions = [];
      const exFile = path.join(ROOT, 'docs', 'launch', 'accepted-exceptions.json');
      if (fs.existsSync(exFile)) {
        try {
          exceptions = JSON.parse(fs.readFileSync(exFile, 'utf8')).filter(e => e.gate === 'G13');
        } catch {}
      }

      // Filter only OWNER-APPROVED exceptions
      const approvedExceptions = exceptions.filter(e => e.ownerApproved !== null && e.ownerApproved !== undefined);

      let rootVulns = { critical: 0, high: 0, details: [] };
      let mobileVulns = { critical: 0, high: 0, details: [] };

      try {
        const rJson = JSON.parse(resRoot.stdout || '{}');
        const v = rJson.vulnerabilities || {};
        for (const [pkg, info] of Object.entries(v)) {
          if (info.severity === 'critical' || info.severity === 'high') {
            const isApproved = approvedExceptions.some(e => e.package === pkg || (e.scope && e.scope.includes(pkg)));
            if (!isApproved) {
              if (info.severity === 'critical') rootVulns.critical++;
              else rootVulns.high++;
              rootVulns.details.push({ pkg, severity: info.severity });
            }
          }
        }
      } catch {}

      try {
        const mJson = JSON.parse(resMobile.stdout || '{}');
        const v = mJson.vulnerabilities || {};
        for (const [pkg, info] of Object.entries(v)) {
          if (info.severity === 'critical' || info.severity === 'high') {
            const isApproved = approvedExceptions.some(e => e.package === pkg || (e.scope && e.scope.includes(pkg)));
            if (!isApproved) {
              if (info.severity === 'critical') mobileVulns.critical++;
              else mobileVulns.high++;
              mobileVulns.details.push({ pkg, severity: info.severity });
            }
          }
        }
      } catch {}

      const passed = rootVulns.critical === 0 && rootVulns.high === 0 && mobileVulns.critical === 0 && mobileVulns.high === 0;
      const unapprovedCount = rootVulns.critical + rootVulns.high + mobileVulns.critical + mobileVulns.high;
      const pendingApprovalCount = exceptions.length - approvedExceptions.length;

      const summary = passed
        ? `0 critical, 0 high unaccepted vulnerabilities (${approvedExceptions.length} approved exceptions)`
        : `Unaccepted: ${unapprovedCount} (Root: ${rootVulns.critical} crit / ${rootVulns.high} high; Mobile: ${mobileVulns.critical} crit / ${mobileVulns.high} high; ${pendingApprovalCount} pending owner approval)`;

      const log = writeLog('G13', `=== Root npm audit ===\n${resRoot.stdout}\n\n=== Mobile npm audit ===\n${resMobile.stdout}\n\n=== Unapproved Vulns ===\nRoot: ${JSON.stringify(rootVulns.details, null, 2)}\nMobile: ${JSON.stringify(mobileVulns.details, null, 2)}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G14',
    name: 'Secret Scan of Tracked Files',
    category: 'Security & Credentials',
    run: () => {
      const scanResult = scanTrackedFiles({ targetDir: ROOT });
      const passed = scanResult.passed;
      const summary = passed
        ? 'Zero secrets discovered in tracked git repository files'
        : `${scanResult.violationCount} tracked files match secret patterns`;
      const log = writeLog('G14', `=== Secret Scan Report ===\nViolations: ${JSON.stringify(scanResult.violations, null, 2)}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G15',
    name: 'Launch Policy & Harness Self-Tests (G15 Suite)',
    category: 'Launch Policy Compliance',
    run: () => {
      const policyReport = runLaunchPolicyTests();
      const selfTestRes = runCmd('node', ['--test', 'scripts/verify/__tests__/harness.test.mjs'], { cwd: ROOT });
      const selfTestsPassed = selfTestRes.code === 0;

      const passed = policyReport.passed && selfTestsPassed;
      const summary = passed
        ? 'All launch policy checks and harness self-tests passed (0 violations)'
        : `Violations: Policy=${policyReport.passed ? 'PASS' : 'FAIL'}, HarnessSelfTests=${selfTestsPassed ? 'PASS' : 'FAIL'}`;

      const log = writeLog('G15', `=== Launch Policy Tests ===\n${JSON.stringify(policyReport, null, 2)}\n\n=== Harness Self-Tests ===\nExit Code: ${selfTestRes.code}\n${selfTestRes.stdout}\n${selfTestRes.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G16',
    name: 'Accessibility Audits (axe Core & WCAG 2.1 AA)',
    category: 'Accessibility',
    run: () => {
      const res = runCmd('node', ['apps/web/tests/a11y.test.mjs'], { cwd: ROOT });
      const passed = res.code === 0;
      const summary = passed ? 'WCAG 2.1 AA & semantic accessibility suite passed (0 violations)' : 'Accessibility violations detected';
      const log = writeLog('G16', `=== Accessibility Test Output ===\n${res.stdout}\n${res.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G17',
    name: 'Performance Budgets & Asset Optimization',
    category: 'Performance',
    run: () => {
      const res = runCmd('node', ['apps/web/tests/performanceBudget.test.mjs'], { cwd: ROOT });
      const passed = res.code === 0;
      const summary = passed ? 'Performance budgets & dynamic code-splitting checks passed' : 'Performance budget violations detected';
      const log = writeLog('G17', `=== Performance Budget Output ===\n${res.stdout}\n${res.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G18',
    name: 'Target Feature Verification (features.json)',
    category: 'Feature Verification',
    run: () => {
      const report = verifyFeatures({ evidenceDir, writeStatus: isWriteStatusMode });
      const summary = `${report.verifiedCount} / ${report.launchTotal} launch features verified (${report.launchTotal > 0 ? ((report.verifiedCount / report.launchTotal) * 100).toFixed(1) : 0}%) [${report.codeCompleteCount} CODE COMPLETE, ${report.inProgressCount} IN PROGRESS]`;
      const log = writeLog('G18', `=== Feature Verification Summary ===\nTotal Launch Features: ${report.launchTotal}\nVerified: ${report.verifiedCount}\nCode Complete: ${report.codeCompleteCount}\nIn Progress: ${report.inProgressCount}\nNot Started: ${report.notStartedCount}\n\nDiscrepancies (${report.discrepancies.length}):\n${JSON.stringify(report.discrepancies, null, 2)}\n\nFeatures Breakdown:\n${JSON.stringify(report.features, null, 2)}`);
      return {
        passed: report.passed,
        summary,
        log,
        verifiedCount: report.verifiedCount,
        codeCompleteCount: report.codeCompleteCount,
        inProgressCount: report.inProgressCount,
        totalCount: report.launchTotal
      };
    }
  }
];

// -------------------------------------------------------------
// Orchestration & Execution
// -------------------------------------------------------------

async function main() {
  console.log(`\n=============================================================`);
  console.log(`🚀 LocalSampark Launch Program v3 — Verification Gate Runner`);
  console.log(`=============================================================`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Evidence Directory: docs/audit/evidence/${evidenceDirName}/`);
  console.log(`Mode: ${onlyGates ? `PARTIAL RUN (--only=${onlyGates.join(',')})` : 'FULL VERIFICATION RUN'}`);
  console.log(`Write Status: ${isWriteStatusMode ? 'ENABLED' : 'DISABLED'}\n`);

  const results = [];

  for (const gate of gates) {
    if (onlyGates && !onlyGates.includes(gate.id)) {
      results.push({
        id: gate.id,
        name: gate.name,
        category: gate.category,
        passed: false,
        skipped: true,
        summary: 'Skipped (--only filter)',
        log: null
      });
      continue;
    }

    process.stdout.write(`Executing Gate [${gate.id}] ${gate.name}... `);
    const start = Date.now();
    let res;
    try {
      res = gate.run();
    } catch (err) {
      res = {
        passed: false,
        summary: `Execution threw error: ${err.message}`,
        log: writeLog(gate.id, `Error:\n${err.stack}`)
      };
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const statusStr = res.skipped ? 'SKIPPED' : res.passed ? 'PASS' : 'FAIL';
    const icon = res.skipped ? '⏭️' : res.passed ? '✅' : '❌';
    console.log(`${icon} ${statusStr} (${elapsed}s) — ${res.summary}`);

    results.push({
      id: gate.id,
      name: gate.name,
      category: gate.category,
      passed: res.passed,
      skipped: res.skipped || false,
      summary: res.summary,
      log: res.log
    });
  }

  // Calculate Metrics
  const passedGates = results.filter(r => r.passed).length;
  const totalGates = results.length;
  const gatePercentage = ((passedGates / totalGates) * 100).toFixed(1);

  // Features Metric
  const g18Result = results.find(r => r.id === 'G18');
  let featureMetricStr = '0 / 0 (0.0%)';
  if (g18Result && g18Result.totalCount !== undefined) {
    const fPct = g18Result.totalCount > 0 ? ((g18Result.verifiedCount / g18Result.totalCount) * 100).toFixed(1) : '0.0';
    featureMetricStr = `${g18Result.verifiedCount} / ${g18Result.totalCount} (${fPct}%) [${g18Result.codeCompleteCount} CODE COMPLETE, ${g18Result.inProgressCount} IN PROGRESS]`;
  }

  const isPartialRun = !!onlyGates;

  // Summary JSON
  const summaryJson = {
    timestamp: new Date().toISOString(),
    evidenceDirectory: `docs/audit/evidence/${evidenceDirName}`,
    partial: isPartialRun,
    gatesPassed: passedGates,
    totalGates,
    gatePassPercentage: `${gatePercentage}%`,
    featureCompletion: featureMetricStr,
    results
  };
  fs.writeFileSync(path.join(evidenceDir, 'summary.json'), JSON.stringify(summaryJson, null, 2), 'utf8');

  // Rule 2B.3 & H12: Partial runs never overwrite STATUS.md. Only full runs regenerate STATUS.md.
  if (!isPartialRun) {
    const statusContent = renderStatusMarkdown(summaryJson);
    fs.writeFileSync(path.join(ROOT, 'docs', 'launch', 'STATUS.md'), statusContent, 'utf8');
    console.log(`\n📄 Regenerated Honest Status Report: docs/launch/STATUS.md`);
  } else {
    console.log(`\nℹ️  Partial run executed (--only). docs/launch/STATUS.md preserved unmodified per Rule 2B.3.`);
  }

  console.log(`\n=============================================================`);
  console.log(`📊 Gate Pass Rate: ${passedGates} / ${totalGates} (${gatePercentage}%)`);
  console.log(`📦 Feature Completion Rate: ${featureMetricStr}`);
  console.log(`=============================================================\n`);

  const allPassed = passedGates === totalGates;
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error running verify-all:', err);
  process.exit(1);
});
