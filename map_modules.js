const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, 'apps/web/src/app');
const mobileDir = path.join(__dirname, 'apps/mobile/app/modules');

const getDirs = source => fs.readdirSync(source, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

const webModules = getDirs(webDir).filter(name => !['components', 'api'].includes(name) && !name.startsWith('('));
const mobileModules = getDirs(mobileDir).filter(name => !name.startsWith('('));

const missingInMobile = webModules.filter(m => !mobileModules.includes(m) && !mobileModules.includes(m.replace(/-/g, '_')));

console.log('Web Modules:', webModules.length);
console.log('Mobile Modules:', mobileModules.length);
console.log('Missing in Mobile:', missingInMobile.length);
console.log('List of missing:', missingInMobile);
