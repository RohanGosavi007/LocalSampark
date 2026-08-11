const fs = require('fs');
const lines = fs.readFileSync('src/server.js', 'utf8').split('\n');
const newLines = lines.map((line, idx) => {
  if (idx >= 88 && idx <= 550) {
    return line + '\nconsole.log("--- DEBUG: AT LINE ' + (idx+1) + ' ---");';
  }
  return line;
});
fs.writeFileSync('src/server-debug.js', newLines.join('\n'));
