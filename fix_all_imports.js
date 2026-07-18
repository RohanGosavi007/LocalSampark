const fs = require('fs');
const path = require('path');

const srcAppDir = path.resolve(__dirname, 'apps/web/src/app');

function fixImports(dir) {
  fs.readdirSync(dir).forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) {
      fixImports(fp);
    } else if (fp.endsWith('.js') || fp.endsWith('.jsx')) {
      let content = fs.readFileSync(fp, 'utf8');
      
      // Calculate relative path from this file's directory to apps/web/src/app/components
      const componentsDir = path.join(srcAppDir, 'components');
      let relativePath = path.relative(path.dirname(fp), componentsDir).replace(/\\/g, '/');
      
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }

      // Replace any import that points to some components directory and brings in Header, Footer, ui, DynamicIcon, etc.
      // E.g., import Header from '../../../components/Header';
      // We'll catch them by looking for something like /components/Header and replacing the path before it.
      
      const regex = /import\s+(?:\{[^}]*\}|[\w]+)\s+from\s+['"]([^'"]+\/components\/(?:Header|Footer|ui|DynamicIcon|GlassIcon|ZoneSelector|WebImageUploader|LogisticsMap))([^'"]*)['"]/g;
      
      let changed = false;
      const newContent = content.replace(regex, (match, prefix, suffix) => {
         // Replace the old prefix up to '/components/' with our correct relative path
         const newImportPath = relativePath + '/' + prefix.split('/components/')[1] + suffix;
         const originalImportStart = match.split(/['"]/)[0]; // e.g. "import Header from "
         changed = true;
         return `${originalImportStart}'${newImportPath}'`;
      });
      
      if (changed && newContent !== content) {
        fs.writeFileSync(fp, newContent);
        console.log('Fixed imports in', fp);
      }
    }
  });
}

fixImports(srcAppDir);
