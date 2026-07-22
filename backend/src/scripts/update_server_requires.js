const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join(__dirname, '../server.js');

const domains = {
  ecommerce: ['shop', 'cart', 'checkout', 'order', 'payment', 'addresses', 'bills', 'wallet', 'subscription', 'subscriptions', 'group-buying', 'trust-reviews', 'marketplace'],
  services: ['job', 'jobs', 'job-cards', 'property', 'properties', 'rental', 'medical', 'health', 'care', 'equipment', 'chef', 'delivery', 'tracking', 'services', 'carpool'],
  community: ['feed', 'townsquare', 'chat', 'event', 'events', 'society', 'society-admin', 'society-visitor', 'community_hub', 'pet', 'pets', 'story', 'volunteer', 'donations', 'scrap'],
  crm: ['admin', 'admin-auth', 'franchise', 'franchise-intelligence', 'crm', 'leads-crm', 'commission', 'territory', 'disputes', 'earnings', 'fleet-assets', 'campaign', 'campaigns', 'engagement', 'ai-analytics', 'rbac'],
  core: ['auth', 'user', 'user_zone', 'zone', 'settings', 'upload', 'notification', 'proxy', 'webhooks', 'chatbot', 'sos', 'loyalty', 'rewards', 'referral', 'token-queue']
};

function updateServer() {
  let content = fs.readFileSync(SERVER_FILE, 'utf8');
  
  for (const [domain, routePrefixes] of Object.entries(domains)) {
    for (const prefix of routePrefixes) {
      // Regex to match exactly require('./routes/prefix.routes') or require('./routes/prefix.routes.js')
      // and replace with require('./modules/domain/routes/prefix.routes')
      const regex = new RegExp(`require\\(['"]\\.\\/routes\\/${prefix}\\.routes['"]\\)`, 'g');
      content = content.replace(regex, `require('./modules/${domain}/routes/${prefix}.routes')`);
    }
  }

  fs.writeFileSync(SERVER_FILE, content);
  console.log('Updated server.js');
}

updateServer();
