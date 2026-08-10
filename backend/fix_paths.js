const fs = require('fs');
const path = require('path');

const srcDir = path.join('E:\\localsampark 09-08-2026\\localsampark 09-08-2026\\backend\\src');
const modulesDir = path.join(srcDir, 'modules');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

const foldersToCheck = ['services', 'repositories', 'controllers', 'utils', 'helpers', 'middleware', 'validators'];

walk(modulesDir, (err, files) => {
  let fixedCount = 0;
  files.filter(f => f.endsWith('.js') && f.includes('\\routes\\')).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    const regex = /require\(['"](\.\.[^'"]+)\/(services|repositories|controllers|utils|helpers|middleware|validators)\/([^'"]+)['"]\)/g;
    
    content = content.replace(regex, (match, relPath, folderName, fileName) => {
      const moduleFolder = path.dirname(path.dirname(file)); // from \routes to \module
      
      let localPath = path.join(moduleFolder, folderName, fileName);
      if (!localPath.endsWith('.js') && !localPath.endsWith('.ts')) {
         if (fs.existsSync(localPath + '.js')) localPath += '.js';
         else if (fs.existsSync(localPath + '/index.js')) localPath += '/index.js';
      }

      let rootPath = path.join(srcDir, folderName, fileName);
      if (!rootPath.endsWith('.js') && !rootPath.endsWith('.ts')) {
         if (fs.existsSync(rootPath + '.js')) rootPath += '.js';
         else if (fs.existsSync(rootPath + '/index.js')) rootPath += '/index.js';
      }

      let targetStr = '';
      if (fs.existsSync(localPath)) {
        targetStr = `../${folderName}/${fileName}`;
      } else if (fs.existsSync(rootPath)) {
        targetStr = `../../../${folderName}/${fileName}`;
      } else {
        return match;
      }

      if (`${relPath}/${folderName}/${fileName}` !== targetStr) {
        modified = true;
        return `require('${targetStr}')`;
      }
      return match;
    });

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      fixedCount++;
    }
  });
  console.log(`Dynamically fixed ${fixedCount} files for middleware and validators.`);
});
