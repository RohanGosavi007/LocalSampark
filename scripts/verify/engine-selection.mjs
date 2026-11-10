// Backend test files by database engine (H14).
//
// A suite may be SQLite-only only by an `@engine sqlite-only` docblock tag,
// which backend/jest.config.js leaves out of the PostgreSQL run. A suite that
// pins USE_SQLITE without the tag would run on SQLite inside the PostgreSQL
// gate and be counted as a PostgreSQL pass (F-127), so G3 fails on any.
import fs from 'node:fs';
import path from 'node:path';

const TAGGED = /^\s*\*\s*@engine sqlite-only/m;
const PINNED = /^\s*process\.env\.USE_SQLITE\s*=\s*['"]true['"]/m;
const SQLITE_HELPER = /require\(['"][./]*setup\/testDb['"]\)/;

/** { sqliteOnly: string[], untaggedPins: string[] } — paths relative to `root`. */
export function backendEngineSelection(root, dirs = ['backend/src', 'backend/tests']) {
  const sqliteOnly = [];
  const untaggedPins = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
      if (!/\.test\.js$/.test(e.name)) continue;
      const src = fs.readFileSync(p, 'utf8');
      const rel = path.relative(root, p).split(path.sep).join('/');
      if (TAGGED.test(src)) sqliteOnly.push(rel);
      else if (PINNED.test(src) || SQLITE_HELPER.test(src)) untaggedPins.push(rel);
    }
  };
  for (const d of dirs) walk(path.join(root, d));
  return { sqliteOnly, untaggedPins };
}
