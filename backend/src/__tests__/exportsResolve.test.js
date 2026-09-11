/**
 * Every name a module exports must actually be declared in that module.
 *
 * `module.exports = { getJobs, acceptJob, ... }` naming a function that is not
 * defined throws `ReferenceError` at require time. In a codebase this size that
 * is a whole route tree failing to mount, and the only signal is whichever
 * unrelated test happens to require the server first.
 *
 * This caught two real cases while the delivery and shop-management controllers
 * were being moved off Prisma: an edit removed a span of a file that included
 * handlers still named in its exports block, and the file kept parsing cleanly —
 * `node --check` and Babel both pass, because the reference is only resolved
 * when the module runs.
 *
 * The check is static. Actually requiring every module under src/ would be a
 * stronger test, but it hangs: importing the tree starts Redis clients, cron
 * schedulers and socket servers that keep the process alive. A static scan finds
 * this particular class of defect without any of that.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');

const SKIP_DIRS = new Set(['migrations', '__tests__', 'node_modules', 'data']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(src) {
  // `.` does not match a carriage return and, in multiline mode, `$` only
  // matches before a newline — so the usual /^\s*\/\/.*$/gm strips nothing at
  // all from the CRLF half of this repo.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[^\S\n]*\/\/[^\n]*/gm, '');
}

/**
 * The shorthand names in `module.exports = { a, b, c }`. Entries written as
 * `key: value` are skipped — the value may be any expression, and resolving
 * those is not what this is for.
 */
function exportedShorthandNames(src) {
  // The brace must follow `module.exports =` immediately. Searching for the
  // next `{` after the phrase instead picks up the body of
  // `module.exports = function (io) { ... }`, and then reads SQL placeholders
  // and column names out of it as if they were exported bindings.
  const m = /module\.exports\s*=\s*\{/.exec(src);
  if (!m) return [];
  const open = m.index + m[0].length - 1;

  let depth = 0;
  let close = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) { close = i; break; }
    }
  }
  if (close < 0) return [];

  return src
    .slice(open + 1, close)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^[A-Za-z_$][\w$]*$/.test(part));
}

/** Names declared at any level in the file, plus anything imported. */
function declaredNames(src) {
  const names = new Set();
  const add = (m) => names.add(m[1]);

  for (const m of src.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) add(m);
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) add(m);
  for (const m of src.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)) add(m);
  // Destructured requires: const { a, b } = require('...')
  for (const m of src.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(':').pop().split('=')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  return names;
}

describe('module exports resolve', () => {
  const files = walk(SRC);

  it('finds a non-trivial number of modules', () => {
    // A silently-empty file list would make the check below pass vacuously.
    expect(files.length).toBeGreaterThan(100);
  });

  it('flags a name that is exported but never declared', () => {
    // Regression injection: proves the scan is looking.
    const src = 'const a = 1;\nmodule.exports = { a, missingOne };\n';
    const exported = exportedShorthandNames(src);
    const declared = declaredNames(src);
    expect(exported).toContain('missingOne');
    expect(declared.has('missingOne')).toBe(false);
    expect(declared.has('a')).toBe(true);
  });

  it('every exported name is declared in its module', () => {
    const failures = [];

    for (const file of files) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      const declared = declaredNames(src);

      for (const name of exportedShorthandNames(src)) {
        if (!declared.has(name)) {
          const rel = path.relative(SRC, file).split(path.sep).join('/');
          failures.push(`${rel}: exports "${name}" but never declares it`);
        }
      }
    }

    expect(failures.sort()).toEqual([]);
  });
});
