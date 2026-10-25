/**
 * scripts/verify/render-report.mjs
 *
 * Automated Report Renderer for LocalSampark Launch Program (H15).
 * Renders docs/launch/STATUS.md directly from summary.json.
 * Prose and metric numbers are derived entirely from machine-verified evidence.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

export function renderStatusMarkdown(summaryData) {
  const isPartial = summaryData.partial || false;
  const lines = [
    `# LocalSampark — System Verification Status (STATUS.md)`,
    ``,
    `> **Automated Report:** Generated dynamically by \`scripts/verify/verify-all.mjs\`. Do not edit by hand.`,
    ``,
    `- **Last Execution Timestamp:** \`${summaryData.timestamp}\``,
    `- **Evidence Path:** [\`${summaryData.evidenceDirectory}\`](file:///${ROOT.replace(/\\/g, '/')}/${summaryData.evidenceDirectory})`,
    `- **Execution Type:** **${isPartial ? 'PARTIAL RUN (--only filter)' : 'FULL VERIFICATION RUN'}**`,
    `- **Overall Gate Pass Rate:** **${summaryData.gatesPassed} / ${summaryData.totalGates} (${summaryData.gatePassPercentage})**`,
    `- **Verified Feature Completion Rate:** **${summaryData.featureCompletion}**`,
    ``,
    `---`,
    ``,
    `## 1. Machine-Verified Gate Summary`,
    ``,
    `| Gate | Name | Category | Status | Details | Evidence Log |`,
    `| :--- | :--- | :--- | :---: | :--- | :--- |`
  ];

  for (const r of summaryData.results || []) {
    const statusBadge = r.skipped ? '⏭️ SKIPPED' : r.passed ? '✅ PASS' : '❌ FAIL';
    const logLink = r.log ? `[\`${path.basename(r.log)}\`](file:///${ROOT.replace(/\\/g, '/')}/${r.log})` : '—';
    lines.push(`| **${r.id}** | ${r.name} | ${r.category} | ${statusBadge} | ${r.summary} | ${logLink} |`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 2. Launch Program v3 Baseline Assessment`,
    ``,
    `Following Launch Program v3 verification protocols:`,
    `- Feature statuses are dynamically computed by Gate G18 from real test reports.`,
    `- Passing rate: **${summaryData.gatesPassed} / ${summaryData.totalGates} gates passing** (${summaryData.gatePassPercentage}).`,
    `- Features: **${summaryData.featureCompletion} launch features verified**.`
  );

  return lines.join('\n');
}

// CLI usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let summaryPath = null;

  for (const arg of args) {
    if (arg.startsWith('--summary=')) {
      summaryPath = arg.slice(10);
    }
  }

  if (!summaryPath) {
    const evBase = path.join(ROOT, 'docs', 'audit', 'evidence');
    if (fs.existsSync(evBase)) {
      const dirs = fs.readdirSync(evBase).filter(d => d.startsWith('verify-')).sort().reverse();
      if (dirs.length > 0) {
        summaryPath = path.join(evBase, dirs[0], 'summary.json');
      }
    }
  }

  if (!summaryPath || !fs.existsSync(summaryPath)) {
    console.error('summary.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const md = renderStatusMarkdown(data);
  const statusFilePath = path.join(ROOT, 'docs', 'launch', 'STATUS.md');
  fs.writeFileSync(statusFilePath, md, 'utf8');
  console.log(`✅ Rendered STATUS.md from ${summaryPath}`);
}
