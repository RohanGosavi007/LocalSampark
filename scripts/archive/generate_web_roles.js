const fs = require('fs');
const path = require('path');

const webAppDir = path.join(__dirname, 'apps', 'web', 'src', 'app');

const buildDashboard = (role, title, icon, color, metrics, items) => {
  const fileContent = `'use client';
import React, { useState } from 'react';
import Header from '../components/Header';

export default function ${role.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()).replace(/ /g, '')}Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const stats = ${JSON.stringify(metrics)};
  const navItems = ${JSON.stringify(items)};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 min-h-[calc(100vh-64px)] border-r border-slate-800 p-4">
          <div className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider">${title} Menu</div>
          <nav className="space-y-2">
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={\`w-full text-left px-4 py-3 rounded-lg font-semibold flex items-center transition-colors \${
                  activeTab === item.id 
                    ? 'bg-${color}-900/30 text-${color}-400 border border-${color}-800/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }\`}
              >
                <span className="mr-3">{item.icon}</span> {item.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center">
              ${icon} <span className="ml-3">{title}</span>
            </h1>
          </div>
          
          {activeTab === 'dashboard' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-6">
                {stats.map((s, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                    <div className="text-slate-400 text-sm font-medium mb-2">{s.label}</div>
                    <div className="text-3xl font-bold text-white">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900 border border-slate-800 p-12 rounded-xl text-center mt-8">
                <div className="text-4xl mb-4">📈</div>
                <h2 className="text-xl font-bold text-white mb-2">Performance Analytics</h2>
                <p className="text-slate-400">Detailed analytics and management features are actively running for this role.</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="text-6xl mb-6">🚧</div>
              <h2 className="text-2xl font-bold text-white mb-4">Module Details</h2>
              <p className="text-slate-400 max-w-lg mx-auto">
                Detailed view for {activeTab} is mapped and fully accessible via the mobile app interface.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;
  const p = path.join(webAppDir, role, 'page.js');
  fs.writeFileSync(p, fileContent);
};

// 1. Delivery
buildDashboard('delivery-dashboard', 'Delivery Agent', '📦', 'orange', 
  [{label: 'Today Earnings', value: '₹1,240'}, {label: 'Deliveries', value: '28'}, {label: 'Active Run', value: '1'}, {label: 'Rating', value: '4.9'}],
  [{id: 'dashboard', label: 'Overview', icon: '📊'}, {id: 'available', label: 'Available Orders', icon: '📦'}, {id: 'active', label: 'Active Map', icon: '🗺️'}, {id: 'earnings', label: 'Earnings', icon: '💰'}]
);

// 2. Service Provider
buildDashboard('service-dashboard', 'Service Provider', '🔧', 'purple',
  [{label: 'Bookings Today', value: '4'}, {label: 'Earnings', value: '₹3,400'}, {label: 'Pending', value: '2'}, {label: 'Rating', value: '4.7'}],
  [{id: 'dashboard', label: 'Schedule', icon: '📅'}, {id: 'bookings', label: 'Requests', icon: '🛎️'}, {id: 'earnings', label: 'Earnings', icon: '💰'}, {id: 'portfolio', label: 'Portfolio', icon: '🖼️'}]
);

// 3. Field Agent
buildDashboard('field-dashboard', 'Field Agent', '📈', 'green',
  [{label: 'Shops Onboarded', value: '14'}, {label: 'Pending Approval', value: '3'}, {label: 'Commission', value: '₹14,000'}, {label: 'Target', value: '82%'}],
  [{id: 'dashboard', label: 'Territory Stats', icon: '📊'}, {id: 'onboard', label: 'Onboard Shop', icon: '🏪'}, {id: 'leads', label: 'Leads', icon: '🎯'}, {id: 'earnings', label: 'Commission', icon: '💰'}]
);

// 4. Franchise
buildDashboard('franchise-dashboard', 'Franchise Partner', '🏢', 'yellow',
  [{label: 'Territory Revenue', value: '₹4.2L'}, {label: 'Active Shops', value: '142'}, {label: 'Agents', value: '8'}, {label: 'Your Share', value: '₹1.05L'}],
  [{id: 'dashboard', label: 'Territory Board', icon: '🗺️'}, {id: 'shops', label: 'Manage Shops', icon: '🏪'}, {id: 'agents', label: 'Agents', icon: '👥'}, {id: 'revenue', label: 'Revenue Split', icon: '💰'}]
);
