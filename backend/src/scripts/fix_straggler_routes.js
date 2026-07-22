const fs = require('fs');
const path = require('path');

const filesToFix = [
  path.join(__dirname, '../modules/crm/routes/finance.routes.js'),
  path.join(__dirname, '../modules/ecommerce/routes/premium.routes.js')
];

for (const fp of filesToFix) {
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    
    // Originally these were in src/routes/. They pointed to ../controllers/finance.controller.
    // They are now in src/modules/<domain>/routes/.
    // They should point to ../controllers/finance.controller (because finance is also in CRM)
    content = content.replace(/require\(['"]\.\.\/controllers\/([^'"]+)['"]\)/g, "require('../controllers/$1')");
    
    // If they pointed to ../middleware/xxx, now it should be ../../../middleware/xxx
    content = content.replace(/require\(['"]\.\.\/middleware\/([^'"]+)['"]\)/g, "require('../../../middleware/$1')");
    
    fs.writeFileSync(fp, content);
  }
}

// Update server.js
const SERVER_FILE = path.join(__dirname, '../server.js');
let serverContent = fs.readFileSync(SERVER_FILE, 'utf8');
serverContent = serverContent.replace(/require\(['"]\.\/routes\/finance\.routes['"]\)/g, "require('./modules/crm/routes/finance.routes')");
serverContent = serverContent.replace(/require\(['"]\.\/routes\/premium\.routes['"]\)/g, "require('./modules/ecommerce/routes/premium.routes')");
fs.writeFileSync(SERVER_FILE, serverContent);

console.log('Fixed straggler routes.');
