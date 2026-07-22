const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../routes');
const MODULES_DIR = path.join(__dirname, '../modules');

const domains = {
  ecommerce: ['shop', 'cart', 'checkout', 'order', 'payment', 'addresses', 'bills', 'wallet', 'subscription', 'subscriptions', 'group-buying', 'trust-reviews', 'marketplace'],
  services: ['job', 'jobs', 'job-cards', 'property', 'properties', 'rental', 'medical', 'health', 'care', 'equipment', 'chef', 'delivery', 'tracking', 'services', 'carpool'],
  community: ['feed', 'townsquare', 'chat', 'event', 'events', 'society', 'society-admin', 'society-visitor', 'community_hub', 'pet', 'pets', 'story', 'volunteer', 'donations', 'scrap'],
  crm: ['admin', 'admin-auth', 'franchise', 'franchise-intelligence', 'crm', 'leads-crm', 'commission', 'territory', 'disputes', 'earnings', 'fleet-assets', 'campaign', 'campaigns', 'engagement', 'ai-analytics', 'rbac'],
  core: ['auth', 'user', 'user_zone', 'zone', 'settings', 'upload', 'notification', 'proxy', 'webhooks', 'chatbot', 'sos', 'loyalty', 'rewards', 'referral', 'token-queue']
};

function init() {
  if (!fs.existsSync(MODULES_DIR)) fs.mkdirSync(MODULES_DIR);

  let existingRoutes = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.routes.js'));
  
  for (const [domain, routePrefixes] of Object.entries(domains)) {
    const domainDir = path.join(MODULES_DIR, domain);
    if (!fs.existsSync(domainDir)) fs.mkdirSync(domainDir);
    const domainRoutesDir = path.join(domainDir, 'routes');
    if (!fs.existsSync(domainRoutesDir)) fs.mkdirSync(domainRoutesDir);

    let indexContent = `const express = require('express');\nconst router = express.Router();\n\n`;

    for (const prefix of routePrefixes) {
      const fileName = `${prefix}.routes.js`;
      if (existingRoutes.includes(fileName)) {
        // Move file
        const oldPath = path.join(ROUTES_DIR, fileName);
        const newPath = path.join(domainRoutesDir, fileName);
        
        let content = fs.readFileSync(oldPath, 'utf8');
        // Update requires for ../ config/middleware/controllers/services
        content = content.replace(/require\(['"]\.\.\/([^'"]+)['"]\)/g, "require('../../$1')");
        // Update requires for ./ something inside routes (unlikely but possible)
        // content = content.replace(/require\(['"]\.\/([^'"]+)['"]\)/g, "require('./$1')");
        
        fs.writeFileSync(newPath, content);
        fs.unlinkSync(oldPath);
        console.log(`Moved ${fileName} to ${domain}`);

        // Add to index
        // Handle camelCase conversion for variable name
        const varName = prefix.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/_([a-z])/g, (g) => g[1].toUpperCase()) + 'Routes';
        indexContent += `const ${varName} = require('./routes/${fileName}');\n`;
        // We will mount them all at root of the domain router for now, to keep the exact same URL structure in server.js
        // Wait, the API_PREFIX mounts were specific in server.js. E.g. app.use('/api/v1/auth', authRoutes).
        // The domain router will mount them at their respective prefixes.
      }
    }
    
    // Instead of auto-generating index which might get prefixes wrong, 
    // we'll just move the files for now, and I will manually update server.js to require from the new locations.
  }
}

init();
