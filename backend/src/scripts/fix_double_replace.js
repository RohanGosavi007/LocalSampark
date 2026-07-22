const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../modules');

const domains = fs.readdirSync(MODULES_DIR);
for (const domain of domains) {
  const routesDir = path.join(MODULES_DIR, domain, 'routes');
  if (!fs.existsSync(routesDir)) continue;
  
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const fp = path.join(routesDir, f);
    let content = fs.readFileSync(fp, 'utf8');
    
    // Fix double-replace
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/config\/([^'"]+)['"]\)/g, "require('../../../config/$1')");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/middleware\/([^'"]+)['"]\)/g, "require('../../../middleware/$1')");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/models\/([^'"]+)['"]\)/g, "require('../../../models/$1')");
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/utils\/([^'"]+)['"]\)/g, "require('../../../utils/$1')");
    
    fs.writeFileSync(fp, content);
  }
}
console.log('Fixed double replace in routes.');
