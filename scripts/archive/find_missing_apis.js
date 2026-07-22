const fs = require('fs');
const path = require('path');

const extractApis = (dir) => {
  let apis = [];
  const walk = (currentPath) => {
    if (!fs.existsSync(currentPath)) return;
    const files = fs.readdirSync(currentPath);
    for (const file of files) {
      const fullPath = path.join(currentPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (fullPath.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(/\/api\/v1\/[^`\'\"?}]+/g);
        if (matches) apis.push(...matches);
      }
    }
  };
  walk(dir);
  return [...new Set(apis)].sort();
};

const web = extractApis(path.join(__dirname, 'apps/web/src/app'));
const mob = extractApis(path.join(__dirname, 'apps/mobile/app/modules'));

const missing = web.filter(e => !mob.some(m => m.includes(e) || e.includes(m)));

console.log('MISSING ENDPOINTS IN MOBILE:');
console.log(JSON.stringify(missing, null, 2));
