const fs = require('fs');
const path = require('path');

const webAppDir = path.join(__dirname, 'apps', 'web', 'src', 'app');

const dashboards = [
  { path: 'shop-dashboard', title: 'Shop Owner Dashboard', icon: '🏪' },
  { path: 'delivery-dashboard', title: 'Delivery Agent Dashboard', icon: '📦' },
  { path: 'service-dashboard', title: 'Service Provider Dashboard', icon: '🔧' },
  { path: 'field-dashboard', title: 'Field Agent Dashboard', icon: '📊' },
  { path: 'franchise-dashboard', title: 'Franchise Partner Dashboard', icon: '🏢' },
];

dashboards.forEach(dashboard => {
  const dirPath = path.join(webAppDir, dashboard.path);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, 'page.js');
  const content = `import React from 'react';
import Header from '../components/Header';

export default function ${dashboard.path.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 min-h-[calc(100vh-64px)] border-r border-slate-800 p-4">
          <div className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">Navigation</div>
          
          <nav className="space-y-2">
            <a href="#" className="block px-4 py-3 rounded-lg bg-blue-900/30 text-blue-400 font-semibold border border-blue-800/50">
              Dashboard Home
            </a>
            <a href="#" className="block px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
              Profile & Settings
            </a>
            <a href="#" className="block px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
              Earnings & Wallet
            </a>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">${dashboard.icon} ${dashboard.title}</h1>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-6xl mb-6">🚧</div>
            <h2 className="text-2xl font-bold text-white mb-4">Module Under Construction</h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              This dashboard is being built out in Phase 3. It will contain all role-specific features, analytics, and management tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created ${dashboard.path}/page.js`);
});
