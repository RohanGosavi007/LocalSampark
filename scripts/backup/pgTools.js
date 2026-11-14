/**
 * Shared helpers for the backup and restore scripts (P10).
 *
 * The scripts used to run `pg_dump "<url>" ...` through a shell. The URL holds
 * the database password, so it sat in the process list and in any error message
 * (which quotes the command line), and a password with a quote in it broke the
 * command. They now call the tools directly with an argument list, and pass the
 * password in the environment (PGPASSWORD), where it appears in neither.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const EXE = process.platform === 'win32' ? '.exe' : '';

/** Directories a PostgreSQL client is usually installed in, newest version first. */
function commonBinDirs() {
  const dirs = [];
  if (process.platform === 'win32') {
    for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean)) {
      const root = path.join(base, 'PostgreSQL');
      if (!fs.existsSync(root)) continue;
      const versions = fs.readdirSync(root).filter((v) => /^\d+/.test(v)).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
      for (const v of versions) dirs.push(path.join(root, v, 'bin'));
    }
  } else {
    for (const root of ['/usr/lib/postgresql', '/opt/homebrew/opt', '/usr/local/opt']) {
      if (!fs.existsSync(root)) continue;
      for (const v of fs.readdirSync(root).sort().reverse()) dirs.push(path.join(root, v, 'bin'));
    }
    dirs.push('/usr/bin', '/usr/local/bin');
  }
  return dirs;
}

/**
 * The full path of a PostgreSQL client tool ("pg_dump", "pg_restore", "psql"),
 * or null. PG_BIN_DIR wins; then the PATH; then the usual install directories.
 */
function findPgTool(name, env = process.env) {
  const file = `${name}${EXE}`;
  const candidates = [];
  if (env.PG_BIN_DIR) candidates.push(env.PG_BIN_DIR);
  candidates.push(...String(env.PATH || env.Path || '').split(path.delimiter).filter(Boolean));
  candidates.push(...commonBinDirs());
  for (const dir of candidates) {
    const full = path.join(dir, file);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

/** { host, port, user, password, database } from a postgres:// URL. */
function parseDatabaseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
  };
}

/** The same URL with its password hidden, safe to print. */
function redactUrl(url) {
  return String(url).replace(/(\/\/[^:/@]*):[^@]*@/, '$1:***@');
}

/** The connection flags for a tool, and the environment that carries the password. */
function connection(url, baseEnv = process.env) {
  const c = parseDatabaseUrl(url);
  return {
    args: ['-h', c.host, '-p', c.port, '-U', c.user],
    env: { ...baseEnv, ...(c.password ? { PGPASSWORD: c.password } : {}) },
    database: c.database,
  };
}

/** Runs a PostgreSQL tool with an argument list. Errors never contain the password. */
function runPgTool(name, args, { env = process.env, input } = {}) {
  const tool = findPgTool(name, env);
  if (!tool) {
    throw new Error(`${name} was not found. Install the PostgreSQL client tools, or set PG_BIN_DIR to their folder.`);
  }
  try {
    return execFileSync(tool, args, { env, input, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 1024 * 1024 * 1024 });
  } catch (error) {
    const detail = String((error.stderr && error.stderr.toString()) || error.message).trim().split('\n').slice(-3).join(' ');
    throw new Error(`${name} failed: ${detail.replace(/PGPASSWORD=\S+/g, 'PGPASSWORD=***')}`);
  }
}

module.exports = { findPgTool, parseDatabaseUrl, redactUrl, connection, runPgTool };
