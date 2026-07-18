const fs = require('fs');
const path = require('path');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.js') || p.endsWith('.jsx')) {
      let c = fs.readFileSync(p, 'utf8');
      let nc = c.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
      if (c !== nc) {
        fs.writeFileSync(p, nc);
        console.log('Fixed', p);
      }
    }
  });
}

walk('src');
walk('app');
