const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'app');
const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(appDir);
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // The depth is how many directories deep we are from the 'apps/mobile' root.
    // __dirname is 'apps/mobile'.
    // file is 'apps/mobile/app/...'
    const relativeToRoot = path.relative(__dirname, path.dirname(file));
    // relativeToRoot is like 'app' or 'app\volunteer'
    const depth = relativeToRoot.split(path.sep).length;
    
    // We need 'depth' number of '../' to get from the file's dir to the root.
    // Wait, if we are in 'app', depth=1, so we need '../' to get to root.
    // If in 'app/volunteer', depth=2, we need '../../' to get to root.
    const dots = '../'.repeat(depth);

    // Replace bad imports
    // It looks like: import { apiGet } from '../../../../../../../../src/lib/api';
    // We want to replace any string of `../` that precedes `src/` with the correct `dots`
    
    content = content.replace(/(['"])(?:\.\.\/)+src\//g, `$1${dots}src/`);

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
        console.log(`Fixed imports in ${path.relative(__dirname, file)}`);
    }
});

console.log(`Fixed imports in ${changedCount} files.`);
