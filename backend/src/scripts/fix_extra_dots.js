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
    
    // Convert require('../../../services/controllers/delivery.controller') to require('../../services/controllers/delivery.controller')
    content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/([a-zA-Z0-9_-]+)\/(controllers|services)\/([^'"]+)['"]\)/g, "require('../../$1/$2/$3')");
    
    fs.writeFileSync(fp, content);
  }
}
for (const domain of domains) {
  for (const sub of ['controllers', 'services']) {
    const subDir = path.join(MODULES_DIR, domain, sub);
    if (!fs.existsSync(subDir)) continue;
    const files = fs.readdirSync(subDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const fp = path.join(subDir, f);
      let content = fs.readFileSync(fp, 'utf8');
      
      content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/([a-zA-Z0-9_-]+)\/(controllers|services)\/([^'"]+)['"]\)/g, "require('../../$1/$2/$3')");
      
      fs.writeFileSync(fp, content);
    }
  }
}
console.log('Fixed extra dot-dots.');
