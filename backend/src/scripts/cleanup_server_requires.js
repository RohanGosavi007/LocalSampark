const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join(__dirname, '../server.js');
let content = fs.readFileSync(SERVER_FILE, 'utf8');

const lines = content.split('\n');
let modified = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/require\(['"]([^'"]+)['"]\)/);
  if (match) {
    const modulePath = match[1];
    if (modulePath.startsWith('.')) {
      const fullPath = path.join(__dirname, '..', modulePath);
      // Check if file exists, optionally with .js extension
      if (!fs.existsSync(fullPath) && !fs.existsSync(fullPath + '.js') && !fs.existsSync(path.join(fullPath, 'index.js'))) {
        lines[i] = '// ' + line;
        modified = true;
        console.log('Commented out missing module:', modulePath);
      }
    }
  }
}

if (modified) {
  fs.writeFileSync(SERVER_FILE, lines.join('\n'));
  console.log('Updated server.js to comment out missing modules.');
} else {
  console.log('No missing modules found.');
}
