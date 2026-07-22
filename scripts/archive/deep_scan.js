const fs = require('fs');
const path = require('path');

function walk(dir, exts) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fp = path.join(dir, file);
      try {
        const stat = fs.statSync(fp);
        if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
          results = results.concat(walk(fp, exts));
        } else if (exts.some(e => file.endsWith(e))) {
          results.push(fp);
        }
      } catch(e) {}
    });
  } catch(e) {}
  return results;
}

const ROOT = '.';
const webSrc = path.join(ROOT, 'apps', 'web', 'src');
const adminSrc = path.join(ROOT, 'apps', 'admin', 'src');
const backendSrc = path.join(ROOT, 'backend', 'src');
const mobileSrc = path.join(ROOT, 'Mobile Build Android', 'mobile_build 08-07-2026', 'app');

console.log('=== COMPREHENSIVE ERROR SCAN ===\n');

// 1. Check for undefined variable references (API_URL without import)
console.log('--- 1. FILES USING API_URL WITHOUT PROPER IMPORT ---');
const webFiles = walk(webSrc, ['.js', '.jsx']);
let apiUrlErrors = 0;
webFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('API_URL') && !content.includes("import") && !content.includes("require") && !f.includes('api.js')) {
    // Check if it uses API_URL but doesn't import it
    if (content.includes('${API_URL}') && !content.includes("from '@/lib/api'") && !content.includes("from '../lib/api'") && !content.includes("from '../../lib/api'")) {
      console.log('  MISSING IMPORT: ' + f.replace(/\\/g, '/'));
      apiUrlErrors++;
    }
  }
});
if (apiUrlErrors === 0) console.log('  None found');

// 2. Check for broken imports in web
console.log('\n--- 2. POTENTIAL BROKEN IMPORTS (from @/ paths) ---');
let brokenImports = 0;
webFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const imports = content.match(/from\s+['"]@\/([^'"]+)['"]/g) || [];
  imports.forEach(imp => {
    const importPath = imp.match(/@\/([^'"]+)/)?.[1];
    if (importPath) {
      const resolved = path.join(webSrc, importPath);
      const exists = fs.existsSync(resolved) || fs.existsSync(resolved + '.js') || fs.existsSync(resolved + '.jsx') || fs.existsSync(resolved + '/index.js');
      if (!exists) {
        console.log('  BROKEN: ' + path.basename(f) + ' -> @/' + importPath);
        brokenImports++;
      }
    }
  });
});
if (brokenImports === 0) console.log('  None found');

// 3. Check backend routes vs controllers mapping
console.log('\n--- 3. BACKEND ROUTE FILES WITHOUT CONTROLLER ---');
const routeFiles = walk(path.join(backendSrc, 'routes'), ['.js']);
const controllerFiles = walk(path.join(backendSrc, 'controllers'), ['.js']).map(f => path.basename(f));
routeFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const reqControllers = content.match(/require\(['"]\.\.\/controllers\/([^'"]+)['"]\)/g) || [];
  reqControllers.forEach(req => {
    const ctrlFile = req.match(/controllers\/([^'"]+)/)?.[1];
    if (ctrlFile && !fs.existsSync(path.join(backendSrc, 'controllers', ctrlFile))) {
      console.log('  MISSING CONTROLLER: ' + ctrlFile + ' (required by ' + path.basename(f) + ')');
    }
  });
});

// 4. Check for console.log in production code (count)
console.log('\n--- 4. CONSOLE.LOG COUNT ---');
let webLogs = 0, backendLogs = 0;
webFiles.forEach(f => { webLogs += (fs.readFileSync(f,'utf8').match(/console\.log/g) || []).length; });
const bFiles = walk(backendSrc, ['.js']);
bFiles.forEach(f => { backendLogs += (fs.readFileSync(f,'utf8').match(/console\.log/g) || []).length; });
console.log('  Web app: ' + webLogs + ' console.log statements');
console.log('  Backend: ' + backendLogs + ' console.log statements');

// 5. Check .env files
console.log('\n--- 5. ENVIRONMENT CONFIG ---');
try {
  const env = fs.readFileSync('backend/.env', 'utf8');
  const envLines = env.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  console.log('  Backend .env variables: ' + envLines.length);
  const hasJwt = env.includes('JWT_SECRET');
  const hasDb = env.includes('DATABASE_URL') || env.includes('DB_');
  const hasRedis = env.includes('REDIS');
  const hasFirebase = env.includes('FIREBASE');
  const hasRazorpay = env.includes('RAZORPAY');
  const hasSms = env.includes('SMS') || env.includes('TWILIO') || env.includes('MSG91');
  console.log('  JWT_SECRET: ' + (hasJwt ? 'YES' : 'MISSING'));
  console.log('  DATABASE: ' + (hasDb ? 'YES' : 'MISSING'));
  console.log('  REDIS: ' + (hasRedis ? 'YES' : 'MISSING'));
  console.log('  FIREBASE: ' + (hasFirebase ? 'YES' : 'MISSING'));
  console.log('  RAZORPAY/PAYMENT: ' + (hasRazorpay ? 'YES' : 'MISSING'));
  console.log('  SMS_SERVICE: ' + (hasSms ? 'YES' : 'MISSING'));
} catch(e) { console.log('  Could not read .env'); }

// 6. Web pages without proper error boundaries
console.log('\n--- 6. WEB APP PAGES ---');
const pageFiles = webFiles.filter(f => f.endsWith('page.js'));
console.log('  Total page.js files: ' + pageFiles.length);

// 7. Check for hardcoded localhost URLs
console.log('\n--- 7. HARDCODED LOCALHOST URLs ---');
let hardcoded = 0;
webFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/http:\/\/localhost:\d+/g) || [];
  if (matches.length > 0 && !f.includes('api.js') && !f.includes('config')) {
    console.log('  ' + path.basename(f) + ': ' + matches.join(', '));
    hardcoded++;
  }
});
if (hardcoded === 0) console.log('  None found');

