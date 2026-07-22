const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../modules');

const serviceMapping = {
  services: ['routing.service.js', 'surge.service.js'],
  core: ['analytics.service.js', 'email.service.js', 'firebase.service.js', 'notification.service.js', 'sms.service.js', 'supabaseRealtime.service.js', 'upload.service.js', 'whatsapp.service.js']
};

function resolveCrossReferences() {
  const domains = fs.readdirSync(MODULES_DIR);
  for (const domain of domains) {
    const domainDir = path.join(MODULES_DIR, domain);
    
    // Check both controllers and services folders within this domain
    for (const sub of ['controllers', 'services']) {
      const targetDir = path.join(domainDir, sub);
      if (!fs.existsSync(targetDir)) continue;
      
      const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.js'));
      for (const f of files) {
        const fp = path.join(targetDir, f);
        let content = fs.readFileSync(fp, 'utf8');
        
        // Match require('../services/xxx') and require('../controllers/xxx') 
        // Previously, these were adjacent directories. 
        content = content.replace(/require\(['"]\.\.\/services\/([^'"]+)['"]\)/g, (match, p1) => {
          for (const [dom, svcFiles] of Object.entries(serviceMapping)) {
            if (svcFiles.includes(p1) || svcFiles.includes(p1 + '.js')) {
              if (dom === domain) {
                // If it's in the same domain, it's just ../services/xxx
                return `require('../services/${p1}')`;
              } else {
                // If it's in a different domain, it's ../../<domain>/services/xxx
                return `require('../../${dom}/services/${p1}')`;
              }
            }
          }
          return match;
        });
        
        fs.writeFileSync(fp, content);
      }
    }
  }
}

resolveCrossReferences();
console.log('Cross references fixed.');
