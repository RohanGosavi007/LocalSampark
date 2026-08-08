'use client';
import React, { useState } from 'react';
import {
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight,
  Package, AlertTriangle, Filter, Upload, X, Check, Tag
} from 'lucide-react';

const DEMO_INVENTORY = [
  { id: 'p1', name: 'Aashirvaad Atta 5kg', category: 'Grains', price: 250, salePrice: 239, stock: 45, unit: 'bag', dietary: ['Veg'], inStock: true, lowStockAt: 10, image: '' },
  { id: 'p2', name: 'Amul Milk 1L', category: 'Dairy', price: 68, salePrice: null, stock: 120, unit: 'pkt', dietary: ['Veg'], inStock: true, lowStockAt: 20, image: '' },
  { id: 'p3', name: 'Tata Salt 1kg', category: 'Spices', price: 22, salePrice: null, stock: 2, unit: 'pkt', dietary: ['Veg'], inStock: true, lowStockAt: 10, image: '' },
  { id: 'p4', name: 'Sunflower Oil 1L', category: 'Oil', price: 140, salePrice: 129, stock: 0, unit: 'btl', dietary: ['Veg'], inStock: false, lowStockAt: 5, image: '' },
  { id: 'p5', name: 'Britannia Bread', category: 'Bakery', price: 45, salePrice: null, stock: 20, unit: 'pkt', dietary: ['Veg'], inStock: true, lowStockAt: 5, image: '' },
  { id: 'p6', name: 'Parle-G Biscuits', category: 'Snacks', price: 20, salePrice: null, stock: 200, unit: 'pkt', dietary: ['Veg'], inStock: true, lowStockAt: 30, image: '' },
  { id: 'p7', name: 'Chicken Breast 500g', category: 'Meat', price: 280, salePrice: 260, stock: 15, unit: 'pkt', dietary: ['Non-Veg'], inStock: true, lowStockAt: 5, image: '' },
];

const CATEGORIES = ['Grains', 'Dairy', 'Spices', 'Oil', 'Bakery', 'Snacks', 'Meat', 'Beverages', 'Care', 'Cleaning', 'Instant'];
const UNITS = ['pkt', 'kg', 'g', 'L', 'ml', 'btl', 'bag', 'box', 'bar', 'tube', 'pcs', 'nos'];
const DIETARY_OPTIONS = ['Veg', 'Non-Veg', 'Vegan', 'Jain', 'Gluten-Free'];

const EMPTY_PRODUCT = { name: '', category: 'Grains', price: '', salePrice: '', stock: '', unit: 'pkt', dietary: ['Veg'], inStock: true, lowStockAt: 10, image: '' };

