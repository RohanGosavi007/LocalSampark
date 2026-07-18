const fs = require('fs');
const path = require('path');

const DIRS_TO_SCAN = ['backend', 'apps/web', 'apps/mobile'];
let issues = [];

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'build' && file !== 'dist' && file !== '.expo') {
        scanDirectory(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 2. Check for TODOs
    if (content.includes('TODO') || content.includes('FIXME')) {
      issues.push(`[TODO found] ${filePath}`);
    }

    // 3. Check for obvious broken placeholder components
    if (content.includes('<div>Placeholder</div>') || content.includes('<Text>Placeholder</Text>')) {
      issues.push(`[Placeholder Component found] ${filePath}`);
    }

    // 4. Check for 'import api from' (which caused issues in Phase 6)
    if (content.match(/import\s+api\s+from\s+['"].*config\/api['"]/)) {
      issues.push(`[Potential Default Import Bug] ${filePath} imports 'api' as default instead of named exports.`);
    }

    // 5. Check for missing context imports in mobile
    if (filePath.includes('apps\\mobile') && content.match(/import.*from\s+['"]\.\.\/src\/context/)) {
        const match = content.match(/import.*from\s+['"](.*context.*)['"]/);
        if (match) {
            const importPath = match[1];
            const resolved = path.resolve(path.dirname(filePath), importPath) + '.js';
            if (!fs.existsSync(resolved)) {
               issues.push(`[Broken Import] ${filePath} -> ${importPath}`);
            }
        }
    }

    // 6. Check for unhandled Promise rejections or missing try/catch in routes
    if (filePath.includes('routes') && content.includes('async (req, res)') && !content.includes('try {') && !content.includes('asyncHandler')) {
      issues.push(`[Missing try/catch in route] ${filePath}`);
    }

  } catch (err) {
    issues.push(`[Error reading file] ${filePath}: ${err.message}`);
  }
}

console.log('Starting 10x Deep Recheck Audit...');
for (const dir of DIRS_TO_SCAN) {
  scanDirectory(path.join(__dirname, dir));
}

console.log('\n--- AUDIT RESULTS ---');
if (issues.length === 0) {
  console.log('✅ No critical issues found during deep scan!');
} else {
  issues.forEach(i => console.log(i));
  console.log(`\nFound ${issues.length} potential issues.`);
}
