/**
 * The deployment files are loadable and consistent with the repository.
 *
 * Found by reading, not by deploying: render.yaml was not valid YAML (two keys indented one
 * level too deep), so a Blueprint deploy could not even start; it declared a worker that ran a
 * file which no longer exists; both Dockerfiles built from a context that has no lockfile, and
 * the web one started a server path Next does not write in a workspace; nginx proxied to an
 * upstream the production compose file does not define; and the compose files used stock
 * PostgreSQL for a schema that needs PostGIS.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
// Explanatory comments quote the very strings the checks forbid.
const code = (rel) => read(rel).replace(/^\s*#.*$/gm, '').replace(/\s#\s.*$/gm, '');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const COMPOSE = ['docker-compose.yml', 'docker-compose.production.yml', 'docker-compose.staging.yml', 'docker-compose.test.yml'];

describe('render.yaml', () => {
  const blueprint = yaml.load(read('render.yaml'));

  test('parses and declares the services the platform needs', () => {
    const names = blueprint.services.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['localsampark-api', 'localsampark-web', 'localsampark-redis']));
    expect(blueprint.databases.map((d) => d.name)).toContain('localsampark-db');
  });

  test('every start command points at something that exists', () => {
    for (const svc of blueprint.services.filter((s) => s.startCommand)) {
      for (const m of svc.startCommand.matchAll(/node\s+(\S+\.js)/g)) {
        expect(exists(m[1])).toBe(true);
      }
      for (const m of svc.startCommand.matchAll(/--workspace=(\S+)/g)) {
        expect(exists(`${m[1]}/package.json`)).toBe(true);
      }
    }
  });

  test('every fromService/fromDatabase reference names a declared resource', () => {
    const declared = new Set([...blueprint.services.map((s) => s.name), ...blueprint.databases.map((d) => d.name)]);
    for (const svc of blueprint.services) {
      for (const env of svc.envVars || []) {
        const ref = env.fromService || env.fromDatabase;
        if (ref) expect(declared.has(ref.name)).toBe(true);
      }
    }
  });

  test('the API receives the variables it refuses to boot without', () => {
    const api = blueprint.services.find((s) => s.name === 'localsampark-api');
    const keys = api.envVars.map((e) => e.key);
    expect(keys).toEqual(expect.arrayContaining(['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'CLIENT_URL', 'RAZORPAY_WEBHOOK_SECRET']));
  });
});

describe('docker', () => {
  test.each(COMPOSE)('%s parses', (file) => {
    expect(() => yaml.load(read(file))).not.toThrow();
  });

  test('every compose build points at a Dockerfile that exists, from the repository root', () => {
    for (const file of COMPOSE) {
      const doc = yaml.load(read(file));
      for (const svc of Object.values(doc.services || {})) {
        if (!svc.build) continue;
        expect(svc.build.context).toBe('.');
        expect(exists(svc.build.dockerfile)).toBe(true);
      }
    }
  });

  test('Postgres images carry PostGIS', () => {
    for (const file of COMPOSE) {
      for (const svc of Object.values(yaml.load(read(file)).services || {})) {
        if (/postgres/.test(svc.image || '') && !/pgbouncer/.test(svc.image)) expect(svc.image).toMatch(/postgis/);
      }
    }
  });

  test('production compose refuses a default database password', () => {
    expect(read('docker-compose.production.yml')).not.toMatch(/YOUR_SECURE_PASSWORD/);
    expect(read('docker-compose.production.yml')).toMatch(/DB_PASSWORD:\?/);
  });

  test.each(['backend/Dockerfile', 'apps/web/Dockerfile'])('%s only copies files that exist', (file) => {
    const src = read(file);
    for (const m of src.matchAll(/^COPY\s+(?:--\S+\s+)*(\S+)\s+\S+\s*$/gm)) {
      const from = m[1];
      if (from.startsWith('/') || from === '.') continue; // from a previous stage
      expect(exists(from)).toBe(true);
    }
    expect(code(file)).not.toMatch(/COPY \. \./);
  });

  test('the web image starts the server where a workspace build puts it', () => {
    expect(read('apps/web/Dockerfile')).toMatch(/node.*apps\/web\/server\.js/);
  });

  test('.dockerignore keeps real env files, databases and keys out of images', () => {
    const ignore = read('.dockerignore');
    for (const pattern of ['**/.env', '**/*.db', '**/node_modules', '**/*.jks']) expect(ignore).toContain(pattern);
  });
});

describe('nginx', () => {
  test('production nginx upstreams are services (or aliases) in the production compose file', () => {
    const conf = read('nginx.conf');
    const compose = yaml.load(read('docker-compose.production.yml'));
    const hosts = new Set(Object.keys(compose.services));
    for (const svc of Object.values(compose.services)) {
      const aliases = svc.networks && svc.networks.default && svc.networks.default.aliases;
      (aliases || []).forEach((a) => hosts.add(a));
    }
    for (const m of conf.matchAll(/server\s+([a-z0-9_-]+):\d+;/g)) expect(hosts.has(m[1])).toBe(true);
  });

  test('routes the API, sockets and health to the API and everything else to the web app', () => {
    const dev = read('nginx.dev.conf');
    expect(dev).toMatch(/\^\/\(api\|socket\\\.io\|health\)/);
    expect(read('nginx.conf')).toMatch(/Connection \$connection_upgrade/);
  });

  test('the API is not given a wildcard CORS answer', () => {
    expect(code('nginx.conf')).not.toMatch(/Access-Control-Allow-Origin/);
  });

  test('uploads are not stopped at nginx before the API limit', () => {
    expect(read('nginx.conf')).toMatch(/client_max_body_size\s+1[0-9]m/);
  });
});

describe('secrets', () => {
  test('no real env file is tracked by git', () => {
    let tracked = '';
    try {
      tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    } catch (e) {
      return; // not a git checkout (e.g. a source tarball)
    }
    const offenders = tracked.split('\n').filter((f) => /(^|\/)\.env(\.[a-z]+)?$/.test(f) && !/\.(example|template)$/.test(f));
    expect(offenders).toEqual([]);
  });
});
