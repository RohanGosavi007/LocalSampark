const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(full);
    }
  }
  return results;
}

const mobileRoot = path.resolve(__dirname, '../apps/mobile');
const appDir = path.join(mobileRoot, 'app');
const srcDir = path.join(mobileRoot, 'src');
const files = [...walk(appDir), ...walk(srcDir)];
let badCount = 0;
const fixes = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const rel = m[1];
    const dir = path.dirname(f);
    let resolved = path.resolve(dir, rel);
    
    let exists = false;
    for (const ext of ['', '.js', '.jsx', '.json', '/index.js', '/index.jsx']) {
      if (fs.existsSync(resolved + ext)) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      console.log('BAD IMPORT in:', path.relative(mobileRoot, f), '->', rel);
      badCount++;
      fixes.push({ file: f, badImport: rel });
    }
  }
}
console.log('Total bad relative imports:', badCount);
