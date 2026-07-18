const fs = require('fs');
const path = require('path');

// 1. Extract admin tabs
const adminPage = fs.readFileSync('apps/admin/src/app/page.js', 'utf8');
const tabMatches = adminPage.match(/activeTab\s*===?\s*['"]([^'"]+)['"]/g) || [];
const tabs = [...new Set(tabMatches.map(t => t.match(/['"]([^'"]+)['"]/)?.[1]).filter(Boolean))];
console.log('=== ADMIN PANEL TABS ===');
tabs.forEach(t => console.log('  - ' + t));

// 2. Check setActiveTab calls (sidebar menu items)
const sidebarTabs = adminPage.match(/setActiveTab\(['"]([^'"]+)['"]\)/g) || [];
const sidebarTabNames = [...new Set(sidebarTabs.map(t => t.match(/['"]([^'"]+)['"]/)?.[1]).filter(Boolean))];
console.log('\n=== SIDEBAR MENU ITEMS ===');
sidebarTabNames.forEach(t => console.log('  - ' + t));

// 3. Check which tabs have render content vs just header
console.log('\n=== TABS WITH RENDER SECTIONS ===');
tabs.forEach(tab => {
  const hasContent = adminPage.includes(`activeTab === '${tab}'`) || adminPage.includes(`activeTab === "${tab}"`);
  const contentAfter = adminPage.indexOf(`activeTab === '${tab}'`);
  console.log(`  ${tab}: ${hasContent ? 'HAS CONTENT' : 'MISSING CONTENT'} (position: ${contentAfter})`);
});

// 4. Check for TODO/FIXME/HACK in admin
const todoMatches = adminPage.match(/(TODO|FIXME|HACK|PLACEHOLDER|stub|dummy|hardcod)/gi) || [];
console.log('\n=== ADMIN TODOs/FIXMEs ===');
console.log('  Count:', todoMatches.length);
todoMatches.slice(0, 10).forEach(m => console.log('  - ' + m));

console.log('\n=== ADMIN PAGE SIZE ===');
console.log('  Lines:', adminPage.split('\n').length);
console.log('  Bytes:', adminPage.length);
