const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const targetStr = "const API_BASE = process.env.NEXT_PUBLIC_API_URL || `${API_URL}/api/v1`;";
const replacementStr = "import { API_BASE } from '@/lib/api';";

const files = walk('c:\\Users\\Abhi Laptop\\Downloads\\localsampark 13-07-2026\\localsampark 13-07-2026\\apps\\web\\src');

let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(targetStr)) {
        content = content.replace(targetStr, replacementStr);
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
        count++;
    }
});
console.log(`Updated ${count} files.`);
