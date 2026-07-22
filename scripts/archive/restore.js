const fs = require('fs');
const path = require('path');
function w(d) {
  fs.readdirSync(d).forEach(f => {
    const fp = path.join(d, f);
    if (fs.statSync(fp).isDirectory()) w(fp);
    else if (fp.endsWith('.js') || fp.endsWith('.jsx')) {
      let c = fs.readFileSync(fp, 'utf8');
      if (c.includes("'http://localhost:5000'")) {
        fs.writeFileSync(fp, c.split("'http://localhost:5000'").join("'"));
        console.log('Restored:', fp);
      }
    }
  });
}
w('c:/Users/Admin/Downloads/Local 09-7-2026 Office/Local 09-7-2026 Office/Local 07-7-2026 Office/localsampark/apps/web/src');
