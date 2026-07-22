const fs = require('fs');
const path = require('path');

const tabs = [
  { name: 'WalletTab', endpoint: 'wallet/transactions', title: '💳 Wallet & Transactions', desc: 'Monitor platform wallet balances, process payouts to shops and agents, and resolve disputes.', columns: "['Transaction ID', 'User/Shop', 'Amount', 'Type', 'Status', 'Date', 'Actions']" },
  { name: 'CommunityTab', endpoint: 'community/posts', title: '📢 Community Moderation', desc: 'Moderate townsquare posts, announcements, and local discussions. Review reported content.', columns: "['Post ID', 'Author', 'Content Preview', 'Reports', 'Status', 'Date', 'Actions']" },
  { name: 'SocietyTab', endpoint: 'societies', title: '🏘️ Society Management', desc: 'Manage onboarded residential societies, verify committee members, and monitor society-specific activities.', columns: "['Society Name', 'Zone', 'Members', 'Admin', 'Status', 'Added On', 'Actions']" },
  { name: 'EventsTab', endpoint: 'events', title: '🎉 Event Management', desc: 'Review and approve local events, workshops, and gatherings proposed by users or shops.', columns: "['Event Title', 'Organizer', 'Date', 'Location', 'Attendees', 'Status', 'Actions']" },
  { name: 'MarketplaceTab', endpoint: 'marketplace/products', title: '🛒 Marketplace Audit', desc: 'Audit product listings from local shops, verify pricing, check image quality, and ensure category compliance.', columns: "['Product Name', 'Shop', 'Category', 'Price', 'Stock', 'Status', 'Actions']" },
  { name: 'MedicalTab', endpoint: 'medical/providers', title: '🏥 Medical & Health Services', desc: 'Manage registered health service providers, clinics. Verify medical practitioner credentials.', columns: "['Provider Name', 'Type', 'License', 'Zone', 'Status', 'Verified', 'Actions']" },
  { name: 'SubscriptionsTab', endpoint: 'subscriptions/plans', title: '📦 Subscription Plan Management', desc: 'Configure subscription tiers for shops and users, manage active plans.', columns: "['Plan Name', 'Type', 'Price', 'Billing Cycle', 'Active Users', 'Status', 'Actions']" },
  { name: 'PremiumTab', endpoint: 'premium/members', title: '👑 Premium Membership', desc: 'Manage premium shop listings, priority delivery memberships, and VIP user tiers.', columns: "['User/Shop', 'Tier', 'Valid Until', 'Amount Paid', 'Status', 'Auto-Renew', 'Actions']" },
  { name: 'SOSTab', endpoint: 'sos/alerts', title: '🚨 Emergency SOS Dashboard', desc: 'Monitor real-time SOS alerts from users, coordinate emergency responses with local contacts.', columns: "['Alert ID', 'User', 'Location', 'Time', 'Assigned To', 'Status', 'Actions']" },
  { name: 'CRMTab', endpoint: 'crm/campaigns', title: '📈 CRM & User Engagement', desc: 'Track user engagement metrics, manage push notification campaigns, and analyze retention.', columns: "['Campaign Name', 'Target Audience', 'Sent Date', 'Open Rate', 'Conversion', 'Status', 'Actions']" }
];

const template = (tab) => `import React, { useState, useEffect } from 'react';

const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: '#ef4444' };
const btnSuccess = { ...btnPrimary, background: '#10b981' };

export default function ${tab.name}({ API_BASE, authHeaders }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(\`\${API_BASE}/${tab.endpoint}?limit=50\`, { headers: authHeaders() });
      const data = await res.json();
      setDataList(data.data || data.items || data.records || (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>${tab.title}</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>${tab.desc}</p>
          </div>
          <button onClick={fetchData} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {${tab.columns}.map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dataList.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No data found.</td></tr>
              ) : dataList.map((item, i) => (
                <tr key={item.id || i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td colSpan={10} style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>Data row (ID: {item.id})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

const dir = path.join(__dirname, 'apps', 'admin', 'src', 'components', 'tabs');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

tabs.forEach(tab => {
  fs.writeFileSync(path.join(dir, tab.name + '.js'), template(tab));
  console.log('Created ' + tab.name + '.js');
});
