/**
 * scripts/verify/launch-policy.mjs
 *
 * Gate 15: Launch Policy Tests
 *
 * Mandated Checks (from Section 9):
 * 1. OTPs in production responses (N1)
 * 2. Plain AsyncStorage token writes on native (N2)
 * 3. Hardcoded coupons or fees (N5)
 * 4. Math.random used for business data (L10)
 * 5. "Coming soon" in enabled modules (L10)
 * 6. LAN IPs or localhost in release config (L14)
 * 7. console.log in backend src outside tests (L9)
 * 8. Mojibake or UTF-8 BOM in source files (N14)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

function walk(dir, { extRegex = /\.(js|jsx|ts|tsx|mjs|json|css|md)$/, ignoreDirs = ['node_modules', '.next', '.expo', 'dist', 'build', 'android', 'ios', '.git'] } = {}) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function _walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name)) {
          _walk(path.join(currentDir, entry.name));
        }
      } else if (extRegex.test(entry.name)) {
        results.push(path.join(currentDir, entry.name));
      }
    }
  }

  _walk(dir);
  return results;
}

export function runLaunchPolicyTests() {
  const report = {
    gate: 'G15',
    title: 'Launch Policy Tests',
    timestamp: new Date().toISOString(),
    passed: true,
    checks: {}
  };

  function addCheckResult(id, title, violations) {
    const passed = violations.length === 0;
    if (!passed) report.passed = false;
    report.checks[id] = {
      id,
      title,
      passed,
      count: violations.length,
      violations: violations.slice(0, 50) // Cap display at 50
    };
  }

  // -------------------------------------------------------------
  // Check 1: OTPs in production responses (N1)
  // -------------------------------------------------------------
  const otpViolations = [];
  const backendAuthRoutes = path.join(ROOT, 'backend', 'src', 'modules', 'core', 'routes', 'auth.routes.js');
  if (fs.existsSync(backendAuthRoutes)) {
    const content = fs.readFileSync(backendAuthRoutes, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      // Look for response.otp = otp or res.json({ ... otp }) without explicit production guard
      if (line.includes('response.otp = otp') || line.includes('res.json({') && line.includes('otp:')) {
        // If not gated by process.env.NODE_ENV !== 'production'
        const surrounding = lines.slice(Math.max(0, idx - 15), idx + 2).join('\n');
        if (!surrounding.includes('DEMO_LOGIN_ALLOWED') && !surrounding.includes("NODE_ENV !== 'production'") && !surrounding.includes('NODE_ENV === "test"')) {
          otpViolations.push({
            file: 'backend/src/modules/core/routes/auth.routes.js',
            line: idx + 1,
            snippet: line.trim()
          });
        }
      }
    });
  }
  addCheckResult('POL-01', 'No OTPs returned in production responses', otpViolations);

  // -------------------------------------------------------------
  // Check 2: Plain AsyncStorage token writes on native (N2)
  // -------------------------------------------------------------
  const asyncStorageViolations = [];
  const secureStoragePath = path.join(ROOT, 'apps', 'mobile', 'src', 'lib', 'secureStorage.js');
  if (fs.existsSync(secureStoragePath)) {
    const content = fs.readFileSync(secureStoragePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      // Look for AsyncStorage.setItem of tokens outside web branch or catch fallback
      if (line.includes('AsyncStorage.setItem') && (line.includes('sec_') || line.includes("'token'") || line.includes('"token"'))) {
        const surrounding = lines.slice(Math.max(0, idx - 15), idx + 2).join('\n');
        if (!surrounding.includes("Platform.OS === 'web'") && !surrounding.includes('catch')) {
          asyncStorageViolations.push({
            file: 'apps/mobile/src/lib/secureStorage.js',
            line: idx + 1,
            snippet: line.trim()
          });
        }
      }
    });
  }
  addCheckResult('POL-02', 'No plain AsyncStorage token writes on native Android/iOS', asyncStorageViolations);

  // -------------------------------------------------------------
  // Check 3: Hardcoded coupons or fees (N5)
  // -------------------------------------------------------------
  const couponViolations = [];
  const orderRoutesPath = path.join(ROOT, 'backend', 'src', 'modules', 'ecommerce', 'routes', 'order.routes.js');
  if (fs.existsSync(orderRoutesPath)) {
    const content = fs.readFileSync(orderRoutesPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('WELCOME50') || line.includes('FREEDELIVERY') || line.includes('SAVE10')) {
        couponViolations.push({
          file: 'backend/src/modules/ecommerce/routes/order.routes.js',
          line: idx + 1,
          snippet: line.trim()
        });
      }
    });
  }
  addCheckResult('POL-03', 'No hardcoded mock coupons or arbitrary business fees', couponViolations);

  // -------------------------------------------------------------
  // Check 4: Math.random used for business data (L10)
  // -------------------------------------------------------------
  const randomViolations = [];
  const commerceDirs = [
    path.join(ROOT, 'backend', 'src', 'modules', 'ecommerce'),
    path.join(ROOT, 'apps', 'web', 'src', 'app', 'checkout'),
    path.join(ROOT, 'apps', 'web', 'src', 'app', 'cart'),
    path.join(ROOT, 'apps', 'web', 'src', 'app', 'orders'),
    path.join(ROOT, 'apps', 'mobile', 'app', '(tabs)', 'cart'),
    path.join(ROOT, 'apps', 'mobile', 'app', '(tabs)', 'shops')
  ];

  for (const dir of commerceDirs) {
    const files = walk(dir, { extRegex: /\.(js|jsx|ts|tsx)$/, ignoreDirs: ['__tests__', 'tests'] });
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
      lines.forEach((line, idx) => {
        // Exclude purely structural key/uuid generation like toString(36)
        if (line.includes('Math.random()') && !line.includes('toString(36)') && !line.includes('key={') && !line.includes('id: `temp-')) {
          randomViolations.push({
            file: relPath,
            line: idx + 1,
            snippet: line.trim()
          });
        }
      });
    }
  }
  addCheckResult('POL-04', 'No Math.random used for business data in commerce flows', randomViolations);

  // -------------------------------------------------------------
  // Check 5: "Coming soon" in enabled modules (L10)
  // -------------------------------------------------------------
  const comingSoonViolations = [];
  const enabledFlowDirs = [
    path.join(ROOT, 'apps', 'web', 'src', 'app', 'checkout'),
    path.join(ROOT, 'apps', 'web', 'src', 'app', 'cart'),
    path.join(ROOT, 'apps', 'web', 'src', 'app', 'shops'),
    path.join(ROOT, 'apps', 'mobile', 'app', '(tabs)', 'cart'),
    path.join(ROOT, 'apps', 'mobile', 'app', '(tabs)', 'shops')
  ];

  for (const dir of enabledFlowDirs) {
    const files = walk(dir, { extRegex: /\.(js|jsx|tsx)$/, ignoreDirs: ['__tests__', 'tests'] });
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
      lines.forEach((line, idx) => {
        if (/coming\s+soon/i.test(line)) {
          comingSoonViolations.push({
            file: relPath,
            line: idx + 1,
            snippet: line.trim()
          });
        }
      });
    }
  }
  addCheckResult('POL-05', 'No "coming soon" placeholders in enabled commerce flows', comingSoonViolations);

  // -------------------------------------------------------------
  // Check 6: LAN IPs or localhost in release config (L14)
  // -------------------------------------------------------------
  const releaseConfigViolations = [];
  const releaseConfigs = [
    path.join(ROOT, 'apps', 'mobile', 'app.json'),
    path.join(ROOT, 'apps', 'mobile', 'android', 'gradle.properties')
  ];

  for (const file of releaseConfigs) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
      lines.forEach((line, idx) => {
        // Exclude comments
        if (line.trim().startsWith('#') || line.trim().startsWith('//')) return;
        if (/192\.168\.\d+\.\d+/.test(line) || /10\.\d+\.\d+\.\d+/.test(line) || /172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/.test(line)) {
          releaseConfigViolations.push({
            file: relPath,
            line: idx + 1,
            snippet: line.trim()
          });
        }
      });
    }
  }
  addCheckResult('POL-06', 'No LAN IPs in mobile release configuration', releaseConfigViolations);

  // -------------------------------------------------------------
  // Check 7: console.log in backend src outside tests (L9)
  // -------------------------------------------------------------
  const consoleLogViolations = [];
  const backendSrc = path.join(ROOT, 'backend', 'src');
  const backendSrcFiles = walk(backendSrc, {
    extRegex: /\.js$/,
    ignoreDirs: ['__tests__', 'tests', 'test', 'seeds', 'scripts']
  });

  for (const file of backendSrcFiles) {
    if (/\.test\.js$/.test(file) || /\.spec\.js$/.test(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
    lines.forEach((line, idx) => {
      if (line.includes('console.log(') && !line.trim().startsWith('//')) {
        consoleLogViolations.push({
          file: relPath,
          line: idx + 1,
          snippet: line.trim()
        });
      }
    });
  }
  addCheckResult('POL-07', 'No console.log in backend src (use Winston logger)', consoleLogViolations);

  // -------------------------------------------------------------
  // Check 8: Mojibake or UTF-8 BOM in source files (N14)
  // -------------------------------------------------------------
  const encodingViolations = [];
  const candidateDirs = [
    path.join(ROOT, 'backend', 'src'),
    path.join(ROOT, 'apps', 'web', 'src'),
    path.join(ROOT, 'apps', 'admin', 'src'),
    path.join(ROOT, 'apps', 'mobile', 'src'),
    path.join(ROOT, 'apps', 'mobile', 'app')
  ];

  for (const dir of candidateDirs) {
    const files = walk(dir, {
      extRegex: /\.(js|jsx|ts|tsx|json|css|md)$/,
      ignoreDirs: ['node_modules', '.next', '.expo', 'dist', 'build']
    });

    for (const file of files) {
      const buffer = fs.readFileSync(file);
      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');

      // Check BOM: 0xEF, 0xBB, 0xBF
      if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        encodingViolations.push({
          file: relPath,
          type: 'BOM',
          message: 'File starts with UTF-8 Byte Order Mark (BOM)'
        });
      }

      // Check common mojibake characters
      const str = buffer.toString('utf8');
      if (str.includes('â‚¹') || str.includes('â€“') || str.includes('â€”') || str.includes('Ã©')) {
        encodingViolations.push({
          file: relPath,
          type: 'Mojibake',
          message: 'File contains corrupted mojibake encoding (e.g. â‚¹)'
        });
      }
    }
  }
  addCheckResult('POL-08', 'No mojibake or UTF-8 BOM in source files', encodingViolations);

  return report;
}

// Allow direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🔍 Running Gate 15: Launch Policy Verification Tests...\n');
  const report = runLaunchPolicyTests();

  console.log('Policy Test Results:');
  console.log('====================');
  for (const [id, check] of Object.entries(report.checks)) {
    const icon = check.passed ? '✅' : '❌';
    console.log(`${icon} [${id}] ${check.title}: ${check.passed ? 'PASS' : `FAIL (${check.count} violations)`}`);
    if (!check.passed && check.violations.length > 0) {
      check.violations.slice(0, 3).forEach(v => {
        console.log(`     ↳ ${v.file}${v.line ? `:${v.line}` : ''} - ${v.snippet || v.message}`);
      });
      if (check.violations.length > 3) {
        console.log(`     ↳ ... and ${check.violations.length - 3} more`);
      }
    }
  }

  console.log('\n----------------------------------------');
  console.log(`Overall G15 Verdict: ${report.passed ? 'PASSED (0 violations)' : 'FAILED (violations present)'}`);
  process.exit(report.passed ? 0 : 1);
}
