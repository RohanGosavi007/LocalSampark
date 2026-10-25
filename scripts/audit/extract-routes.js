/**
 * scripts/audit/extract-routes.js
 *
 * Scans backend router definitions, extracting all API endpoints with HTTP method,
 * normalized path, authentication status, and source file locations into docs/audit/routes.json.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_SRC = path.resolve(__dirname, '../../backend/src');
const ROUTES_INDEX = path.join(BACKEND_SRC, 'routes', 'index.js');
const OUT_PATH = path.resolve(__dirname, '../../docs/audit/routes.json');

// 1. Parse mounts from routes/index.js
const indexContent = fs.readFileSync(ROUTES_INDEX, 'utf8');

// Match: router.use('/prefix', ... require('path'))
const mountRegex = /router\.use\(\s*['"]([^'"]+)['"][\s\S]*?require\(['"]([^'"]+)['"]\)/g;
const mounts = [];
let match;

while ((match = mountRegex.exec(indexContent)) !== null) {
  let prefix = match[1];
  let targetRel = match[2];
  let targetAbs = path.resolve(path.dirname(ROUTES_INDEX), targetRel);
  if (!targetAbs.endsWith('.js')) targetAbs += '.js';
  mounts.push({ prefix, target: targetAbs });
}

// Also standalone mounts in server.js
mounts.push({ prefix: '/api/v1', target: ROUTES_INDEX });

const authKeywords = [
  'authenticate', 'verifytoken', 'requirerole', 'adminauth',
  'requireadmin', 'requireauth', 'protect', 'guard', 'jwt'
];

function checkAuth(handlerString) {
  const lower = handlerString.toLowerCase();
  return authKeywords.some(kw => lower.includes(kw));
}

// 2. Discover all route files under backend/src
const routeFiles = new Set();
function findRouteFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '__tests__') {
        findRouteFiles(full);
      }
    } else if (entry.isFile() && entry.name.endsWith('.routes.js')) {
      routeFiles.add(full);
    }
  }
}
findRouteFiles(BACKEND_SRC);

// Map target file to all prefixes under which it is mounted
const fileToPrefixes = new Map();
for (const m of mounts) {
  if (!fileToPrefixes.has(m.target)) {
    fileToPrefixes.set(m.target, new Set());
  }
  fileToPrefixes.get(m.target).add(m.prefix);
}

// Recursively discover sub-router mounts inside route files
let changed = true;
while (changed) {
  changed = false;
  for (const file of routeFiles) {
    if (!fileToPrefixes.has(file)) continue;
    const parentPrefixes = fileToPrefixes.get(file);
    const content = fs.readFileSync(file, 'utf8');

    // Build map of required modules: const varName = require('...')
    const varRequires = new Map();
    const reqRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    let rm;
    while ((rm = reqRegex.exec(content)) !== null) {
      varRequires.set(rm[1], rm[2]);
    }

    // Pattern 1: router.use('/prefix', ... require('path'))
    const subMountRegex = /router\.use\(\s*['"]([^'"]+)['"][\s\S]*?require\(['"]([^'"]+)['"]\)/g;
    let sm;
    while ((sm = subMountRegex.exec(content)) !== null) {
      let subPrefix = sm[1];
      let subTargetRel = sm[2];
      let subTargetAbs = path.resolve(path.dirname(file), subTargetRel);
      if (!subTargetAbs.endsWith('.js')) subTargetAbs += '.js';
      if (!fs.existsSync(subTargetAbs)) continue;

      if (!fileToPrefixes.has(subTargetAbs)) {
        fileToPrefixes.set(subTargetAbs, new Set());
      }
      const targetSet = fileToPrefixes.get(subTargetAbs);
      for (const p of parentPrefixes) {
        const fullSub = `${p}${subPrefix}`.replace(/\/+/g, '/');
        if (!targetSet.has(fullSub)) {
          targetSet.add(fullSub);
          changed = true;
        }
      }
    }

    // Pattern 2: router.use('/prefix', ..., varName)
    const varMountRegex = /router\.use\(\s*['"]([^'"]+)['"](?:\s*,[^,]+)*?,\s*([a-zA-Z0-9_$]+)\s*\)/g;
    let vm;
    while ((vm = varMountRegex.exec(content)) !== null) {
      let subPrefix = vm[1];
      let varName = vm[2];
      if (!varRequires.has(varName)) continue;
      let subTargetRel = varRequires.get(varName);
      let subTargetAbs = path.resolve(path.dirname(file), subTargetRel);
      if (!subTargetAbs.endsWith('.js')) subTargetAbs += '.js';
      if (!fs.existsSync(subTargetAbs)) continue;

      if (!fileToPrefixes.has(subTargetAbs)) {
        fileToPrefixes.set(subTargetAbs, new Set());
      }
      const targetSet = fileToPrefixes.get(subTargetAbs);
      for (const p of parentPrefixes) {
        const fullSub = `${p}${subPrefix}`.replace(/\/+/g, '/');
        if (!targetSet.has(fullSub)) {
          targetSet.add(fullSub);
          changed = true;
        }
      }
    }
  }
}

// 3. Extract endpoints from each route file
const endpoints = [];
const methodRegex = /router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]([\s\S]*?)(?=\n\s*(?:router\.|module\.exports|\/\/\s*──|$))/g;

for (const file of routeFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let prefixes = fileToPrefixes.get(file);
  if (!prefixes || prefixes.size === 0) {
    // Guess prefix from filename if unmounted directly in routes/index.js
    const baseName = path.basename(file).replace('.routes.js', '');
    prefixes = new Set(['/' + baseName]);
  }

  let m;
  const fileLines = content.split('\n');

  while ((m = methodRegex.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    const routeSubPath = m[2];
    const handlerChain = m[3];
    const isAuth = checkAuth(handlerChain);

    // Compute line number
    const upToMatch = content.substring(0, m.index);
    const lineNum = upToMatch.split('\n').length;

    for (const prefix of prefixes) {
      let fullPath = prefix === '/' ? routeSubPath : (prefix + (routeSubPath === '/' ? '' : routeSubPath));
      fullPath = fullPath.replace(/\/\//g, '/');

      endpoints.push({
        method,
        path: '/api/v1' + fullPath,
        authRequired: isAuth,
        file: path.relative(path.resolve(__dirname, '../..'), file).replace(/\\/g, '/'),
        line: lineNum
      });
    }
  }

  // Also extract helper-declared list routes like listRoute('/crm/leads', ...)
  const listRouteRegex = /\blistRoute\(\s*['"]([^'"]+)['"]/g;
  let lm;
  while ((lm = listRouteRegex.exec(content)) !== null) {
    const routeSubPath = lm[1];
    const upToMatch = content.substring(0, lm.index);
    const lineNum = upToMatch.split('\n').length;

    for (const prefix of prefixes) {
      let fullPath = prefix === '/' ? routeSubPath : (prefix + (routeSubPath === '/' ? '' : routeSubPath));
      fullPath = fullPath.replace(/\/\//g, '/');

      endpoints.push({
        method: 'GET',
        path: '/api/v1' + fullPath,
        authRequired: true,
        file: path.relative(path.resolve(__dirname, '../..'), file).replace(/\\/g, '/'),
        line: lineNum
      });
    }
  }
}

// Standalone routes in server.js
endpoints.push({ method: 'GET', path: '/health', authRequired: false, file: 'backend/src/server.js', line: 202 });
endpoints.push({ method: 'GET', path: '/', authRequired: false, file: 'backend/src/server.js', line: 270 });

// Deduplicate
const unique = [];
const seen = new Set();
for (const ep of endpoints) {
  const key = `${ep.method} ${ep.path}`;
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(ep);
  }
}

unique.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

fs.writeFileSync(OUT_PATH, JSON.stringify(unique, null, 2), 'utf8');
console.log(`✅ Extracted ${unique.length} routes to ${OUT_PATH}`);
