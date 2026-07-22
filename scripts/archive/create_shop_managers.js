const fs = require('fs');
const path = require('path');

const components = [
  { name: 'ShopProductsManager', title: '📦 Products & Services', endpoint: 'products', columns: "['Name', 'Category', 'Price', 'Stock', 'Status', 'Actions']" },
  { name: 'ShopStaffManager', title: '👥 Staff Management', endpoint: 'staff', columns: "['Name', 'Role', 'Phone', 'Status', 'Actions']" },
  { name: 'ShopReviewsManager', title: '⭐ Customer Reviews', endpoint: 'reviews', columns: "['Customer', 'Rating', 'Review', 'Date', 'Reply', 'Actions']" },
  { name: 'ShopAnalyticsManager', title: '📊 Analytics & Insights', endpoint: 'analytics', columns: "['Metric', 'Value', 'Trend']" },
  { name: 'ShopSettingsManager', title: '⚙️ Shop Settings', endpoint: 'settings', columns: "['Setting', 'Value', 'Edit']" },
];

const template = (comp) => `import React, { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';

export default function ${comp.name}({ token, shopId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(\`\${API_BASE}/shops/\${shopId}/${comp.endpoint}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      setItems(data.data || data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [shopId, token]);

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }}>${comp.title}</h3>
        <button onClick={fetchItems} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {${comp.columns}.map(h => <th key={h} style={{ textAlign: 'left', padding: '12px', color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No data available.</td></tr>
            ) : items.map((item, i) => (
              <tr key={item.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td colSpan={6} style={{ padding: '12px', color: '#cbd5e1' }}>Item ID: {item.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

const dir = path.join(__dirname, 'apps', 'web', 'src', 'app', 'shop-manager', 'components', 'shared');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

components.forEach(comp => {
  fs.writeFileSync(path.join(dir, comp.name + '.js'), template(comp));
  console.log('Created ' + comp.name + '.js');
});