export default function ShopProductsManager({ token, shopId }) {
  const [products, setProducts] = useState(DEMO_INVENTORY);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterStock, setFilterStock] = useState('all'); // all | instock | outofstock | lowstock
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openAdd = () => { setForm(EMPTY_PRODUCT); setEditingProduct(null); setShowModal(true); };
  const openEdit = (p) => { setForm({ ...p }); setEditingProduct(p.id); setShowModal(true); };

  const handleFormChange = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleDietary = (tag) => {
    setForm(f => ({
      ...f,
      dietary: f.dietary.includes(tag) ? f.dietary.filter(d => d !== tag) : [...f.dietary, tag]
    }));
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct ? { ...form, id: editingProduct } : p));
    } else {
      setProducts(prev => [...prev, { ...form, id: `p${Date.now()}` }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeleteConfirm(null);
  };

  const toggleStock = (id) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, inStock: !p.inStock } : p));
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || p.category === filterCat;
    const matchStock = filterStock === 'all'
      ? true
      : filterStock === 'instock' ? p.inStock && p.stock > 0
      : filterStock === 'outofstock' ? !p.inStock || p.stock === 0
      : p.stock <= p.lowStockAt && p.stock > 0;
    return matchSearch && matchCat && matchStock;
  });

  const lowStockCount = products.filter(p => p.stock <= p.lowStockAt && p.stock > 0 && p.inStock).length;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} style={{ color: 'var(--primary)' }} /> Products & Inventory
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{products.length} total · {products.filter(p => p.inStock).length} active · {lowStockCount} low stock</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Upload size={15} /> Import CSV
          </button>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', border: 'none', borderRadius: '0.625rem', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.75rem', marginBottom: '1.25rem' }}>
          <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}><strong>{lowStockCount} products</strong> are running low on stock. Reorder soon.</span>
          <button onClick={() => setFilterStock('lowstock')} style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>View Low Stock →</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '0.625rem', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', cursor: 'pointer', fontSize: '0.875rem' }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStock} onChange={e => setFilterStock(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', cursor: 'pointer', fontSize: '0.875rem' }}>
          <option value="all">All Stock</option>
          <option value="instock">In Stock</option>
          <option value="outofstock">Out of Stock</option>
          <option value="lowstock">⚠ Low Stock</option>
        </select>
      </div>

      {/* Product Table */}
      <div style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
              {['Product', 'Category', 'Price', 'Sale Price', 'Stock', 'Tags', 'Live', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No products found.</td></tr>
            ) : filtered.map((p, i) => {
              const isLow = p.stock <= p.lowStockAt && p.stock > 0 && p.inStock;
              return (
                <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', background: isLow ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{p.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.unit}</div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ padding: '0.2rem 0.625rem', borderRadius: '2rem', background: 'var(--primary-light,rgba(99,102,241,0.1))', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>{p.category}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 700 }}>₹{p.price}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {p.salePrice ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>₹{p.salePrice}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontWeight: 700, color: p.stock === 0 ? 'var(--error)' : isLow ? '#f59e0b' : 'var(--text)' }}>
                      {p.stock === 0 ? 'Out of Stock' : isLow ? `⚠ ${p.stock}` : p.stock}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {p.dietary.map(d => (
                        <span key={d} style={{ padding: '0.1rem 0.4rem', borderRadius: '2rem', background: d === 'Veg' ? 'rgba(16,185,129,0.1)' : d === 'Non-Veg' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', color: d === 'Veg' ? '#10b981' : d === 'Non-Veg' ? '#ef4444' : 'var(--primary)', fontSize: '0.7rem', fontWeight: 600 }}>{d}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <button onClick={() => toggleStock(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.inStock ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.8rem' }}>
                      {p.inStock ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      {p.inStock ? 'Live' : 'Off'}
                    </button>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEdit(p)} style={{ padding: '0.3rem 0.625rem', border: '1px solid var(--border)', borderRadius: '0.4rem', background: 'transparent', cursor: 'pointer', color: 'var(--primary)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(p.id)} style={{ padding: '0.3rem 0.625rem', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.4rem', background: 'transparent', cursor: 'pointer', color: 'var(--error)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '2rem', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Product Name *', key: 'name', type: 'text', full: true },
                { label: 'Price (₹) *', key: 'price', type: 'number' },
                { label: 'Sale Price (₹)', key: 'salePrice', type: 'number' },
                { label: 'Stock Qty', key: 'stock', type: 'number' },
                { label: 'Low Stock Alert At', key: 'lowStockAt', type: 'number' },
                { label: 'Image URL', key: 'image', type: 'text', full: true },
              ].map(field => (
                <div key={field.key} style={{ gridColumn: field.full ? '1/-1' : 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{field.label}</label>
                  <input type={field.type} value={form[field.key] || ''} onChange={e => handleFormChange(field.key, e.target.value)}
                    style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem', outline: 'none' }} />
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category</label>
                <select value={form.category} onChange={e => handleFormChange('category', e.target.value)}
                  style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Unit</label>
                <select value={form.unit} onChange={e => handleFormChange('unit', e.target.value)}
                  style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem' }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Dietary Tags</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {DIETARY_OPTIONS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleDietary(tag)} style={{
                      padding: '0.3rem 0.75rem', borderRadius: '2rem', border: '1px solid',
                      borderColor: form.dietary.includes(tag) ? 'var(--primary)' : 'var(--border)',
                      background: form.dietary.includes(tag) ? 'var(--primary)' : 'transparent',
                      color: form.dietary.includes(tag) ? 'white' : 'var(--text-muted)',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                    }}>{tag}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.75rem', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} style={{ flex: 2, padding: '0.75rem', border: 'none', borderRadius: '0.75rem', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>
                <Check size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />{editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '1.25rem', padding: '2rem', maxWidth: 380, width: '90%', textAlign: 'center' }}>
            <Trash2 size={40} style={{ color: 'var(--error)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Delete Product?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>This action cannot be undone. The product will be permanently removed.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.75rem', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '0.75rem', background: 'var(--error)', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
