const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, '../modules');
if (!fs.existsSync(modulesDir)) process.exit(0);

const modules = fs.readdirSync(modulesDir);
for (const mod of modules) {
  const routesDir = path.join(modulesDir, mod, 'routes');
  if (!fs.existsSync(routesDir)) continue;
  
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const filePath = path.join(routesDir, f);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace requires that point to ../../config or ../../middleware
    // because they originally pointed to ../config or ../middleware
    content = content.replace(/require\(['"]\.\.\/config\/([^'"]+)['"]\)/g, "require('../../../config/$1')");
    content = content.replace(/require\(['"]\.\.\/middleware\/([^'"]+)['"]\)/g, "require('../../../middleware/$1')");
    content = content.replace(/require\(['"]\.\.\/controllers\/([^'"]+)['"]\)/g, "require('../../../controllers/$1')");
    content = content.replace(/require\(['"]\.\.\/services\/([^'"]+)['"]\)/g, "require('../../../services/$1')");
    content = content.replace(/require\(['"]\.\.\/utils\/([^'"]+)['"]\)/g, "require('../../../utils/$1')");
    content = content.replace(/require\(['"]\.\.\/models\/([^'"]+)['"]\)/g, "require('../../../models/$1')");

    // My modularize script already did a general replace to ../../
    // So let's look for anything that is currently ../../ but should be ../../../
    // Wait, my modularize script did `content.replace(/require\(['"]\.\.\/([^'"]+)['"]\)/g, "require('../../$1')");`
    // So they are currently `require('../../config/database')`.
    // Let's replace `require('../../` with `require('../../../`
    content = content.replace(/require\(['"]\.\.\/\.\.\/([^'"]+)['"]\)/g, "require('../../../$1')");
    
    fs.writeFileSync(filePath, content);
  }
}
console.log('Fixed relative imports in modules.');
