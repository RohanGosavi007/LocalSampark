const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('localhost:5000')) {
        content = content.replace(/localhost:5000/g, '10.0.2.2:5000');
        fs.writeFileSync(fullPath, content);
        console.log('Fixed API URLs in', fullPath);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'apps', 'mobile', 'app'));
