const fs = require('fs');
const path = require('path');

const files = [
  'apps/admin/src/context/AdminAuthContext.js',
  'apps/admin/src/app/page.js',
  'apps/admin/src/app/territories/page.js',
  'apps/admin/src/app/settings/page.js',
  'apps/admin/src/app/audit/page.js',
  'apps/admin/src/app/login/page.js',
  'apps/web/src/lib/api.js',
  'Mobile Build Android/mobile_build 08-07-2026/src/context/AuthContext.js',
  'Mobile Build Android/mobile_build 08-07-2026/app/config/api.js',
  'Mobile Build Android/mobile_build 07-07-2026/src/context/AuthContext.js',
  'Mobile Build Android/mobile_build 07-07-2026/app/config/api.js'
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('http://localhost:5000')) {
      content = content.replace(/http:\/\/localhost:5000/g, 'https://localsampark-api.onrender.com');
      fs.writeFileSync(fullPath, content);
      console.log('Fixed:', file);
    }
    if (content.includes('10.0.2.2:5000')) {
      content = content.replace(/10\.0\.2\.2:5000/g, 'localsampark-api.onrender.com');
      fs.writeFileSync(fullPath, content);
      console.log('Fixed 10.0.2.2:', file);
    }
  } else {
    console.log('Not found:', file);
  }
}
