/**
 * scripts/verify/feature-verifier.mjs
 *
 * Ground-truth feature verification analyzer (Gate G18 / H1).
 * Computes the honest status of each feature in features.json by inspecting
 * real test execution reports across all designated platforms and engines.
 *
 * Rules:
 * 1. A feature is VERIFIED only if:
 *    - EVERY platform in feature.platforms has >= 1 passed tagged test matching [ID.n] or [ID].
 *    - ZERO tagged tests failed on any platform or engine.
 *    - All paths in feature.evidence exist on disk and are tracked by git.
 *    - Full end-to-end evidence is present for platform-only features (e.g. P10 PG restore rehearsal).
 * 2. CODE COMPLETE: API tests pass on both SQLite & PostgreSQL with 0 failures,
 *    or static unit checks pass, but end-to-end / UI / mobile proofs are pending.
 * 3. IN PROGRESS: Tagged tests exist but some fail, or no tagged tests exist yet.
 * 4. NOT STARTED: No tests and no code evidence.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

export function getTrackedGitFiles() {
  try {
    const res = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
    if (res.status === 0) {
      return new Set(res.stdout.split('\n').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean));
    }
  } catch {}
  return new Set();
}

/**
 * Extracts tagged feature IDs from a test string (e.g. "[C8.1] quote calculation", "P12.1 [a11y]: skip link").
 */
export function extractFeatureIds(testTitle) {
  const ids = new Set();
  if (!testTitle) return ids;

  // Pattern 1: [ID.n] or [ID] like [C8.1], [C8], [P12.3], [S1], [A14]
  const bracketMatches = testTitle.match(/\[([A-Z][0-9]+)(?:\.[0-9]+)?\]/g);
  if (bracketMatches) {
    for (const m of bracketMatches) {
      const match = m.match(/\[([A-Z][0-9]+)/);
      if (match) ids.add(match[1]);
    }
  }

  // Pattern 2: Word boundary prefix like P12.1 or C1.2
  const prefixMatches = testTitle.match(/\b([A-Z][0-9]+)\.[0-9]+\b/g);
  if (prefixMatches) {
    for (const m of prefixMatches) {
      const match = m.match(/^([A-Z][0-9]+)/);
      if (match) ids.add(match[1]);
    }
  }

  return ids;
}

/**
 * Parses Jest JSON output into structured platform test outcomes.
 */
export function parseJestReport(reportPath, platform, engine) {
  const results = [];
  if (!fs.existsSync(reportPath)) return results;

  try {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const testSuites = data.testResults || [];

    for (const suite of testSuites) {
      const assertions = suite.assertionResults || [];
      for (const a of assertions) {
        const title = a.fullName || a.title || '';
        const featureIds = extractFeatureIds(title);
        if (featureIds.size > 0) {
          for (const fid of featureIds) {
            results.push({
              featureId: fid,
              title,
              platform,
              engine,
              status: a.status // 'passed', 'failed', 'pending', 'skipped'
            });
          }
        }
      }
    }
  } catch {}

  return results;
}

/**
 * Parses a Playwright JSON report (written by G11 to evidence/playwright.json).
 *
 * Its shape is nested suites -> specs -> tests (one per project), not Jest's
 * testResults/assertionResults, so it needs its own parser: run through
 * parseJestReport it yielded nothing and no web/admin feature could ever verify.
 * The platform comes from the project: web-* -> web, admin-* -> admin; other
 * projects (visual, api, a11y, mobile web emulation) are not platform proof.
 * Only a test whose outcome is "expected" counts as passed. "flaky" (passed on a
 * retry) and "unexpected" count as failed; "skipped" counts as neither.
 */
export function parsePlaywrightReport(reportPath) {
  const results = [];
  if (!fs.existsSync(reportPath)) return results;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    return results;
  }
  const platformOf = (project) => (/^web-/.test(project) ? 'web' : /^admin-/.test(project) ? 'admin' : null);
  const walk = (suite, titles) => {
    const here = suite.title && !/\.(spec|test)\.[jt]s$/.test(suite.title) ? [...titles, suite.title] : titles;
    for (const spec of suite.specs || []) {
      const title = [...here, spec.title].join(' > ');
      const featureIds = extractFeatureIds(title);
      if (featureIds.size === 0) continue;
      for (const t of spec.tests || []) {
        const platform = platformOf(t.projectName || '');
        if (!platform) continue;
        const status = t.status === 'expected' ? 'passed' : t.status === 'skipped' ? 'skipped' : 'failed';
        for (const fid of featureIds) {
          results.push({ featureId: fid, title, platform, engine: 'playwright', status });
        }
      }
    }
    for (const child of suite.suites || []) walk(child, here);
  };
  for (const s of data.suites || []) walk(s, []);
  return results;
}

