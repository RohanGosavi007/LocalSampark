const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, 'app');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.startsWith('.')) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walkDir(APP_DIR);
let fixedCount = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip config/api.js itself
  if (filePath.includes('config' + path.sep + 'api.js')) return;
  
  const hasOld = content.includes('10.0.2.2:5000') || content.includes('localhost:5000');
  if (!hasOld) return;
  
  // Compute relative import path
  const rel = path.relative(path.dirname(filePath), path.join(__dirname, 'app', 'config', 'api')).replace(/\\/g, '/');
  const importPath = rel.startsWith('.') ? rel : './' + rel;
  
  // Add import if missing
  if (!content.includes("from '" + importPath + "'") && !content.includes('API_V1')) {
    // Find last import line
    const lines = content.split('\n');
    let lastImportIdx = -1;
    lines.forEach((line, idx) => {
      if (line.startsWith('import ') && line.includes(' from ')) lastImportIdx = idx;
    });
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, `import { API_V1 } from '${importPath}';`);
      content = lines.join('\n');
    }
  }
  
  // Replace ALL patterns:
  // Template literal: `http://10.0.2.2:5000/api/v1/something/${var}/action`
  // Single quoted: 'http://10.0.2.2:5000/api/v1/something'
  // Same for localhost
  
  content = content.replace(/`http:\/\/10\.0\.2\.2:5000\/api\/v1/g, '`${API_V1}');
  content = content.replace(/`http:\/\/localhost:5000\/api\/v1/g, '`${API_V1}');
  content = content.replace(/'http:\/\/10\.0\.2\.2:5000\/api\/v1([^']*)'/g, '`${API_V1}$1`');
  content = content.replace(/'http:\/\/localhost:5000\/api\/v1([^']*)'/g, '`${API_V1}$1`');
  
  // Also fix bare base URLs (like in onboarding.js)
  content = content.replace(/'http:\/\/10\.0\.2\.2:5000'/g, 'API_BASE_URL');
  content = content.replace(/'http:\/\/localhost:5000'/g, 'API_BASE_URL');
  
  // Fix import if API_BASE_URL is used
  if (content.includes('API_BASE_URL') && !content.includes('API_BASE_URL }')) {
    content = content.replace("import { API_V1 }", "import { API_V1, API_BASE_URL }");
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  fixedCount++;
  console.log(`Fixed: ${path.relative(__dirname, filePath)}`);
});

console.log(`\nDone! Fixed ${fixedCount} files.`);
