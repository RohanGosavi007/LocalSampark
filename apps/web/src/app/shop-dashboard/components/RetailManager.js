import React, { useState } from 'react';

export default function RetailManager({ shop }) {
  const [activeTab, setActiveTab] = useState('ocr_orders');
  
  // Dummy Data for deep implementation
  const [ocrOrders, setOcrOrders] = useState([
    { id: 'OCR001', customer: 'Mrs. Sharma', listImage: '/placeholder.jpg', itemsText: '1 kg sugar\n2 packets milk\n1 bread', status: 'Pending Review' },
    { id: 'OCR002', customer: 'Raju', listImage: '/placeholder.jpg', itemsText: '5 kg rice\n1 kg dal\n2 soap', status: 'Quote Sent' }
  ]);

  const [products, setProducts] = useState([
    { id: 'p1', name: 'Aashirvaad Atta 5kg', price: 250, stock: 45, dietary: ['Veg'] },
    { id: 'p2', name: 'Amul Milk 1L', price: 68, stock: 120, dietary: ['Veg'] }
  ]);

  const tabs = [
    { id: 'ocr_orders', label: '📸 Smart List (OCR) Orders' },
    { id: 'live_orders', label: 'Live Online Orders' },
    { id: 'kds', label: 'Kitchen Display (KDS)' },
    { id: 'pos', label: 'In-Store POS' },
    { id: 'inventory', label: 'Products & Inventory' },
    { id: 'analytics', label: '📊 Analytics & Revenue' },
    { id: 'combos', label: 'Combo Builder' },
    { id: 'table_res', label: 'Table Reservations' },
    { id: 'b2b', label: 'B2B Wholesale' },
    { id: 'pharmacy', label: 'Prescription Vault (E-Vault)' }
  ];

  return (
    <div className="retail-manager glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Retail & F&B Manager</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage products, Smart OCR lists, restaurants, and inventory</p>
        </div>
        <button className="btn btn-secondary">POS Terminal</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button 
            key={t.id} 
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(t.id)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'ocr_orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📸 Smart List (OCR) Orders
                <span className="badge" style={{ background: '#ef4444', color: 'white' }}>{ocrOrders.filter(o => o.status === 'Pending Review').length} New</span>
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Customers uploaded handwritten lists. Map them to your products and send a quote.</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {ocrOrders.map(order => (
              <div key={order.id} style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <strong>Order #{order.id}</strong>
                  <span className="badge" style={{ background: order.status === 'Pending Review' ? '#ef4444' : '#3b82f6', color: 'white' }}>{order.status}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
                    <span style={{ color: '#64748b' }}>[Handwritten Image]</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ marginBottom: '0.5rem' }}>OCR Output:</h5>
                    <pre style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '0.25rem', color: '#333' }}>
                      {order.itemsText}
                    </pre>
                  </div>
                </div>
                {order.status === 'Pending Review' && (
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Review & Send Quote</button>
                )}
                {order.status === 'Quote Sent' && (
                  <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>Waiting for Customer</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Products & Inventory</h3>
            <button className="btn btn-primary">+ Add Product</button>
          </div>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '1rem 0' }}>Name</th>
                <th>Dietary Tags</th>
                <th>Price</th>
                <th>Stock / Fast-Toggle</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem 0' }}>{p.name}</td>
                  <td>
                    {p.dietary.map(d => <span key={d} className="badge" style={{ background: '#10b981', color: 'white', marginRight: '0.25rem', fontSize: '0.7rem' }}>{d}</span>)}
                  </td>
                  <td>₹{p.price}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ minWidth: '40px', fontWeight: 'bold' }}>{p.stock > 0 ? p.stock : 'Out'}</span>
                      <button 
                        onClick={() => {
                          const newProducts = products.map(prod => {
                            if (prod.id === p.id) {
                              return { ...prod, stock: prod.stock > 0 ? 0 : 50 }; // Toggle stock simulation
                            }
                            return prod;
                          });
                          setProducts(newProducts);
                          // Trigger Instant Redis Cache Invalidation
                          console.log('Redis cache invalidated for shop products');
                        }}
                        style={{
                          width: '40px', height: '22px', borderRadius: '11px', 
                          background: p.stock > 0 ? 'var(--success)' : 'var(--border)', 
                          position: 'relative', cursor: 'pointer', border: 'none', transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                          position: 'absolute', top: '2px', left: p.stock > 0 ? '20px' : '2px', transition: 'all 0.3s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                      </button>
                    </div>
                  </td>
                  <td><button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Other tabs logic... */}
      {activeTab === 'analytics' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Revenue & Analytics Dashboard</h3>
            <select className="btn btn-secondary" style={{ padding: '0.5rem' }}>
              <option>This Week</option>
              <option>This Month</option>
              <option>Year to Date</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gross Revenue</p>
              <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>₹1,24,500</h2>
              <p style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 'bold' }}>+12% vs last week</p>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Orders</p>
              <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>342</h2>
              <p style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 'bold' }}>+5% vs last week</p>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{shop?.archetype === 'restaurant' ? 'Table Occupancy' : 'Avg Order Value'}</p>
              <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{shop?.archetype === 'restaurant' ? '78%' : '₹364'}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Steady performance</p>
            </div>
          </div>
          
          <div className="glass-card" style={{ padding: '2rem', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background-alt)' }}>
            <p style={{ color: 'var(--text-muted)' }}>[ Interactive Chart.js Area: Daily Sales Breakdown ]</p>
          </div>
        </div>
      )}

    </div>
  );
}
