const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/page.js');
const tabsDir = path.join(__dirname, '../src/components/tabs');

if (!fs.existsSync(tabsDir)) fs.mkdirSync(tabsDir, { recursive: true });

let content = fs.readFileSync(pagePath, 'utf8');

const extractTab = (tabName, startMarker) => {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return null;
  
  const nextTabIndex = content.indexOf('{/* \u2500\u2500\u2500', startIndex + 50); // Using unicode for the em dash if needed, but we can just use "{/* ───"
  
  let endIndex = nextTabIndex;
  if (endIndex === -1) {
    endIndex = content.lastIndexOf(')}');
  }
  
  const tabContent = content.substring(startIndex, endIndex).trim();
  
  let cleaned = tabContent;
  const match = cleaned.match(/{activeTab === '[^']+' && \([\s\S]*$/);
  if (match) {
    cleaned = cleaned.replace(/{activeTab === '[^']+' && \(/, '');
    if (cleaned.endsWith(')}')) {
      cleaned = cleaned.slice(0, -2).trim();
    }
  }
  return cleaned;
};

const tabsToExtract = [
  { id: 'dashboard', componentName: 'DashboardTab', marker: '{/* \u2500\u2500\u2500 DASHBOARD TAB' },
  { id: 'users', componentName: 'UsersTab', marker: '{/* \u2500\u2500\u2500 USERS TAB' },
  { id: 'shops', componentName: 'ShopsTab', marker: '{/* \u2500\u2500\u2500 SHOPS TAB' },
  { id: 'franchise', componentName: 'FranchiseTab', marker: '{/* \u2500\u2500\u2500 FRANCHISE TAB' },
  { id: 'territory', componentName: 'TerritoryTab', marker: '{/* \u2500\u2500\u2500 TERRITORY TAB' }
];

let importsToAdd = [];

tabsToExtract.forEach(tab => {
  const jsx = extractTab(tab.id, tab.marker);
  if (jsx) {
    console.log("Extracted " + tab.id);
    
    const componentCode = "import React from 'react';\n" +
      "export default function " + tab.componentName + "(props) {\n" +
      "  const { \n" +
      "    summaryStats, pendingShops, platformShare, franchiseShare, agentShare, miscShare,\n" +
      "    franchisePartners, usersTotal, userSearch, users, usersPage, territorySearch, territoryFilter,\n" +
      "    selectedBulk, territories, properties, revenueChart, newZone, editTerritory, approveShop, rejectShop,\n" +
      "    fetchUsers, setUserSearch, changeUserRole, toggleUserStatus, setUsersPage, bulkToggle, setSelectedBulk\n" +
      "  } = props;\n\n" +
      "  // Mock components for inline usages\n" +
      "  const StatusBadge = ({status}) => <span className='badge'>{status}</span>;\n" +
      "  const Stat = ({label, value}) => <div className='stat'>{label}: {value}</div>;\n" +
      "  const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };\n" +
      "  const btnSuccess = { ...btnPrimary, background: '#10b981' };\n" +
      "  const btnDanger = { ...btnPrimary, background: '#ef4444' };\n" +
      "  const btnWarning = { ...btnPrimary, background: '#f97316' };\n" +
      "  const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };\n" +
      "  const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: '#fff' };\n\n" +
      "  return (\n" +
      "    " + jsx + "\n" +
      "  );\n" +
      "}\n";
      
    fs.writeFileSync(path.join(tabsDir, tab.componentName + '.js'), componentCode);
    
    const startIndex = content.indexOf(tab.marker);
    const nextTabIndex = content.indexOf('{/* \u2500\u2500\u2500', startIndex + 50);
    const endIndex = nextTabIndex !== -1 ? nextTabIndex : content.lastIndexOf(')}');
    
    const replacement = tab.marker + " \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}\n" +
                        "        {activeTab === '" + tab.id + "' && <" + tab.componentName + " {...props} />}\n        ";
    
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    
    importsToAdd.push("import " + tab.componentName + " from '../components/tabs/" + tab.componentName + "';");
  }
});

const propsString = "\n  const props = {\n" +
  "    summaryStats, pendingShops, platformShare, franchiseShare, agentShare, miscShare,\n" +
  "    franchisePartners, usersTotal, userSearch, users, usersPage, territorySearch, territoryFilter,\n" +
  "    selectedBulk, territories, properties, revenueChart, newZone, editTerritory,\n" +
  "    approveShop, rejectShop, fetchUsers, setUserSearch, changeUserRole, toggleUserStatus,\n" +
  "    setUsersPage, bulkToggle, setSelectedBulk\n" +
  "  };\n";

content = content.replace('return (', propsString + '\n  return (');

const lastImportIndex = content.lastIndexOf('import ');
const nextLineAfterImports = content.indexOf('\n', lastImportIndex) + 1;
content = content.slice(0, nextLineAfterImports) + importsToAdd.join('\n') + '\n' + content.slice(nextLineAfterImports);

fs.writeFileSync(pagePath, content);
console.log('Refactoring complete.');
