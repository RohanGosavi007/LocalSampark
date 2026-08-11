import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Tag, Clock, Upload, Sparkles, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/lib/api';

export default function UnifiedCatalogueManager({ token, shopId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState('physical_good'); // physical_good, service, job_card
  const [price, setPrice] = useState('');
  const [metadata, setMetadata] = useState([]); // Array of { key: '', value: '' }
  
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/universal-catalog/${shopId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId && token) {
      fetchItems();
    }
  }, [shopId, token]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      // Convert metadata array to object
      const metaObj = metadata.reduce((acc, curr) => {
        if (curr.key && curr.value) acc[curr.key] = curr.value;
        return acc;
      }, {});

      let url = `${API_BASE}/universal-catalog/${shopId}`;
      let method = 'POST';
      
      if (editingItemId) {
        url = `${API_BASE}/universal-catalog/item/${editingItemId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title, 
          description, 
          price: parseFloat(price), 
          item_type: itemType,
          metadata: metaObj
        })
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingItemId(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setItemType('physical_good');
    setMetadata([]);
  };

  const handleEditClick = (item) => {
    setTitle(item.title);
    setDescription(item.description || '');
    setPrice(item.price);
    setItemType(item.item_type || 'physical_good');
    
    // Parse metadata
    let metaArray = [];
    if (item.metadata) {
      try {
        const parsed = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
        metaArray = Object.entries(parsed).map(([k, v]) => ({ key: k, value: v }));
      } catch (e) {
        console.error("Failed to parse metadata", e);
      }
    }
    setMetadata(metaArray);
    
    setEditingItemId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await fetch(`${API_BASE}/universal-catalog/item/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) return alert('CSV must have headers and at least one row');
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const itemsToUpload = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const item = {};
        const metaObj = {};
        
        headers.forEach((h, index) => {
          if (['title', 'description', 'item_type', 'price'].includes(h)) {
            item[h] = h === 'price' ? parseFloat(values[index]) : values[index];
          } else if (values[index]) {
            metaObj[h] = values[index];
          }
        });
        
        if (Object.keys(metaObj).length > 0) item.metadata = metaObj;
        if (item.title) itemsToUpload.push(item);
      }

      try {
        const res = await fetch(`${API_BASE}/universal-catalog/${shopId}/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ items: itemsToUpload })
        });
        const data = await res.json();
        if (data.success) {
          alert(`Successfully uploaded ${data.addedCount} items!`);
          fetchItems();
        } else {
          alert('Failed to upload: ' + data.message);
        }
      } catch (err) {
        console.error(err);
        alert('Error uploading CSV');
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateAI = async (e) => {
    e.preventDefault();
    if (!title) return alert('Please enter a Title first so the AI knows what to generate!');
    
    try {
      setIsGeneratingAI(true);
      const res = await fetch(`${API_BASE}/universal-catalog/ai/generate-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          itemType,
          attributes: metadata.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})
        })
      });
      const data = await res.json();
      if (data.success) {
        setDescription(data.description);
      } else {
        alert('Failed to generate description: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to AI service.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package style={{ color: '#3b82f6' }} /> Universal Catalogue
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>Manage products, services, and job cards.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={16} /> Bulk Upload CSV
            <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
          </label>
          <button 
            onClick={() => {
              if (showAddForm) {
                resetForm();
              } else {
                setShowAddForm(true);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: showAddForm ? 'rgba(255,255,255,0.1)' : '#3b82f6', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            {showAddForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Item/Service</>}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddItem} style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Item Name / Service Title</label>
              <input required value={title} onChange={e=>setTitle(e.target.value)} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Type</label>
              <select value={itemType} onChange={e=>setItemType(e.target.value)} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}>
                <option value="physical_good">Physical Good (Retail)</option>
                <option value="service">Service / Booking</option>
                <option value="job_card">Job Card / Repair</option>
              </select>
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Description</label>
                <button type="button" onClick={handleGenerateAI} disabled={isGeneratingAI} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #a855f7, #ec4899)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: isGeneratingAI ? 'not-allowed' : 'pointer', opacity: isGeneratingAI ? 0.7 : 1 }}>
                  {isGeneratingAI ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                  {isGeneratingAI ? 'Generating...' : 'AI Enhance'}
                </button>
              </div>
              <textarea 
                value={description} onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', minHeight: '80px' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Price (₹)</label>
              <input required type="number" value={price} onChange={e=>setPrice(e.target.value)} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }} />
            </div>
            
            {/* Dynamic Metadata Builder */}
            <div style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Dynamic Attributes / Specs</label>
                <button type="button" onClick={() => setMetadata([...metadata, { key: '', value: '' }])} style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>+ Add Spec</button>
              </div>
              {metadata.map((meta, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input placeholder="Key (e.g. Warranty)" value={meta.key} onChange={(e) => { const m = [...metadata]; m[i].key = e.target.value; setMetadata(m); }} style={{ flex: 1, padding: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '12px' }} />
                  <input placeholder="Value (e.g. 1 Year)" value={meta.value} onChange={(e) => { const m = [...metadata]; m[i].value = e.target.value; setMetadata(m); }} style={{ flex: 1, padding: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '12px' }} />
                  <button type="button" onClick={() => { const m = [...metadata]; m.splice(i, 1); setMetadata(m); }} style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '6px' }}><Trash2 size={14} /></button>
                </div>
              ))}
              {metadata.length === 0 && <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>No dynamic attributes added.</p>}
            </div>

          </div>
          <button type="submit" style={{ padding: '12px 20px', background: editingItemId ? '#f59e0b' : '#22c55e', color: 'white', borderRadius: '8px', fontWeight: 700, width: '100%', fontSize: '14px', cursor: 'pointer', border: 'none', transition: 'all 0.2s ease' }}>
            {editingItemId ? 'Update Item' : 'Save to Catalogue'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Loading catalogue...</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Package size={40} style={{ color: '#475569', margin: '0 auto 12px' }} />
          <p style={{ color: '#94a3b8' }}>Your catalogue is empty. Add your first product or service to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          <AnimatePresence>
            {items.map(item => (
              <motion.div 
                key={item.id} 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}
              >
                {/* Micro-interaction hover gradient could go here via styled components, but we use simple styling */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>{item.title}</h3>
                  <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '20px', background: item.item_type === 'physical_good' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)', color: item.item_type === 'physical_good' ? '#93c5fd' : '#d8b4fe' }}>
                    {item.item_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px', minHeight: '40px', lineHeight: '1.5' }}>{item.description || 'No description provided'}</p>
                
                {/* Render dynamic metadata tags */}
                {item.metadata && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {Object.entries(typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata).map(([k, v]) => (
                      <span key={k} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', color: '#cbd5e1' }}>
                        <strong style={{ color: '#94a3b8' }}>{k}:</strong> {v}
                      </span>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e' }}>₹{item.price}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEditClick(item)} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa', cursor: 'pointer', transition: 'all 0.2s' }}><Edit size={14} /></button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', cursor: 'pointer', transition: 'all 0.2s' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
