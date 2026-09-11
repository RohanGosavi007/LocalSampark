/**
 * ESLint configuration for the backend.
 *
 * There was none before. `.github/workflows/test.yml` ran
 * `npx eslint backend/src --ext .js --max-warnings 0 || true`, which could
 * only ever fail with "couldn't find a configuration file" — and the trailing
 * `|| true` turned that into a green check. So the backend has never been
 * linted, and `npx eslint` would additionally have tried to download ESLint on
 * every run, since it was not a dependency of the root workspace either.
 *
 * ESLint 8 / eslintrc format, matching apps/mobile so the repo does not carry
 * two major versions of the toolchain.
 *
 * The rule set is deliberately correctness-focused rather than stylistic: the
 * goal is to catch the class of bug this codebase actually had — references to
 * undefined variables, unreachable code, accidental globals — without opening a
 * formatting backlog across ~75 controllers. Style is left to review.
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script', // CommonJS: the backend uses require(), not import.
  },
  extends: ['eslint:recommended'],
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'logs/',
    'prisma/generated/',
    // Generated Prisma client and other build output.
    '**/*.min.js',
  ],
  rules: {
    // ── Real defects ────────────────────────────────────────────────────────
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
    'no-dupe-args': 'error',
    'no-duplicate-case': 'error',
    'no-func-assign': 'error',
    'no-obj-calls': 'error',
    'no-sparse-arrays': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    // Default ('except-parens') rather than 'always': `while ((m = re.exec(s)))`
    // is the standard regex-iteration idiom and appears deliberately in
    // utils/resumeParser.js. The extra parens are the author signalling intent,
    // which is exactly what the default option checks for.
    'no-cond-assign': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],

    // Empty blocks — overwhelmingly `catch (e) {}` — are how this codebase hid
    // its failures: the mobile audit found dozens of endpoints 404ing
    // invisibly because the catch discarded the error.
    //
    // A warning rather than an error *for now*. There are 30 across 14 files,
    // all pre-existing, and each needs a judgement call about whether to log,
    // rethrow or genuinely ignore. Making it an error today would either block
    // every merge or force 30 blind edits. This is the next thing to burn
    // down; promote to 'error' once the count reaches zero.
    'no-empty': ['warn', { allowEmptyCatch: false }],
    // async executor and unhandled promise-returning loops are a live source
    // of silent failures here.
    'no-async-promise-executor': 'error',
    'require-atomic-updates': 'off', // too many false positives on Express handlers

    // ── Downgraded to warnings ──────────────────────────────────────────────
    // Present in volume across existing controllers; worth seeing, not worth
    // blocking a merge on until they are worked through.
    'no-unused-vars': [
      'warn',
      {
        args: 'after-used',
        // Express error middleware must keep its 4-arg shape, and handlers
        // routinely take (req, res, next) while using only some of them.
        argsIgnorePattern: '^_|^next$|^req$|^res$',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      },
    ],
    'no-useless-escape': 'warn',
    'no-prototype-builtins': 'warn',
    'no-control-regex': 'off',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.js', '**/tests/**/*.js', '**/*.test.js', '**/*.spec.js', 'jest.config.js'],
      env: { jest: true, node: true },
    },
    {
      // config/database.js is one module with two complete implementations —
      // the SQLite branch and the PostgreSQL branch — each declaring the same
      // eight functions inside its own `if`/`else` block and exporting them
      // from there. That structure is the point of the file, so the eight
      // "move to program root" reports are noise, not findings.
      files: ['src/config/database.js'],
      rules: { 'no-inner-declarations': 'off' },
    },
    {
      // One-off maintenance and migration scripts kept at the package root.
      // They are run by hand, not served, and lean on console output.
      files: ['*.js', 'scripts/**/*.js', 'src/scripts/**/*.js', 'src/migrations/**/*.js'],
      rules: { 'no-unused-vars': 'off' },
    },
  ],
};
