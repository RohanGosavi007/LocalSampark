const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

let errorCount = 0;

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      const code = fs.readFileSync(fullPath, 'utf8');
      try {
        babel.parseSync(code, {
          filename: fullPath,
          presets: [require.resolve('babel-preset-expo')],
        });
      } catch (err) {
        console.error('❌ Syntax error in:', fullPath);
        console.error('   ' + err.message.split('\n')[0]);
        errorCount++;
      }
    }
  });
}

console.log('Scanning app/ and src/ for Babel parse errors...');
checkDir('app');
checkDir('src');
console.log(`Scan complete. Found ${errorCount} syntax error(s).`);
