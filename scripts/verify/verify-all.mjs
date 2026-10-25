/**
 * scripts/verify/verify-all.mjs
 *
 * Master Verification Gate Runner for LocalSampark Launch Program v2.
 * Executes Gates G1 through G18 per Section 9 specifications.
 *
 * Usage:
 *   node scripts/verify/verify-all.mjs
 *   node scripts/verify/verify-all.mjs --skip-android
 *   node scripts/verify/verify-all.mjs --only G1,G13,G14,G15
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { runLaunchPolicyTests } from './launch-policy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

// Parse CLI flags
const args = process.argv.slice(2);
let onlyGates = null;
let skipAndroid = false;

for (const arg of args) {
  if (arg.startsWith('--only=')) {
    onlyGates = arg.slice(7).split(',').map(s => s.trim().toUpperCase());
  } else if (arg === '--only' && args[args.indexOf(arg) + 1]) {
    onlyGates = args[args.indexOf(arg) + 1].split(',').map(s => s.trim().toUpperCase());
  } else if (arg === '--skip-android') {
    skipAndroid = true;
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

function writeLog(gateId, content) {
  const logPath = path.join(evidenceDir, `${gateId}.log`);
  fs.writeFileSync(logPath, content, 'utf8');
  return `docs/audit/evidence/${evidenceDirName}/${gateId}.log`;
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
      // Ground rules: Must verify local host
      const env = {
        ...process.env,
        USE_SQLITE: 'false',
        TEST_USE_POSTGRES: '1',
        DB_HOST: '127.0.0.1',
        DB_PORT: '5432',
        DB_NAME: 'localsampark',
        DB_USER: 'postgres',
        DB_PASSWORD: 'password',
        DATABASE_URL: 'postgresql://postgres:password@127.0.0.1:5432/localsampark',
        DIRECT_URL: 'postgresql://postgres:password@127.0.0.1:5432/localsampark',
        SUPABASE_URL: '',
        NODE_ENV: 'test'
      };

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
          summary = `${report.numPassedTests} passed, ${report.numFailedTests} failed on PostgreSQL`;
        } catch {
          passed = false;
        }
      }

      const log = writeLog('G3', `=== Backend Jest on PostgreSQL Execution ===\nExit Code: ${res.code}\nSummary: ${summary}\n\nSTDOUT:\n${res.stdout}\n\nSTDERR:\n${res.stderr}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G4',
    name: 'Database Migrations & Seed Idempotency',
    category: 'Database Integrity',
    run: () => {
      // Run sqlite migration and verify seed
      const resMigrate = runCmd('node', ['src/migrations/run.js'], { cwd: path.join(ROOT, 'backend') });
      const resSeed = runCmd('node', ['src/seeds/seed-investor-demo.js', '--verify'], { cwd: path.join(ROOT, 'backend') });

      const passed = resMigrate.code === 0 && resSeed.code === 0;
      const summary = passed ? 'Migrations and demo seed verify succeeded' : 'Migration or seed verification failed';
      const log = writeLog('G4', `=== SQLite Migration Output ===\n${resMigrate.stdout}\n${resMigrate.stderr}\n\n=== Seed Verify Output ===\n${resSeed.stdout}\n${resSeed.stderr}`);
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
        const log = writeLog('G5', 'route-auth-matrix.mjs test script not yet created (M1 deliverable)');
        return { passed: false, summary: 'Route-auth matrix test pending implementation (M1)', log };
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
        const log = writeLog('G6', 'Postgres concurrency and idempotency test suite pending implementation (M1/M3)');
        return { passed: false, summary: 'Concurrency suite on Postgres pending implementation', log };
      }
      const env = {
        ...process.env,
        USE_SQLITE: 'false',
        TEST_USE_POSTGRES: '1',
        DB_HOST: '127.0.0.1',
        DB_PORT: '5432',
        DB_NAME: 'localsampark',
        DB_USER: 'postgres',
        DB_PASSWORD: 'password',
        DATABASE_URL: 'postgresql://postgres:password@127.0.0.1:5432/localsampark',
        DIRECT_URL: 'postgresql://postgres:password@127.0.0.1:5432/localsampark',
        NODE_ENV: 'test'
      };
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
      // Run unit tests and production build
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

      // Section 9: "expo-doctor has 0 failed checks (or only an owner-accepted allowlist)"
      const ACCEPTED_DOCTOR_CHECKS = [
        'Check dependencies for packages that should not be installed directly',
        'Check that no duplicate dependencies are installed',
        'Check for app config fields that may not be synced in a non-CNG project'
      ];
      const failedChecks = (resDoctor.stdout.match(/✖\s+([^\r\n]+)/g) || []).map(m => m.replace(/✖\s+/, '').trim());
      const unacceptedFails = failedChecks.filter(c => !ACCEPTED_DOCTOR_CHECKS.some(a => c.includes(a)));
      const doctorOk = resDoctor.code === 0 || (failedChecks.length > 0 && unacceptedFails.length === 0);

      const passed = doctorOk && resLint.code === 0 && resTest.code === 0 && resExport.code === 0;
      const summary = passed 
        ? `Mobile Jest, ESLint, expo-doctor${resDoctor.code !== 0 ? ' (with allowlisted warnings)' : ''}, and export passed`
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
      const log = writeLog('G10', `=== gradlew assembleRelease Output ===\n${res.stdout}\n${res.stderr}`);
      return { passed: res.code === 0, summary: res.code === 0 ? 'Android release APK generated' : 'assembleRelease failed', log };
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
      const log = writeLog('G12', 'Android emulator smoke tests (Maestro/Detox) pending M7 execution');
      return { passed: false, summary: 'Android release smoke test pending (M7)', log };
    }
  },
  {
    id: 'G13',
    name: 'Dependency Vulnerability Audit (N4)',
    category: 'Security & Dependencies',
    run: () => {
      // Run npm audit --omit=dev at root and apps/mobile
      const resRoot = runCmd('npm', ['audit', '--omit=dev', '--json'], { cwd: ROOT });
      const resMobile = runCmd('npm', ['audit', '--omit=dev', '--json'], { cwd: path.join(ROOT, 'apps', 'mobile') });

      let rootVulns = { critical: 0, high: 0 };
      let mobileVulns = { critical: 0, high: 0 };

      try {
        const rJson = JSON.parse(resRoot.stdout || '{}');
        rootVulns.critical = rJson.metadata?.vulnerabilities?.critical || 0;
        rootVulns.high = rJson.metadata?.vulnerabilities?.high || 0;
      } catch {}

      try {
        const mJson = JSON.parse(resMobile.stdout || '{}');
        mobileVulns.critical = mJson.metadata?.vulnerabilities?.critical || 0;
        mobileVulns.high = mJson.metadata?.vulnerabilities?.high || 0;
      } catch {}

      const passed = rootVulns.critical === 0 && rootVulns.high === 0 && mobileVulns.critical === 0 && mobileVulns.high === 0;
      const summary = passed
        ? '0 critical, 0 high vulnerabilities in production dependencies'
        : `Root: ${rootVulns.critical} crit / ${rootVulns.high} high; Mobile: ${mobileVulns.critical} crit / ${mobileVulns.high} high`;

      const log = writeLog('G13', `=== Root npm audit ===\n${resRoot.stdout}\n\n=== Mobile npm audit ===\n${resMobile.stdout}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G14',
    name: 'Secret Scan of Tracked Files',
    category: 'Security & Credentials',
    run: () => {
      const gitFilesRes = runCmd('git', ['ls-files'], { cwd: ROOT });
      const files = gitFilesRes.stdout.split('\n').map(s => s.trim()).filter(Boolean);

      const secretPatterns = [
        /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----\s*[A-Za-z0-9+/=]{20,}/,
        /service_role_key\s*[:=]\s*['"]?eyJ[A-Za-z0-9-_=]{20,}/i,
        /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?eyJ[A-Za-z0-9-_=]{20,}/i,
        /rzp_live_[a-zA-Z0-9]{14}/
      ];

      const violations = [];
      for (const file of files) {
        // Exclude sample files or test mocks
        if (file.endsWith('.example') || file.endsWith('.template') || file.includes('test') || file.includes('mock') || file.endsWith('.md')) continue;
        const fullPath = path.join(ROOT, file);
        if (!fs.existsSync(fullPath)) continue;

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of secretPatterns) {
            if (pattern.test(content)) {
              violations.push({ file, pattern: pattern.toString() });
              break;
            }
          }
        } catch {}
      }

      const passed = violations.length === 0;
      const summary = passed ? 'Zero secrets discovered in tracked git repository files' : `${violations.length} tracked files match secret patterns`;
      const log = writeLog('G14', `=== Secret Scan Report ===\nViolations: ${JSON.stringify(violations, null, 2)}`);
      return { passed, summary, log };
    }
  },
  {
    id: 'G15',
    name: 'Launch Policy Tests (G15 Suite)',
    category: 'Launch Policy Compliance',
    run: () => {
      const report = runLaunchPolicyTests();
      const summary = report.passed
        ? 'All launch policy checks passed (0 violations)'
        : `Policy violations present in ${Object.values(report.checks).filter(c => !c.passed).length} checks`;
      const log = writeLog('G15', JSON.stringify(report, null, 2));
      return { passed: report.passed, summary, log };
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
      const featuresPath = path.join(ROOT, 'docs', 'launch', 'features.json');
      if (!fs.existsSync(featuresPath)) {
        const log = writeLog('G18', 'features.json not found');
        return { passed: false, summary: 'features.json missing', log };
      }

      const features = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
      const launchFeatures = features.filter(f => f.scope === 'launch');
      const verifiedFeatures = launchFeatures.filter(f => f.status === 'VERIFIED');

      // 100% complete means all launch features are VERIFIED with evidence
      const passed = launchFeatures.length > 0 && verifiedFeatures.length === launchFeatures.length;
      const summary = `${verifiedFeatures.length} / ${launchFeatures.length} launch features verified (${launchFeatures.length > 0 ? ((verifiedFeatures.length / launchFeatures.length) * 100).toFixed(1) : 0}%)`;
      const log = writeLog('G18', `=== Feature Verification Summary ===\nTotal Launch Features: ${launchFeatures.length}\nVerified: ${verifiedFeatures.length}\nUnverified: ${launchFeatures.length - verifiedFeatures.length}\n\nList:\n${JSON.stringify(launchFeatures.map(f => ({ id: f.id, title: f.title, status: f.status })), null, 2)}`);
      return { passed, summary, log, verifiedCount: verifiedFeatures.length, totalCount: launchFeatures.length };
    }
  }
];

// -------------------------------------------------------------
// Orchestration & STATUS.md Generation
// -------------------------------------------------------------

async function main() {
  console.log(`\n=============================================================`);
  console.log(`🚀 LocalSampark Launch Program v2 — Verification Gate Runner`);
  console.log(`=============================================================`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Evidence Directory: docs/audit/evidence/${evidenceDirName}/\n`);

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
  const featuresPath = path.join(ROOT, 'docs', 'launch', 'features.json');
  let featureMetricStr = '0 / 0 (0.0%)';
  if (fs.existsSync(featuresPath)) {
    const features = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
    const launchFeatures = features.filter(f => f.scope === 'launch');
    const verifiedFeatures = launchFeatures.filter(f => f.status === 'VERIFIED');
    const fPct = launchFeatures.length > 0 ? ((verifiedFeatures.length / launchFeatures.length) * 100).toFixed(1) : '0.0';
    featureMetricStr = `${verifiedFeatures.length} / ${launchFeatures.length} (${fPct}%)`;
  }

  // Summary JSON
  const summaryJson = {
    timestamp: new Date().toISOString(),
    evidenceDirectory: `docs/audit/evidence/${evidenceDirName}`,
    gatesPassed: passedGates,
    totalGates,
    gatePassPercentage: `${gatePercentage}%`,
    featureCompletion: featureMetricStr,
    results
  };
  fs.writeFileSync(path.join(evidenceDir, 'summary.json'), JSON.stringify(summaryJson, null, 2), 'utf8');

  // Regenerate docs/launch/STATUS.md
  generateStatusMarkdown(summaryJson);

  console.log(`\n=============================================================`);
  console.log(`📊 Gate Pass Rate: ${passedGates} / ${totalGates} (${gatePercentage}%)`);
  console.log(`📦 Feature Completion Rate: ${featureMetricStr}`);
  console.log(`📄 Generated Status Report: docs/launch/STATUS.md`);
  console.log(`=============================================================\n`);

  // Exit non-zero if any required gate failed
  const allPassed = passedGates === totalGates;
  process.exit(allPassed ? 0 : 1);
}

function generateStatusMarkdown(data) {
  const statusFilePath = path.join(ROOT, 'docs', 'launch', 'STATUS.md');

  const lines = [
    `# LocalSampark — System Verification Status (STATUS.md)`,
    ``,
    `> **Automated Report:** Generated dynamically by \`scripts/verify/verify-all.mjs\`. Do not edit by hand.`,
    ``,
    `- **Last Execution Timestamp:** \`${data.timestamp}\``,
    `- **Evidence Path:** [\`${data.evidenceDirectory}\`](file:///${ROOT.replace(/\\/g, '/')}/${data.evidenceDirectory})`,
    `- **Overall Gate Pass Rate:** **${data.gatesPassed} / ${data.totalGates} (${data.gatePassPercentage})**`,
    `- **Verified Feature Completion Rate:** **${data.featureCompletion}**`,
    ``,
    `---`,
    ``,
    `## 1. Machine-Verified Gate Summary`,
    ``,
    `| Gate | Name | Category | Status | Details | Raw Evidence Log |`,
    `| :--- | :--- | :--- | :---: | :--- | :--- |`
  ];

  for (const r of data.results) {
    const statusBadge = r.skipped ? '⏭️ SKIPPED' : r.passed ? '✅ PASS' : '❌ FAIL';
    const logLink = r.log ? `[\`${r.id}.log\`](file:///${ROOT.replace(/\\/g, '/')}/${r.log})` : '—';
    lines.push(`| **${r.id}** | ${r.name} | ${r.category} | ${statusBadge} | ${r.summary} | ${logLink} |`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 2. Honest Baseline Assessment (M0 Reset)`,
    ``,
    `Following the forensic re-evaluation of branch \`audit/deep-debug-2026-10\`:`,
    `- Previous claims of 100% production readiness were unverified and superseded.`,
    `- Real machine gates establish honest baseline status: **${data.gatePassPercentage} gates passing**, **${data.featureCompletion} launch features verified**.`,
    `- Active milestone work is proceeding on branch \`launch/ecommerce-v1\` to systematically clear open leads (L5, L9-L15) and P0/P1 launch blockers (N1-N17).`
  );

  fs.writeFileSync(statusFilePath, lines.join('\n'), 'utf8');
}

main().catch(err => {
  console.error('Fatal error running verify-all:', err);
  process.exit(1);
});
