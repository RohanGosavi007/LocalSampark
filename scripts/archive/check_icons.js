const fs = require('fs');
const path = require('path');

const dir = 'e:\\localsampark1 10-08-2026\\localsampark1 10-08-2026\\apps\\web\\src\\app\\shops\\[id]\\components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const errors = [];

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  
  // Clean comments
  const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  const lucideMatch = cleanContent.match(/import\s+\{([\s\S]+?)\}\s+from\s+['"]lucide-react['"]/);
  const importedLucideIcons = new Set();
  
  if (lucideMatch) {
    lucideMatch[1].split(',').forEach(i => {
      importedLucideIcons.add(i.trim());
    });
  }

  // Native Next/React imports
  const natives = new Set(['React', 'Image', 'motion', 'AnimatePresence', 'SlotMatrixGrid', 'TokenTrackerBar', 'UnitSelector', 'StockBadge', 'Link']);

  const usedIcons = new Set();
  const tagMatches = cleanContent.match(/<([A-Z][a-zA-Z0-9]+)/g) || [];
  tagMatches.forEach(tag => {
    const name = tag.substring(1);
    if (!natives.has(name) && !name.includes('VisitorView') && !name.includes('Router')) {
      usedIcons.add(name);
    }
  });

  const objectIconsMatch = cleanContent.match(/icon:\s*([A-Z][a-zA-Z0-9]+)/g) || [];
  objectIconsMatch.forEach(oi => {
    const name = oi.split(':')[1].trim();
    if (!natives.has(name)) {
      usedIcons.add(name);
    }
  });

  const missing = [];
  usedIcons.forEach(icon => {
    // If it looks like a lucide icon but isn't imported from lucide
    if (!importedLucideIcons.has(icon)) {
      // Check if it's imported at all (even in multiline)
      const isImported = new RegExp(`import.*?\\b${icon}\\b`, 's').test(cleanContent);
      if (!isImported) {
        missing.push(icon);
      }
    }
  });

  if (missing.length > 0) {
    errors.push(`${f}: Potentially missing imports: ${missing.join(', ')}`);
  }
});

console.log('--- Missing Icons Report v2 ---');
if (errors.length > 0) {
  errors.forEach(e => console.log(e));
} else {
  console.log('No missing icon imports found!');
}