// 8. Check mobile app config
console.log('\n--- 8. MOBILE APP ---');
try {
  const mobileFiles = walk(mobileSrc, ['.js', '.jsx']);
  console.log('  Total JS files: ' + mobileFiles.length);
  let mobileApiErrors = 0;
  mobileFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('localhost')) {
      console.log('  LOCALHOST in: ' + path.basename(f));
      mobileApiErrors++;
    }
  });
  // Check for API_URL config
  const configFiles = mobileFiles.filter(f => f.includes('config'));
  console.log('  Config files: ' + configFiles.map(f => path.basename(f)).join(', '));
} catch(e) { console.log('  Error scanning mobile: ' + e.message); }

// 9. Check for missing middleware
console.log('\n--- 9. BACKEND MIDDLEWARE ---');
const middlewareFiles = walk(path.join(backendSrc, 'middleware'), ['.js']);
middlewareFiles.forEach(f => console.log('  ' + path.basename(f)));

// 10. Check for missing services
console.log('\n--- 10. BACKEND SERVICES ---');
const serviceFiles = walk(path.join(backendSrc, 'services'), ['.js']);
serviceFiles.forEach(f => console.log('  ' + path.basename(f)));

// 11. Backend config
console.log('\n--- 11. BACKEND CONFIG ---');
const configFiles = walk(path.join(backendSrc, 'config'), ['.js']);
configFiles.forEach(f => console.log('  ' + path.basename(f)));

// 12. Check web app components structure
console.log('\n--- 12. WEB SHARED COMPONENTS ---');
try {
  const compDir = path.join(webSrc, 'app', 'components');
  const compFiles = walk(compDir, ['.js', '.jsx']);
  compFiles.forEach(f => console.log('  ' + path.basename(f)));
} catch(e) { console.log('  Error: ' + e.message); }

// 13. Check for duplicate route definitions  
console.log('\n--- 13. ROUTE REGISTRATION CHECK ---');
const serverContent = fs.readFileSync(path.join(backendSrc, 'server.js'), 'utf8');
const routeMounts = serverContent.match(/app\.use\(`\$\{API_PREFIX\}\/([^`]+)`/g) || [];
const mountedPaths = routeMounts.map(r => r.match(/\/([^`]+)/)?.[1]);
console.log('  Total mounted routes: ' + mountedPaths.length);
// Check for routes files not mounted
const allRouteFiles = fs.readdirSync(path.join(backendSrc, 'routes'));
const unmounted = allRouteFiles.filter(f => {
  const routeName = f.replace('.routes.js', '').replace('.js', '');
  return !serverContent.includes(f);
});
if (unmounted.length > 0) {
  console.log('  Potentially unmounted route files:');
  unmounted.forEach(f => console.log('    - ' + f));
}

// 14. Check package.json scripts
console.log('\n--- 14. PACKAGE.JSON SCRIPTS ---');
try {
  const webPkg = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf8'));
  console.log('  Web scripts: ' + Object.keys(webPkg.scripts || {}).join(', '));
  console.log('  Web deps count: ' + Object.keys(webPkg.dependencies || {}).length);
} catch(e) {}
try {
  const adminPkg = JSON.parse(fs.readFileSync('apps/admin/package.json', 'utf8'));
  console.log('  Admin scripts: ' + Object.keys(adminPkg.scripts || {}).join(', '));
} catch(e) {}
try {
  const backPkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
  console.log('  Backend scripts: ' + Object.keys(backPkg.scripts || {}).join(', '));
  console.log('  Backend deps count: ' + Object.keys(backPkg.dependencies || {}).length);
} catch(e) {}

// 15. Check for placeholder content in admin
console.log('\n--- 15. ADMIN PLACEHOLDER SECTIONS ---');
const adminContent = fs.readFileSync('apps/admin/src/app/page.js', 'utf8');
const placeholders = [];
const lines = adminContent.split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('placeholder') || line.toLowerCase().includes('coming soon') || line.toLowerCase().includes('todo') || line.toLowerCase().includes('stub')) {
    placeholders.push({ line: i+1, content: line.trim().substring(0, 100) });
  }
});
placeholders.forEach(p => console.log('  L' + p.line + ': ' + p.content));

console.log('\n=== SCAN COMPLETE ===');
