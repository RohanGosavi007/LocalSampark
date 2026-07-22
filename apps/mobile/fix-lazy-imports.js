const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, 'app');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Convert React.lazy or lazy to static imports
      const lazyRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*(?:React\.)?lazy\(\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)\);?/g;
      if (lazyRegex.test(content)) {
        content = content.replace(lazyRegex, (match, componentName, importPath) => {
          modified = true;
          return `import ${componentName} from '${importPath}';`;
        });
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed lazy imports in: ${fullPath}`);
      }
    }
  }
}

console.log('Scanning apps/mobile/app for React.lazy imports...');
processDirectory(APP_DIR);
console.log('Finished fixing lazy imports!');
