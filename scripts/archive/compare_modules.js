const fs = require('fs');
const path = require('path');

const webAppDir = path.join(__dirname, 'apps/web/src/app');
const mobileAppDir = path.join(__dirname, 'Mobile Build Android/mobile_build 08-07-2026/app');

function getDirs(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
}

const webDirs = getDirs(webAppDir).filter(d => !d.startsWith('(') && !d.startsWith('_'));
const mobileDirs = getDirs(mobileAppDir).filter(d => !d.startsWith('(') && !d.startsWith('_'));

console.log('--- Web App Directories (Modules) ---');
console.log(webDirs);
console.log('--- Mobile App Directories (Modules) ---');
console.log(mobileDirs);

const missingInMobile = webDirs.filter(d => !mobileDirs.includes(d));
console.log('--- Missing in Mobile ---');
console.log(missingInMobile);
