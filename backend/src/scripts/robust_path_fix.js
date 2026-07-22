const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../modules');

const serviceMapping = {
  services: ['routing.service.js', 'surge.service.js'],
  core: ['analytics.service.js', 'email.service.js', 'firebase.service.js', 'notification.service.js', 'sms.service.js', 'supabaseRealtime.service.js', 'upload.service.js', 'whatsapp.service.js']
};

const controllerMapping = {
  ecommerce: ['shop-management.controller.js'],
  services: ['chef.controller.js', 'delivery.controller.js', 'equipment.controller.js', 'jobs.controller.js', 'medical.controller.js', 'property.controller.js'],
  community: ['chat.controller.js', 'community_hub.controller.js', 'donations.controller.js', 'events.controller.js', 'scrap.controller.js', 'society-visitor.controller.js', 'townsquare.controller.js', 'volunteer.controller.js'],
  crm: ['admin-approvals.controller.js', 'admin-revenue.controller.js', 'admin-revenue-models.controller.js', 'finance.controller.js'],
  core: ['chatbot.controller.js', 'gamification.controller.js', 'loyalty.controller.js', 'sos.controller.js']
};

const domains = fs.readdirSync(MODULES_DIR);
for (const domain of domains) {
  const routesDir = path.join(MODULES_DIR, domain, 'routes');
  if (!fs.existsSync(routesDir)) continue;
  
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const fp = path.join(routesDir, f);
    let content = fs.readFileSync(fp, 'utf8');
    
    // Completely fix all service paths
    content = content.replace(/require\(['"][\.\/]+services\/([^'"]+)['"]\)/g, (match, p1) => {
      for (const [dom, svcFiles] of Object.entries(serviceMapping)) {
        if (svcFiles.includes(p1) || svcFiles.includes(p1 + '.js')) {
          if (dom === domain) return `require('../services/${p1}')`;
          return `require('../../${dom}/services/${p1}')`;
        }
      }
      return match;
    });

    // Completely fix all controller paths
    content = content.replace(/require\(['"][\.\/]+controllers\/([^'"]+)['"]\)/g, (match, p1) => {
      for (const [dom, ctrlFiles] of Object.entries(controllerMapping)) {
        if (ctrlFiles.includes(p1) || ctrlFiles.includes(p1 + '.js')) {
          if (dom === domain) return `require('../controllers/${p1}')`;
          return `require('../../${dom}/controllers/${p1}')`;
        }
      }
      return match;
    });
    
    fs.writeFileSync(fp, content);
  }
}

// And let's fix controllers and services cross-references as well, just in case my re-run messed them up.
for (const domain of domains) {
  for (const sub of ['controllers', 'services']) {
    const subDir = path.join(MODULES_DIR, domain, sub);
    if (!fs.existsSync(subDir)) continue;
    const files = fs.readdirSync(subDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const fp = path.join(subDir, f);
      let content = fs.readFileSync(fp, 'utf8');
      
      content = content.replace(/require\(['"][\.\/]+services\/([^'"]+)['"]\)/g, (match, p1) => {
        for (const [dom, svcFiles] of Object.entries(serviceMapping)) {
          if (svcFiles.includes(p1) || svcFiles.includes(p1 + '.js')) {
            if (dom === domain) return `require('../services/${p1}')`;
            return `require('../../${dom}/services/${p1}')`;
          }
        }
        return match;
      });

      content = content.replace(/require\(['"][\.\/]+controllers\/([^'"]+)['"]\)/g, (match, p1) => {
        for (const [dom, ctrlFiles] of Object.entries(controllerMapping)) {
          if (ctrlFiles.includes(p1) || ctrlFiles.includes(p1 + '.js')) {
            if (dom === domain) return `require('../controllers/${p1}')`;
            return `require('../../${dom}/controllers/${p1}')`;
          }
        }
        return match;
      });
      
      fs.writeFileSync(fp, content);
    }
  }
}

console.log('Robustly fixed all controller and service require paths across the entire module system.');
