const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    if (f === 'node_modules' || f === '.git' || f === 'build' || f === 'dist') return;
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetFiles = [];

walkDir('e:\\localsampark 04-08-2026\\localsampark 04-08-2026\\apps\\mobile', (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    // If it uses COLORS. but does not import COLORS
    if (content.match(/COLORS\./) && !content.match(/import.*COLORS/)) {
      targetFiles.push(filePath);
    }
  }
});

console.log(JSON.stringify(targetFiles, null, 2));