/**
 * Parses node --test text output from G7 (web) or G8 (admin) log files.
 */
export function parseNodeTestLog(logPath, platform) {
  const results = [];
  if (!fs.existsSync(logPath)) return results;

  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const isPass = line.includes('✔') || line.includes('ok ');
      const isFail = line.includes('✖') || line.includes('not ok ');
      if (!isPass && !isFail) continue;

      const featureIds = extractFeatureIds(line);
      if (featureIds.size > 0) {
        for (const fid of featureIds) {
          results.push({
            featureId: fid,
            title: line.trim(),
            platform,
            engine: 'node-test',
            status: isPass ? 'passed' : 'failed'
          });
        }
      }
    }
  } catch {}

  return results;
}

/**
 * Computes honest status for all features based on evidence test reports.
 */
export function verifyFeatures({ evidenceDir, writeStatus = false, featuresPath, allowApiOnlyVerification = false } = {}) {
  const featPath = featuresPath || path.join(ROOT, 'docs', 'launch', 'features.json');
  if (!fs.existsSync(featPath)) {
    throw new Error(`features.json not found at ${featPath}`);
  }

  const features = JSON.parse(fs.readFileSync(featPath, 'utf8'));
  const trackedFiles = getTrackedGitFiles();

  // Load available test reports
  const testResults = [];

  // SQLite Jest
  const sqliteJson = evidenceDir ? path.join(evidenceDir, 'jest-sqlite.json') : null;
  if (sqliteJson && fs.existsSync(sqliteJson)) {
    testResults.push(...parseJestReport(sqliteJson, 'api', 'sqlite'));
  }

  // Postgres Jest
  const postgresJson = evidenceDir ? path.join(evidenceDir, 'jest-postgres.json') : null;
  if (postgresJson && fs.existsSync(postgresJson)) {
    testResults.push(...parseJestReport(postgresJson, 'api', 'postgres'));
  }

  // Web & Admin node --test logs from evidence
  const g7Log = evidenceDir ? path.join(evidenceDir, 'G7.txt') : null;
  if (g7Log && fs.existsSync(g7Log)) {
    testResults.push(...parseNodeTestLog(g7Log, 'web'));
  }

  const g8Log = evidenceDir ? path.join(evidenceDir, 'G8.txt') : null;
  if (g8Log && fs.existsSync(g8Log)) {
    testResults.push(...parseNodeTestLog(g8Log, 'admin'));
  }

  // Playwright E2E report if available
  const playwrightJson = evidenceDir ? path.join(evidenceDir, 'playwright.json') : null;
  if (playwrightJson && fs.existsSync(playwrightJson)) {
    testResults.push(...parsePlaywrightReport(playwrightJson));
  }

  // Mobile Jest report if available
  const mobileJestJson = evidenceDir ? path.join(evidenceDir, 'jest-mobile.json') : null;
  if (mobileJestJson && fs.existsSync(mobileJestJson)) {
    testResults.push(...parseJestReport(mobileJestJson, 'android', 'hermes'));
  }

  const featureSummaries = [];
  const discrepancies = [];
  let verifiedCount = 0;
  let codeCompleteCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;

  for (const feature of features) {
    const isLaunch = feature.scope === 'launch';
    const reqPlatforms = feature.platforms || [];
    const featureTests = testResults.filter(t => t.featureId === feature.id);

    const passedTests = featureTests.filter(t => t.status === 'passed');
    const failedTests = featureTests.filter(t => t.status === 'failed');

    // Engine checks for API
    const passedSqliteApi = passedTests.filter(t => t.platform === 'api' && t.engine === 'sqlite');
    const passedPostgresApi = passedTests.filter(t => t.platform === 'api' && t.engine === 'postgres');
    const failedApi = failedTests.filter(t => t.platform === 'api');

    // Platform coverage checks
    const platformStatus = {};
    for (const p of reqPlatforms) {
      if (p === 'api') {
        platformStatus[p] = passedSqliteApi.length > 0 && passedPostgresApi.length > 0 && failedApi.length === 0;
      } else if (p === 'web') {
        // Per H1: web requires Playwright web-* project test pass. Static node tests only establish CODE COMPLETE.
        const passedPlaywright = passedTests.filter(t => t.platform === 'web' && (t.engine === 'playwright' || t.engine === 'browser'));
        const failedWeb = failedTests.filter(t => t.platform === 'web');
        platformStatus[p] = passedPlaywright.length > 0 && failedWeb.length === 0;
      } else if (p === 'admin') {
        const passedAdmin = passedTests.filter(t => t.platform === 'admin' && (t.engine === 'playwright' || t.engine === 'browser'));
        const failedAdmin = failedTests.filter(t => t.platform === 'admin');
        platformStatus[p] = passedAdmin.length > 0 && failedAdmin.length === 0;
      } else if (p === 'android') {
        const passedMobile = passedTests.filter(t => t.platform === 'android');
        const failedMobile = failedTests.filter(t => t.platform === 'android');
        platformStatus[p] = passedMobile.length > 0 && failedMobile.length === 0;
      } else {
        const passedP = passedTests.filter(t => t.platform === p);
        const failedP = failedTests.filter(t => t.platform === p);
        platformStatus[p] = passedP.length > 0 && failedP.length === 0;
      }
    }

    // Evidence existence & git tracking
    const evidenceList = feature.evidence || [];
    let evidenceAllTracked = evidenceList.length > 0;
    const missingEvidence = [];
    for (const ev of evidenceList) {
      const normEv = ev.replace(/\\/g, '/');
      const fullEv = path.join(ROOT, ev);
      if (!fs.existsSync(fullEv) || (trackedFiles.size > 0 && !trackedFiles.has(normEv))) {
        evidenceAllTracked = false;
        missingEvidence.push(normEv);
      }
    }

    let computedStatus = 'IN PROGRESS';

    if (failedTests.length > 0) {
      computedStatus = 'IN PROGRESS';
    } else {
      const allPlatformsPassed = reqPlatforms.length > 0 && reqPlatforms.every(p => platformStatus[p]);
      
      // API-only features like P1, P2, P3, P4, P5, P8, P9, P10 require milestone-specific completion
      // (e.g. P10 needs restore rehearsal V9, P1 needs D9 canonical pipeline, P8 Sentry V7).
      // Until full launch verification in V10 (full run with G1-G17 all passing), API-only features remain CODE COMPLETE.
      const isApiOnly = reqPlatforms.length === 1 && reqPlatforms[0] === 'api';
      const apiOnlyReady = isApiOnly && allowApiOnlyVerification;

      const passedWebUnit = passedTests.filter(t => t.platform === 'web');
      const failedWebUnit = failedTests.filter(t => t.platform === 'web');
      const hasPassedWebUnit = passedWebUnit.length > 0 && failedWebUnit.length === 0;

      if (allPlatformsPassed && evidenceAllTracked && (!isApiOnly || apiOnlyReady)) {
        computedStatus = 'VERIFIED';
      } else if (
        (reqPlatforms.includes('api') && passedSqliteApi.length > 0 && passedPostgresApi.length > 0 && failedApi.length === 0) ||
        (isApiOnly && passedSqliteApi.length > 0 && passedPostgresApi.length > 0 && failedApi.length === 0) ||
        (['P7', 'P12', 'P13'].includes(feature.id) && hasPassedWebUnit)
      ) {
        // API layer or static web layer is complete on both engines with 0 failures
        computedStatus = 'CODE COMPLETE';
      } else if (passedTests.length > 0) {
        computedStatus = 'IN PROGRESS';
      } else {
        const definedTests = feature.tests || [];
        computedStatus = definedTests.length > 0 ? 'IN PROGRESS' : 'NOT STARTED';
      }
    }

    if (feature.status !== computedStatus) {
      discrepancies.push({
        id: feature.id,
        title: feature.title,
        storedStatus: feature.status,
        computedStatus,
        failedTests: failedTests.map(t => `${t.platform}/${t.engine}: ${t.title}`),
        missingPlatforms: reqPlatforms.filter(p => !platformStatus[p]),
        missingEvidence
      });
      if (writeStatus) {
        feature.status = computedStatus;
      }
    }

    if (isLaunch) {
      if (computedStatus === 'VERIFIED') verifiedCount++;
      else if (computedStatus === 'CODE COMPLETE') codeCompleteCount++;
      else if (computedStatus === 'IN PROGRESS') inProgressCount++;
      else if (computedStatus === 'NOT STARTED') notStartedCount++;
    }

    featureSummaries.push({
      id: feature.id,
      title: feature.title,
      scope: feature.scope,
      status: computedStatus,
      platforms: reqPlatforms,
      passedTestCount: passedTests.length,
      failedTestCount: failedTests.length
    });
  }

  if (writeStatus && discrepancies.length > 0) {
    fs.writeFileSync(featPath, JSON.stringify(features, null, 2) + '\n', 'utf8');
  }

  const launchTotal = features.filter(f => f.scope === 'launch').length;

  return {
    verifiedCount,
    codeCompleteCount,
    inProgressCount,
    notStartedCount,
    launchTotal,
    discrepancies,
    features: featureSummaries,
    passed: discrepancies.length === 0 && verifiedCount === launchTotal
  };
}

