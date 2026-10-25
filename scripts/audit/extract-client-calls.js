/**
 * scripts/audit/extract-client-calls.js
 *
 * Scans apps/web, apps/admin, and apps/mobile for all network/API call sites,
 * cross-references against docs/audit/routes.json, and generates:
 * 1. docs/audit/client-calls.json
 * 2. docs/audit/contracts-diff.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ROUTES_FILE = path.join(ROOT, 'docs', 'audit', 'routes.json');
const CLIENT_CALLS_OUT = path.join(ROOT, 'docs', 'audit', 'client-calls.json');
const DIFF_OUT = path.join(ROOT, 'docs', 'audit', 'contracts-diff.md');

const backendRoutes = JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf8'));

// Build lookup map for backend routes
// Normalize :param and query params for matching
function normalizePath(p) {
  if (!p || typeof p !== 'string') return '/';
  let out = p
    .replace(/\${SM}/g, '/society-management')
    .replace(/^[/]?\${(?:API_BASE|API_URL|API_V1|BACKEND_URL|apiUrl|origin|baseUrl|notifBase|process\.env\.[A-Za-z0-9_]+)}/, '')
    .replace(/\${[^}]*(?:query|Query|qs|param|Param|search)[^}]*}.*$/, '') // Strip trailing query template vars
    .replace(/\?.*$/, '')       // Strip query string
    .replace(/^\/api\/v1/, '')
    .replace(/^\/api/, '');
  if (!out.startsWith('/')) out = '/' + out;
  return out
    .replace(/:[a-zA-Z0-9_]+/g, '{param}')
    .replace(/\/\${[^}]+}/g, '/{param}')
    .replace(/\${[^}]+}/g, '{param}')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';
}

const backendLookup = new Map();
for (const r of backendRoutes) {
  const norm = normalizePath(r.path);
  const key = `${r.method} ${norm}`;
  backendLookup.set(key, r);
  // Also store by path only to detect method mismatches
  if (!backendLookup.has(`ANY ${norm}`)) {
    backendLookup.set(`ANY ${norm}`, []);
  }
  backendLookup.get(`ANY ${norm}`).push(r);
}

const clientApps = [
  { name: 'web', dir: path.join(ROOT, 'apps', 'web', 'src') },
  { name: 'admin', dir: path.join(ROOT, 'apps', 'admin', 'src') },
  { name: 'mobile', dir: path.join(ROOT, 'apps', 'mobile') }
];

const clientCalls = [];

function scanDir(app, dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.expo', 'dist', 'build', 'android', 'ios', '__tests__', 'tests'].includes(entry.name)) {
        scanDir(app, full);
      }
    } else if (entry.isFile() && /\.(js|jsx|ts|tsx|mjs)$/.test(entry.name)) {
      scanFile(app, full);
    }
  }
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, match => ' '.repeat(match.length));
}

function scanFile(app, file) {
  const rawContent = fs.readFileSync(file, 'utf8');
  const content = stripComments(rawContent);

  // Regex patterns for client API calls
  // 1. apiGet('...', ...) / apiPost('...', ...) / apiPut / apiDelete / apiPatch
  const apiMethodRegex = /\b(apiGet|apiPost|apiPut|apiDelete|apiPatch)\(\s*[`'"]([^`'"]+)[`'"]/g;
  let m;
  while ((m = apiMethodRegex.exec(content)) !== null) {
    const fn = m[1];
    let method = 'GET';
    if (fn.includes('Post')) method = 'POST';
    else if (fn.includes('Put')) method = 'PUT';
    else if (fn.includes('Delete')) method = 'DELETE';
    else if (fn.includes('Patch')) method = 'PATCH';

    const rawEndpoint = m[2];
    const line = content.substring(0, m.index).split('\n').length;
    clientCalls.push({
      app,
      file: path.relative(ROOT, file).replace(/\\/g, '/'),
      line,
      method,
      endpoint: rawEndpoint,
      callSyntax: m[0]
    });
  }

  // 2. fetchJson('...', ...)
  const fetchJsonRegex = /\bfetchJson\(\s*[`'"]([^`'"]+)[`'"](?:\s*,\s*\{[^}]*method:\s*['"](GET|POST|PUT|DELETE|PATCH)['"])?/gi;
  while ((m = fetchJsonRegex.exec(content)) !== null) {
    const rawEndpoint = m[1];
    const method = m[2] ? m[2].toUpperCase() : 'GET';
    const line = content.substring(0, m.index).split('\n').length;
    clientCalls.push({
      app,
      file: path.relative(ROOT, file).replace(/\\/g, '/'),
      line,
      method,
      endpoint: rawEndpoint,
      callSyntax: m[0]
    });
  }

  // 3. fetch(API_BASE + '...' or fetch(`${API_BASE}/...`) or fetch('/api/...'))
  const rawFetchRegex = /\bfetch\(\s*(?:(?:API_URL|API_V1|API_BASE|BACKEND_URL|apiUrl|origin)\s*\+\s*[`'"]([^`'"]+)[`'"]|`\${(?:API_URL|API_V1|API_BASE|BACKEND_URL|apiUrl|origin|process\.env\.[A-Z0-9_]+)}([^`]+)`|[`'"]([^`'"]+)[`'"])/g;
  while ((m = rawFetchRegex.exec(content)) !== null) {
    let endpoint = m[1] || m[2] || m[3];
    if (!endpoint) continue;
    endpoint = endpoint.trim();
    if (endpoint.startsWith('http') || endpoint.includes('data:') || endpoint.includes('.json') || endpoint.includes('.svg') || endpoint.includes('.png')) continue;
    if (!endpoint.startsWith('/') && !endpoint.startsWith('${')) continue;

    // Look ahead inside options block for method
    const postChunk = content.substring(m.index, m.index + 200);
    const methodMatch = /method:\s*['"](GET|POST|PUT|DELETE|PATCH)['"]/i.exec(postChunk);
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
    const line = content.substring(0, m.index).split('\n').length;

    clientCalls.push({
      app,
      file: path.relative(ROOT, file).replace(/\\/g, '/'),
      line,
      method,
      endpoint,
      callSyntax: m[0].substring(0, 60)
    });
  }
}

for (const { name, dir } of clientApps) {
  scanDir(name, dir);
}

// Build compiled regex patterns for backend routes
const backendRoutePatterns = backendRoutes.map(r => {
  let cleanPath = r.path.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
  // Replace :param with regex pattern
  const patternStr = '^' + cleanPath.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
  return {
    route: r,
    method: r.method,
    regex: new RegExp(patternStr)
  };
});

// Compute diff against backend routes
const missingRoutes = [];
const methodMismatches = [];
const verifiedCalls = [];

for (const call of clientCalls) {
  const norm = normalizePath(call.endpoint);
  const exactKey = `${call.method} ${norm}`;
  const anyKey = `ANY ${norm}`;

  if (backendLookup.has(exactKey)) {
    verifiedCalls.push({ ...call, matchedRoute: backendLookup.get(exactKey) });
  } else if (backendLookup.has(anyKey)) {
    const existing = backendLookup.get(anyKey);
    methodMismatches.push({
      ...call,
      normalizedPath: norm,
      clientMethod: call.method,
      availableMethods: existing.map(e => e.method)
    });
  } else {
    // Try matching against parameterized regex patterns
    const testPath = norm.replace(/{param}/g, 'testparam');
    const matchingMethodRoute = backendRoutePatterns.find(p => p.method === call.method && p.regex.test(testPath));
    if (matchingMethodRoute) {
      verifiedCalls.push({ ...call, matchedRoute: matchingMethodRoute.route });
    } else {
      const anyMethodRoute = backendRoutePatterns.filter(p => p.regex.test(testPath));
      if (anyMethodRoute.length > 0) {
        methodMismatches.push({
          ...call,
          normalizedPath: norm,
          clientMethod: call.method,
          availableMethods: anyMethodRoute.map(e => e.method)
        });
      } else {
        // Exclude unresolved variables or static non-API paths
        if (!norm.includes('.') && norm !== '/' && norm !== '/{param}' && norm.length > 2) {
          missingRoutes.push({ ...call, normalizedPath: norm });
        }
      }
    }
  }
}

// Write client-calls.json
fs.writeFileSync(CLIENT_CALLS_OUT, JSON.stringify(clientCalls, null, 2), 'utf8');

// Write contracts-diff.md
let diffMd = `# LocalSampark API Contract Diff & Parity Analysis (Phase 2)\n\n`;
diffMd += `Generated automatically on ${new Date().toISOString()} by \`scripts/audit/extract-client-calls.js\`.\n\n`;
diffMd += `## 1. Summary Statistics\n\n`;
diffMd += `- **Total Backend Declared Endpoints:** ${backendRoutes.length}\n`;
diffMd += `- **Total Client API Call Sites:** ${clientCalls.length}\n`;
diffMd += `- **Verified Route Matches:** ${verifiedCalls.length}\n`;
diffMd += `- **Method Mismatches:** ${methodMismatches.length}\n`;
diffMd += `- **Unmatched / Potential 404 Routes:** ${missingRoutes.length}\n\n`;

diffMd += `## 2. Method Mismatches (Client Calls Method Backend Does Not Support)\n\n`;
if (methodMismatches.length === 0) {
  diffMd += `_None detected._\n\n`;
} else {
  diffMd += `| App | Location | Client Call | Expected Method | Available Methods |\n`;
  diffMd += `| :--- | :--- | :--- | :--- | :--- |\n`;
  for (const m of methodMismatches) {
    diffMd += `| \`${m.app}\` | [\`${m.file}:${m.line}\`](file:///${path.join(ROOT, m.file).replace(/\\/g, '/')}) | \`${m.endpoint}\` | \`${m.clientMethod}\` | \`${m.availableMethods.join(', ')}\` |\n`;
  }
  diffMd += `\n`;
}

diffMd += `## 3. Unmatched Client Calls (Potential 404s)\n\n`;
if (missingRoutes.length === 0) {
  diffMd += `_None detected._\n\n`;
} else {
  diffMd += `| App | Location | Method | Endpoint | Normalized Path |\n`;
  diffMd += `| :--- | :--- | :--- | :--- | :--- |\n`;
  for (const m of missingRoutes.slice(0, 100)) {
    diffMd += `| \`${m.app}\` | [\`${m.file}:${m.line}\`](file:///${path.join(ROOT, m.file).replace(/\\/g, '/')}) | \`${m.method}\` | \`${m.endpoint}\` | \`${m.normalizedPath}\` |\n`;
  }
  if (missingRoutes.length > 100) {
    diffMd += `\n_...and ${missingRoutes.length - 100} more unmatched calls recorded in \`docs/audit/client-calls.json\`._\n\n`;
  }
}

diffMd += `## 4. Unauthenticated Write Endpoints in Backend\n\n`;
const unauthWrites = backendRoutes.filter(r => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(r.method) && !r.authRequired && !r.path.includes('/auth') && !r.path.includes('/public') && !r.path.includes('/webhooks'));
diffMd += `Found ${unauthWrites.length} write endpoints without explicit authentication middleware:\n\n`;
diffMd += `| Method | Path | File | Line |\n`;
diffMd += `| :--- | :--- | :--- | :--- |\n`;
for (const w of unauthWrites) {
  diffMd += `| \`${w.method}\` | \`${w.path}\` | [\`${w.file}:${w.line}\`](file:///${path.join(ROOT, w.file).replace(/\\/g, '/')}) | ${w.line} |\n`;
}

fs.writeFileSync(DIFF_OUT, diffMd, 'utf8');

console.log(`✅ Analyzed ${clientCalls.length} client calls against ${backendRoutes.length} backend routes.`);
console.log(`   - Verified matches: ${verifiedCalls.length}`);
console.log(`   - Method mismatches: ${methodMismatches.length}`);
console.log(`   - Unmatched calls: ${missingRoutes.length}`);
console.log(`   - Unauthenticated writes: ${unauthWrites.length}`);
console.log(`📁 Reports saved to ${CLIENT_CALLS_OUT} and ${DIFF_OUT}`);
