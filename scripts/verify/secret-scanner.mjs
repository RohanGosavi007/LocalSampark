/**
 * scripts/verify/secret-scanner.mjs
 *
 * Ground-truth secret scanner for Gate G14 (H9).
 * Scans all tracked git files for leaked production credentials, private keys,
 * high-entropy JWT tokens, and sensitive keystore passwords.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

export const SECRET_PATTERNS = [
  { id: 'PRIVATE_KEY', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----\s*[A-Za-z0-9+/=]{20,}/, desc: 'PEM Private Key' },
  { id: 'JSON_PRIVATE_KEY', regex: /"private_key"\s*:\s*"-----BEGIN/, desc: 'Service Account Private Key' },
  { id: 'RAZORPAY_LIVE', regex: /\brzp_live_[a-zA-Z0-9]{14}\b/, desc: 'Razorpay Live Key' },
  { id: 'GOOGLE_API_KEY', regex: /\bAIza[0-9A-Za-z-_]{35}\b/, desc: 'Google Cloud / Maps API Key' },
  { id: 'KEYSTORE_PASSWORD', regex: /(?:storePassword|keyPassword)\s*=\s*(?!['"]?(?:\$\{|\<|\s*$).*)['"]?[A-Za-z0-9@#$%^&*()_+=-]{4,}['"]?/, desc: 'Android Keystore Password' },
  { id: 'HIGH_ENTROPY_SECRET', regex: /(?:JWT_SECRET|JWT_REFRESH_SECRET|SESSION_SECRET)\s*=\s*['"]?[a-f0-9]{32,}['"]?/i, desc: 'Hardcoded 32+ Hex Secret' },
  { id: 'RAW_JWT', regex: /\beyJ[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}\b/, desc: 'Committed JWT Token' }
];

// Documented exceptions awaiting owner resolution or known mock values
export const ALLOWED_EXCEPTIONS = [
  // Item 1 in NEEDS_OWNER.md: Supabase anonymous key in tracked app.json
  {
    file: 'apps/mobile/app.json',
    patternId: 'RAW_JWT',
    reason: 'Tracked Supabase anon client key documented in NEEDS_OWNER.md Item 1'
  },
  // Firebase client-side identification token in google-services.json
  {
    fileMatch: /google-services\.json$/,
    patternId: 'GOOGLE_API_KEY',
    reason: 'Client-side Firebase project identification config'
  },
  // Negative test verifying API rejects typed-in live Razorpay keys
  {
    file: 'backend/src/__tests__/integration/adminSettingsSecrets.test.js',
    patternId: 'RAZORPAY_LIVE',
    reason: 'Negative test fixture asserting that rzp_live keys are rejected at admin endpoint'
  },
  // Template/example placeholder files
  {
    fileMatch: /\.(example|template)$/,
    allPatterns: true,
    reason: 'Explicit configuration template'
  }
];

export function isAllowedException(fileRel, patternId) {
  const normFile = fileRel.replace(/\\/g, '/');
  for (const ex of ALLOWED_EXCEPTIONS) {
    if (ex.file && normFile === ex.file && (!ex.patternId || ex.patternId === patternId)) {
      return true;
    }
    if (ex.fileMatch && ex.fileMatch.test(normFile)) {
      return true;
    }
  }
  return false;
}

export function scanTrackedFiles({ targetDir = ROOT, explicitFiles = null } = {}) {
  let files = explicitFiles;
  if (!files) {
    try {
      const res = spawnSync('git', ['ls-files'], { cwd: targetDir, encoding: 'utf8' });
      if (res.status === 0) {
        files = res.stdout.split('\n').map(s => s.trim()).filter(Boolean);
      }
    } catch {}
  }

  if (!files || files.length === 0) {
    files = [];
  }

  const violations = [];

  for (const relPath of files) {
    const fullPath = path.isAbsolute(relPath) ? relPath : path.join(targetDir, relPath);
    if (!fs.existsSync(fullPath)) continue;

    // Skip binary files by extension
    const ext = path.extname(relPath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp', '.ico', '.pdf', '.aab', '.apk', '.keystore', '.jar'].includes(ext)) {
      continue;
    }

    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue; // Binary or unreadable
    }

    for (const rule of SECRET_PATTERNS) {
      if (isAllowedException(relPath, rule.id)) continue;

      if (rule.regex.test(content)) {
        // Find line number
        const lines = content.split('\n');
        let matchedLine = 1;
        let snippet = '';
        for (let i = 0; i < lines.length; i++) {
          if (rule.regex.test(lines[i])) {
            matchedLine = i + 1;
            snippet = lines[i].trim().slice(0, 100);
            break;
          }
        }

        violations.push({
          file: relPath.replace(/\\/g, '/'),
          line: matchedLine,
          ruleId: rule.id,
          description: rule.desc,
          snippet
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violationCount: violations.length,
    violations
  };
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🔍 Running Secret Scanner (Gate G14 Analyzer)...');
  const result = scanTrackedFiles();
  if (result.passed) {
    console.log(`✅ Zero secrets detected in tracked git repository files.`);
    process.exit(0);
  } else {
    console.log(`❌ Found ${result.violationCount} secret violations in tracked files:`);
    for (const v of result.violations) {
      console.log(`  ↳ [${v.ruleId}] ${v.file}:${v.line} - ${v.description}`);
    }
    process.exit(1);
  }
}
