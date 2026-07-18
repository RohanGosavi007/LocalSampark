'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const CATEGORIES = ['All', 'Electronics', 'Furniture', 'Home Appliances', 'Sports', 'Books', 'Clothing', 'Vehicles', 'Kitchen'];

const ITEMS = [
  { id: 1, title: 'Hero Bicycle (24T) — Barely Used', price: 3500, category: 'Sports', condition: 'Good', icon: '🚲', seller: 'Rahul K.', zone: 'Dhanori', time: '2 hrs ago', views: 42 },
  { id: 2, title: 'Wooden Study Table + Ergonomic Chair', price: 2200, category: 'Furniture', condition: 'Like New', icon: '🪑', seller: 'Meera S.', zone: 'Viman Nagar', time: '5 hrs ago', views: 28 },
  { id: 3, title: 'Sony ExtraBass Bluetooth Speaker', price: 1500, category: 'Electronics', condition: 'Fair', icon: '🔊', seller: 'Amit P.', zone: 'Dhanori', time: '1 day ago', views: 71 },
  { id: 4, title: 'LG Washing Machine 6.5Kg — Excellent', price: 9000, category: 'Home Appliances', condition: 'Excellent', icon: '🫧', seller: 'Sunita R.', zone: 'Kharadi', time: '2 days ago', views: 56 },
  { id: 5, title: 'Microwave Oven (Samsung 23L)', price: 4500, category: 'Kitchen', condition: 'Good', icon: '📦', seller: 'Priya N.', zone: 'Baner', time: '3 days ago', views: 33 },
  { id: 6, title: 'MTB Trek 3-speed Mountain Bike', price: 7500, category: 'Sports', condition: 'Good', icon: '🚵', seller: 'Sanjay V.', zone: 'Dhanori', time: '4 days ago', views: 19 },
  { id: 7, title: 'iPhone 12 — Pristine (64GB)', price: 22000, category: 'Electronics', condition: 'Like New', icon: '📱', seller: 'Kavita M.', zone: 'Kalyani Nagar', time: '5 days ago', views: 145 },
  { id: 8, title: 'Ikea Kallax Shelf — 4 Cubes', price: 1800, category: 'Furniture', condition: 'Good', icon: '📚', seller: 'Rohan D.', zone: 'Aundh', time: '6 days ago', views: 22 },
];

const conditionColor = { 'Like New': '#10b981', 'Excellent': '#4f46e5', 'Good': '#f97316', 'Fair': '#f59e0b' };

export default function MarketplacePage() {
  const [selectedCat, setSelectedCat] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQ, setSearchQ] = useState('');
  const [maxPrice, setMaxPrice] = useState(50000);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '', condition: 'Good', desc: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);

  const filtered = ITEMS
    .filter(i => selectedCat === 'All' || i.category === selectedCat)
    .filter(i => i.title.toLowerCase().includes(searchQ.toLowerCase()) || i.seller.toLowerCase().includes(searchQ.toLowerCase()))
    .filter(i => i.price <= maxPrice)
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'popular') return b.views - a.views;
      return 0; // newest
    });

  const handlePost = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setShowForm(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '4rem 0' }}>
        <div className="container">

          {/* Page Header */}
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span className="badge badge-primary" style={{ marginBottom: '1rem' }}>Pillar 5 — Buy & Sell</span>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
              Neighborhood <span className="gradient-text">Marketplace</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto 2rem' }}>
              Buy &amp; sell pre-loved items with verified neighbors. Zero platform fee, 100% direct deals.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Post an Item</button>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                🔒 OTP-verified sellers only
              </span>
            </div>
          </div>

          {submitted && (
            <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: '0.75rem', padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <div>
                <strong style={{ color: 'var(--accent)' }}>Listing submitted!</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Your item will be live after quick moderation (usually &lt;1 hour).</p>
              </div>
            </div>
          )}

          {/* Post Item Modal */}
          {showForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="glass-card" style={{ width: '100%', maxWidth: '560px', padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Post a New Item</h2>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
                <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Item Title *</label>
                    <input type="text" className="form-input" placeholder="e.g. Hero Bicycle 24T" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Asking Price (₹) *</label>
                      <input type="number" className="form-input" placeholder="e.g. 2500" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Category *</label>
                      <select className="form-input" required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                        <option value="">Select</option>
                        {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Condition *</label>
                    <select className="form-input" value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value })}>
                      {['Like New', 'Excellent', 'Good', 'Fair'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows={3} placeholder="Describe the item, usage, reason for selling..." value={formData.desc} onChange={e => setFormData({ ...formData, desc: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">WhatsApp / Contact *</label>
                    <input type="tel" className="form-input" placeholder="+91 XXXXX XXXXX" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1rem' }}>Submit Listing</button>
                </form>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2.5rem', alignItems: 'start' }}>
            {/* Sidebar */}
            <div className="glass-card" style={{ padding: '1.75rem', position: 'sticky', top: '6rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🔍 Search</h3>
              <input type="text" className="form-input" placeholder="Item or seller name..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ marginBottom: '1.5rem' }} />

              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📂 Category</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setSelectedCat(cat)} style={{
                    background: selectedCat === cat ? 'var(--primary)' : 'transparent',
                    color: selectedCat === cat ? 'white' : 'var(--text-muted)',
                    border: 'none', borderRadius: '0.5rem', padding: '0.45rem 0.75rem',
                    textAlign: 'left', cursor: 'pointer', fontWeight: selectedCat === cat ? 700 : 400,
                    fontSize: '0.88rem', transition: 'all 0.2s'
                  }}>{cat}</button>
                ))}
              </div>

              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>💰 Max Price: ₹{maxPrice.toLocaleString()}</h3>
              <input type="range" min={500} max={50000} step={500} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <span>₹500</span><span>₹50,000</span>
              </div>
            </div>

            {/* Grid */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{filtered.length} items found</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="form-input" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Viewed</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
                  <h3>No items match your filters</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Try adjusting the category or price range.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  {filtered.map(item => (
                    <div key={item.id} className="glass-card card-3d" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
                      {/* Image placeholder */}
                      <div style={{ height: '150px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', position: 'relative' }}>
                        {item.icon}
                        <span style={{
                          position: 'absolute', top: '0.75rem', right: '0.75rem',
                          background: conditionColor[item.condition] + '22',
                          color: conditionColor[item.condition],
                          padding: '0.2rem 0.5rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 700
                        }}>{item.condition}</span>
                        <span style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '50px', fontSize: '0.7rem' }}>👁 {item.views}</span>
                      </div>
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span className="badge badge-secondary" style={{ fontSize: '0.7rem', alignSelf: 'flex-start', marginBottom: '0.5rem' }}>{item.category}</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem', lineHeight: 1.3 }}>{item.title}</h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>📍 {item.zone} · {item.time}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          <h2 style={{ color: 'var(--primary)', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>₹{item.price.toLocaleString()}</h2>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>By {item.seller}</span>
                        </div>
                        <a href="/download" className="btn btn-primary" style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', marginTop: '1rem' }}>
                          💬 Chat with Seller
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
