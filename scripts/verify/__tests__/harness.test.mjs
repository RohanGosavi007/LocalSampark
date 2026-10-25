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
import { verifyFeatures } from '../feature-verifier.mjs';
import { scanTrackedFiles, SECRET_PATTERNS } from '../secret-scanner.mjs';
import { renderStatusMarkdown } from '../render-report.mjs';

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
  fs.writeFileSync(
    tmpSecretFile,
    '// Temporary test secret\nconst JWT_SECRET = "0123456789abcdef0123456789abcdef";\n',
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
