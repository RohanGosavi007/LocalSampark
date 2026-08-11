const fs = require('fs');
const path = require('path');

const seedsDir = 'e:\\localsampark1 10-08-2026\\localsampark1 10-08-2026\\packages\\mock-data\\seeds';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let changed = false;

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.json')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('https://cdn.localsampark.in')) {
        // Replace all instances
        const newContent = content.replace(/https:\/\/cdn\.localsampark\.in\/[a-zA-Z0-9_.\/-]+/g, 'https://placehold.co/400x400/png?text=Mock+Image');
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated URLs in ${file}`);
        changed = true;
      }
    }
  });
  return changed;
}

processDirectory(seedsDir);
console.log('CDN URLs replaced with placeholders.');
