/**
 * The source files the server actually loads.
 *
 * Roughly a fifth of src/ is not required by anything reachable from
 * server.js. Checks that read every file report problems in code that cannot
 * run, and those drown out the ones that matter; checks that should fail the
 * build need to be about the code that ships. This walks static require()
 * calls from the entry point and returns that set.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..');
const ENTRY = path.join(SRC, 'server.js');

function resolveLocal(from, spec) {
  const base = path.resolve(path.dirname(from), spec);
  for (const candidate of [base, `${base}.js`, path.join(base, 'index.js')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

let cached = null;

/** Absolute paths of every .js file reachable from src/server.js. */
function reachableFiles() {
  if (cached) return cached;

  const seen = new Set();
  const stack = [ENTRY];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!file.endsWith('.js')) continue;

    const source = fs.readFileSync(file, 'utf8');
    const requireCall = /require\(\s*(['"`])(\.[^'"`]+)\1\s*\)/g;
    let match;
    while ((match = requireCall.exec(source))) {
      const target = resolveLocal(file, match[2]);
      if (target) stack.push(target);
    }
  }

  cached = [...seen].filter((file) => file.endsWith('.js'));
  return cached;
}

/**
 * Reachable application files: the set above, less the code whose job is to be
 * engine-specific — the two database drivers, which contain dialect SQL and
 * describe in comments the statements they rewrite, and the migration runner,
 * which has one branch per engine and writes to a bookkeeping table that only
 * the PostgreSQL branch creates.
 */
function applicationFiles() {
  return reachableFiles().filter((file) =>
    !/config[\\/]database(\.sqlite)?\.js$/.test(file) && !/[\\/]migrations[\\/]/.test(file));
}

/** A path as it should appear in a failure message. */
function label(file) {
  return path.relative(SRC, file).replace(/\\/g, '/');
}

/**
 * Source text with comments blanked and `${…}` interpolations replaced by a
 * placeholder, line structure preserved so offsets still map to line numbers.
 * What is inside an interpolation is JavaScript, and what is inside a comment
 * is prose; neither should be read as SQL.
 */
function sqlView(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);

    if (two === '${') {
      let depth = 1;
      i += 2;
      while (i < source.length && depth > 0) {
        if (source[i] === '{') depth += 1;
        else if (source[i] === '}') depth -= 1;
        if (source[i] === '\n') out += '\n';
        i += 1;
      }
      out += '__JS__';
      continue;
    }

    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }

    // A line comment, but not the `//` in a URL: only at line start or after
    // whitespace.
    if (two === '//' && (i === 0 || /\s/.test(source[i - 1]))) {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
      continue;
    }

    out += source[i];
    i += 1;
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

module.exports = { reachableFiles, applicationFiles, label, sqlView, lineOf, SRC };
