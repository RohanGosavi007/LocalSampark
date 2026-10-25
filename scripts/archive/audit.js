const fs = require('fs');

function getEnums(content) {
  const enums = {};
  const regex = /export enum (\w+) \{([\s\S]*?)\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const enumName = match[1];
    const enumBody = match[2];
    const values = enumBody.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//'))
      .map(l => l.split('=')[0].trim());
    enums[enumName] = values;
  }
  return enums;
}

const allEnums = {};
fs.readdirSync('packages/types').filter(f => f.endsWith('.ts')).forEach(file => {
  const content = fs.readFileSync('packages/types/' + file, 'utf8');
  Object.assign(allEnums, getEnums(content));
});

const seedFiles = fs.readdirSync('packages/mock-data/seeds').filter(f => f.endsWith('.json'));
const allSeedContent = seedFiles.map(f => fs.readFileSync('packages/mock-data/seeds/' + f, 'utf8')).join(' ');

console.log('--- ENUM USAGE AUDIT ---');
let missingCount = 0;
Object.entries(allEnums).forEach(([enumName, values]) => {
  const missing = values.filter(v => !allSeedContent.includes('"' + v + '"'));
  if (missing.length > 0) {
    console.log(`${enumName} missing:`, missing.join(', '));
    missingCount += missing.length;
  }
});
if (missingCount === 0) console.log('All enums fully covered!');
