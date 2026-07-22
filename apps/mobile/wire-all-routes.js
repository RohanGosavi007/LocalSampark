const fs = require('fs');
const path = require('path');

const routesToWire = [
  { appPath: 'app/medical/index.js', screenPath: '../../src/screens/medical/MedicalScreen' },
  { appPath: 'app/wallet/index.js', screenPath: '../../src/screens/wallet/WalletScreen' },
  { appPath: 'app/checkout/index.js', screenPath: '../../src/screens/ecommerce/CheckoutScreen' },
  { appPath: 'app/events/index.js', screenPath: '../../src/screens/events/EventsScreen' },
  { appPath: 'app/home-services/index.js', screenPath: '../../src/screens/services/HomeServicesScreen' },
  { appPath: 'app/townsquare/index.js', screenPath: '../../src/screens/community/TownsquareScreen' },
  { appPath: 'app/admin-dashboard/index.js', screenPath: '../../src/screens/dashboards/AdminDashboard' },
  { appPath: 'app/franchise-dashboard/index.js', screenPath: '../../src/screens/dashboards/FranchiseDashboard' }
];

let count = 0;
for (const item of routesToWire) {
  const fullPath = path.join(__dirname, item.appPath);
  if (fs.existsSync(fullPath)) {
    const code = `import React from 'react';\nimport ScreenComponent from '${item.screenPath}';\n\nexport default function DynamicRoute() {\n  return <ScreenComponent />;\n}\n`;
    fs.writeFileSync(fullPath, code, 'utf8');
    count++;
    console.log(`Wired ${item.appPath} -> ${item.screenPath}`);
  } else {
    console.warn(`File not found: ${fullPath}`);
  }
}
console.log(`Done wiring ${count} mobile routes statically!`);
