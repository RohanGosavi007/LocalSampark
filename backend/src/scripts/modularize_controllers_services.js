const fs = require('fs');
const path = require('path');

const CONTROLLERS_DIR = path.join(__dirname, '../controllers');
const SERVICES_DIR = path.join(__dirname, '../services');
const MODULES_DIR = path.join(__dirname, '../modules');

const controllerMapping = {
  ecommerce: ['shop-management.controller.js'],
  services: ['chef.controller.js', 'delivery.controller.js', 'equipment.controller.js', 'jobs.controller.js', 'medical.controller.js', 'property.controller.js'],
  community: ['chat.controller.js', 'community_hub.controller.js', 'donations.controller.js', 'events.controller.js', 'scrap.controller.js', 'society-visitor.controller.js', 'townsquare.controller.js', 'volunteer.controller.js'],
  crm: ['admin-approvals.controller.js', 'admin-revenue.controller.js', 'admin-revenue-models.controller.js', 'finance.controller.js'],
  core: ['chatbot.controller.js', 'gamification.controller.js', 'loyalty.controller.js', 'sos.controller.js']
};

const serviceMapping = {
  services: ['routing.service.js', 'surge.service.js'],
  core: ['analytics.service.js', 'email.service.js', 'firebase.service.js', 'notification.service.js', 'sms.service.js', 'supabaseRealtime.service.js', 'upload.service.js', 'whatsapp.service.js']
};

function moveFiles(sourceDir, mapping, typeFolder) {
  if (!fs.existsSync(sourceDir)) return;
  const files = fs.readdirSync(sourceDir);
  
  for (const [domain, fileNames] of Object.entries(mapping)) {
    const domainDir = path.join(MODULES_DIR, domain);
    if (!fs.existsSync(domainDir)) fs.mkdirSync(domainDir);
    const targetFolder = path.join(domainDir, typeFolder);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);

    for (const fileName of fileNames) {
      if (files.includes(fileName)) {
        const oldPath = path.join(sourceDir, fileName);
        const newPath = path.join(targetFolder, fileName);
        
        let content = fs.readFileSync(oldPath, 'utf8');
        // Update imports going out from controller/service to config/models/utils/etc
        // They were previously 1 level deep (../config). In target they are 3 levels deep (../../../config)
        content = content.replace(/require\(['"]\.\.\/config\/([^'"]+)['"]\)/g, "require('../../../config/$1')");
        content = content.replace(/require\(['"]\.\.\/middleware\/([^'"]+)['"]\)/g, "require('../../../middleware/$1')");
        content = content.replace(/require\(['"]\.\.\/models\/([^'"]+)['"]\)/g, "require('../../../models/$1')");
        content = content.replace(/require\(['"]\.\.\/utils\/([^'"]+)['"]\)/g, "require('../../../utils/$1')");
        
        // Handle cross-references between controllers and services
        // If a controller previously did require('../services/email.service.js'), 
        // now it should probably do require('../../core/services/email.service.js')
        // We will just do a generic replace for ../services to ../../../modules/<domain>/services
        
        fs.writeFileSync(newPath, content);
        fs.unlinkSync(oldPath);
        console.log(`Moved ${fileName} to ${domain}/${typeFolder}`);
      }
    }
  }
}

// 1. Move the files
moveFiles(CONTROLLERS_DIR, controllerMapping, 'controllers');
moveFiles(SERVICES_DIR, serviceMapping, 'services');

// 2. Update routes to point to the new controller locations
function updateRoutes() {
  const domains = fs.readdirSync(MODULES_DIR);
  for (const domain of domains) {
    const routesDir = path.join(MODULES_DIR, domain, 'routes');
    if (!fs.existsSync(routesDir)) continue;
    
    const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const fp = path.join(routesDir, f);
      let content = fs.readFileSync(fp, 'utf8');
      
      // Routes were previously pointing to ../../../controllers/xxx
      // We need to point them to local ../controllers/xxx if the controller is in the same domain
      // Or ../../<other_domain>/controllers/xxx if it's in another domain
      
      // Let's find all instances of require('../../../controllers/...') and require('../../../services/...')
      content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/controllers\/([^'"]+)['"]\)/g, (match, p1) => {
        // Find which domain owns this controller
        for (const [dom, ctrlFiles] of Object.entries(controllerMapping)) {
          if (ctrlFiles.includes(p1) || ctrlFiles.includes(p1 + '.js')) {
            if (dom === domain) {
              return `require('../controllers/${p1}')`;
            } else {
              return `require('../../${dom}/controllers/${p1}')`;
            }
          }
        }
        return match; // Unchanged if not found
      });

      content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/services\/([^'"]+)['"]\)/g, (match, p1) => {
        // Find which domain owns this service
        for (const [dom, svcFiles] of Object.entries(serviceMapping)) {
          if (svcFiles.includes(p1) || svcFiles.includes(p1 + '.js')) {
            if (dom === domain) {
              return `require('../services/${p1}')`;
            } else {
              return `require('../../${dom}/services/${p1}')`;
            }
          }
        }
        return match; // Unchanged if not found
      });

      fs.writeFileSync(fp, content);
    }
  }
}

updateRoutes();

// 3. Update server.js or any other top-level files that required services
const SERVER_FILE = path.join(__dirname, '../server.js');
if (fs.existsSync(SERVER_FILE)) {
  let serverContent = fs.readFileSync(SERVER_FILE, 'utf8');
  
  serverContent = serverContent.replace(/require\(['"]\.\/services\/([^'"]+)['"]\)/g, (match, p1) => {
    for (const [dom, svcFiles] of Object.entries(serviceMapping)) {
      if (svcFiles.includes(p1) || svcFiles.includes(p1 + '.js')) {
        return `require('./modules/${dom}/services/${p1}')`;
      }
    }
    return match;
  });
  
  fs.writeFileSync(SERVER_FILE, serverContent);
}

console.log('Controllers and Services Modularization Complete.');
