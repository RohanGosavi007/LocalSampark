import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_SRC = path.resolve(__dirname, '../src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'tests'].includes(entry.name)) {
        walk(full, out);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

test('no web source file reads bare localStorage.getItem("token") without auth_token fallback', () => {
  const files = walk(WEB_SRC);
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match bare getItem('token') without auth_token on the same line or in the same expression
      if (line.includes("getItem('token')") || line.includes('getItem("token")')) {
        if (!line.includes('auth_token') && !lines[Math.max(0, i - 1)].includes('auth_token')) {
          violations.push({
            file: path.relative(WEB_SRC, file),
            line: i + 1,
            snippet: line.trim()
          });
        }
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Found ${violations.length} bare token reads in apps/web/src:\n` +
      violations.map(v => `  ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
  );
});
