const fs = require('fs');
const path = require('path');

const webAppDir = path.join(__dirname, 'apps/web/src/app');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fp = path.join(dir, file);
    const stat = fs.statSync(fp);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fp));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(fp);
    }
  });
  return results;
}

const files = walk(webAppDir);
let fixedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find "export default function [something]-[something]"
  const regex = /export\s+default\s+function\s+([a-zA-Z0-9_-]+)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const origName = match[1];
    if (origName.includes('-')) {
      // Convert hyphenated name to camelCase
      const newName = origName.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
      
      // Replace in content
      content = content.replace(origName, newName);
      fs.writeFileSync(file, content);
      console.log(`Fixed in ${path.relative(__dirname, file)}: ${origName} -> ${newName}`);
      fixedCount++;
    }
  }
});

console.log(`\nDone. Fixed ${fixedCount} function names.`);
