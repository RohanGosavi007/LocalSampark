const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, 'apps/web/src/app');
const mobDir = path.join(__dirname, 'apps/mobile/app');

function walkDir(dir, baseDir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, baseDir, fileList);
    } else {
      fileList.push(fullPath.replace(baseDir, ''));
    }
  }
  return fileList;
}

const webFiles = walkDir(webDir, webDir).filter(f => f.endsWith('page.js'));

console.log(`Found ${webFiles.length} pages in Web App.`);

const results = [];

for (const webRel of webFiles) {
  const webFull = path.join(webDir, webRel);
  const webSize = fs.statSync(webFull).size;
  
  // Try to find the equivalent in mobile.
  // web: /service/[id]/page.js
  // mob equivalent is usually: modules/service/index.js, or modules/service-detail/index.js
  
  // Just print out all web pages and their sizes, sorted by size descending.
  results.push({
    route: webRel.replace(/\\/g, '/').replace('/page.js', ''),
    size: webSize
  });
}

console.table(results.sort((a,b) => b.size - a.size));
