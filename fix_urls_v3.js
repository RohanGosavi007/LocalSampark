const fs = require('fs');
const path = require('path');

const files = [
  'apps/admin/src/context/AdminAuthContext.js',
  'apps/admin/src/app/page.js',
  'apps/admin/src/app/territories/page.js',
  'apps/admin/src/app/settings/page.js',
  'apps/admin/src/app/audit/page.js',
  'apps/admin/src/app/login/page.js',
  'apps/web/src/lib/api.js'
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.match(/http:\/\/localhost:5000/)) {
      content = content.replace(/http:\/\/localhost:5000/g, 'https://localsampark-api.onrender.com');
      fs.writeFileSync(fullPath, content);
      console.log('Fixed regex:', file);
    } else {
      console.log('No match in:', file);
    }
  } else {
    console.log('Not found:', file);
  }
}
