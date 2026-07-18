const fs = require('fs');
const path = require('path');

const dirs = [
  'C:\\standalone_mobile\\app',
  'C:\\standalone_mobile\\src'
];

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const colorMap = {
  "'#060b18'": "'#f8fafc'",
  "'#0d1526'": "'#ffffff'",
  "'#1e293b'": "'#ffffff'",
  "'#0f172a'": "'#f8fafc'",
  "'#334155'": "'#e2e8f0'",
  "'#fff'": "'#0f172a'",
  "'#ffffff'": "'#0f172a'",
  "'#94a3b8'": "'#64748b'",
  "'#cbd5e1'": "'#475569'"
};

let modifiedFiles = 0;

dirs.forEach(dir => {
  walk(dir, function(filePath) {
    if (filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let original = content;
      
      // Specifically target React Native style properties
      content = content.replace(/(backgroundColor|borderTopColor|borderBottomColor|borderColor|color|shadowColor):\s*('#[0-9a-fA-F]{3,6}')/g, (match, prop, color) => {
        let lowerColor = color.toLowerCase();
        
        // Special case: don't make primary buttons dark text if possible, but it's hard to know.
        // We just replace using the map.
        if (colorMap[lowerColor]) {
          // If we're changing a card to white, let's add a shadow property if it doesn't exist? Too complex via regex.
          return `${prop}: ${colorMap[lowerColor]}`;
        }
        
        // If color is rgba(255, 255, 255, ...), make it dark
        if (lowerColor.includes('rgba(255, 255, 255')) {
            // Can't easily map rgba string without complex regex, skip for now.
        }
        
        return match;
      });
      
      // Replace rgba(255, 255, 255, X) with rgba(15, 23, 42, X)
      content = content.replace(/rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/g, 'rgba(15, 23, 42, $1)');

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedFiles++;
      }
    }
  });
});

console.log(`Migration complete. Modified ${modifiedFiles} files.`);
