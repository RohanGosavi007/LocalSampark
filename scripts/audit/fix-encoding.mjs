/**
 * scripts/audit/fix-encoding.mjs
 *
 * Strips UTF-8 Byte Order Marks (BOM) and corrects mojibake characters across source files.
 * N14 and POL-08 fix.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const MOJIBAKE_REPLACEMENTS = [
  [/â‚¹/g, '₹'],
  [/â€“/g, '–'],
  [/â€”/g, '—'],
  [/â€˜/g, '‘'],
  [/â€™/g, '’'],
  [/â€œ/g, '“'],
  [/â€/g, '”'],
  [/â€¦/g, '…'],
  [/Ã©/g, 'é']
];

const TARGET_DIRS = [
  path.join(ROOT, 'backend', 'src'),
  path.join(ROOT, 'apps', 'web', 'src'),
  path.join(ROOT, 'apps', 'admin', 'src'),
  path.join(ROOT, 'apps', 'mobile', 'src'),
  path.join(ROOT, 'apps', 'mobile', 'app'),
  path.join(ROOT, 'packages')
];

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.expo', 'dist', 'build', '.git'].includes(entry.name)) {
        results.push(...walk(path.join(dir, entry.name)));
      }
    } else if (/\.(js|jsx|ts|tsx|json|css|md)$/.test(entry.name)) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

let bomFixed = 0;
let mojibakeFixed = 0;

for (const dir of TARGET_DIRS) {
  const files = walk(dir);
  for (const file of files) {
    let buf = fs.readFileSync(file);
    let changed = false;

    // 1. Strip BOM
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
      buf = buf.subarray(3);
      changed = true;
      bomFixed++;
    }

    // 2. Fix mojibake
    let content = buf.toString('utf8');
    let strChanged = false;
    for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        strChanged = true;
      }
    }

    if (strChanged) {
      mojibakeFixed++;
      changed = true;
      buf = Buffer.from(content, 'utf8');
    }

    if (changed) {
      fs.writeFileSync(file, buf);
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      console.log(`Fixed encoding in: ${rel}`);
    }
  }
}

console.log(`\n✅ Summary: Stripped BOM from ${bomFixed} files. Fixed mojibake in ${mojibakeFixed} files.`);
