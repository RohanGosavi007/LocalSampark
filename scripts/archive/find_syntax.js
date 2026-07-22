const fs = require('fs');
const path = require('path');
function check(f) {
  let c = fs.readFileSync(f, 'utf8');
  // Simple heuristic: count single quotes and backticks, ignoring those preceded by backslash
  let s1 = (c.match(/[^\\]'/g) || []).length;
  let s2 = (c.match(/[^\\]`/g) || []).length;
  if (s1 % 2 !== 0 || s2 % 2 !== 0) {
    console.log('Unbalanced in', f, 'single:', s1, 'backtick:', s2);
  }
}
function w(d) {
  fs.readdirSync(d).forEach(f => {
    let fp = path.join(d, f);
    if (fs.statSync(fp).isDirectory()) w(fp);
    else if (fp.endsWith('.js') || fp.endsWith('.jsx')) check(fp);
  });
}
w('c:/Users/Admin/Downloads/Local 09-7-2026 Office/Local 09-7-2026 Office/Local 07-7-2026 Office/localsampark/apps/web/src');