// CLI usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const writeStatus = args.includes('--write-status');
  let evidenceDir = null;

  for (const arg of args) {
    if (arg.startsWith('--evidence=')) {
      evidenceDir = arg.slice(11);
    }
  }

  if (!evidenceDir) {
    const evBase = path.join(ROOT, 'docs', 'audit', 'evidence');
    if (fs.existsSync(evBase)) {
      const dirs = fs.readdirSync(evBase).filter(d => d.startsWith('verify-')).sort().reverse();
      if (dirs.length > 0) {
        evidenceDir = path.join(evBase, dirs[0]);
      }
    }
  }

  console.log(`🔍 Running Feature Verifier (Gate G18 Analyzer)...`);
  console.log(`Using Evidence Directory: ${evidenceDir || 'None'}`);
  console.log(`Write Status Mode: ${writeStatus ? 'ENABLED' : 'DISABLED'}\n`);

  try {
    const report = verifyFeatures({ evidenceDir, writeStatus });
    console.log(`Computed Feature Statuses (Launch Scope: ${report.launchTotal}):`);
    console.log(`  - VERIFIED:      ${report.verifiedCount} / ${report.launchTotal}`);
    console.log(`  - CODE COMPLETE: ${report.codeCompleteCount} / ${report.launchTotal}`);
    console.log(`  - IN PROGRESS:   ${report.inProgressCount} / ${report.launchTotal}`);
    console.log(`  - NOT STARTED:   ${report.notStartedCount} / ${report.launchTotal}`);

    if (report.discrepancies.length > 0) {
      console.log(`\n⚠️  Found ${report.discrepancies.length} status discrepancies with features.json:`);
      for (const d of report.discrepancies.slice(0, 10)) {
        console.log(`  ↳ [${d.id}] ${d.title}: Stored "${d.storedStatus}" vs Computed "${d.computedStatus}" (Missing: ${d.missingPlatforms.join(', ') || 'evidence'})`);
      }
      if (report.discrepancies.length > 10) {
        console.log(`  ↳ ... and ${report.discrepancies.length - 10} more.`);
      }
      if (!writeStatus) {
        console.log(`\n❌ Gate G18 Violation: features.json contains unverified statuses. Use --write-status to synchronize.`);
        process.exit(1);
      } else {
        console.log(`\n✅ features.json synchronized with computed verification results.`);
      }
    } else {
      console.log(`\n✅ features.json perfectly matches computed verification status.`);
    }
  } catch (err) {
    console.error('Fatal error verifying features:', err);
    process.exit(1);
  }
}
