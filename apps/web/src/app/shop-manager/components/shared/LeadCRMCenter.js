'use client';
import React, { useState, useEffect } from 'react';
import OrderKanban from '@/components/ui/OrderKanban';
import { Phone, UserPlus, RefreshCw } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function LeadCRMCenter({ token, shopId }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLeadContent, setNewLeadContent] = useState('');
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/shops/my-shop/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Map backend lead status to frontend kanban ids if necessary
        const mappedLeads = data.leads.map(l => {
          const isManual = l.lead_type === 'MANUAL';
          let displayContact = isManual ? 'Manual Lead' : (l.customer_name || 'Unknown User');
          let displayPhone = isManual ? '' : (l.customer_phone || '');
          let displayContent = l.content || 'General Inquiry';

          if (isManual && l.content) {
            // Attempt to extract contact info if we formatted it like "(Contact: X, Phone: Y)"
            const match = l.content.match(/\(Contact: (.*?), Phone: (.*?)\)/);
            if (match) {
              displayContact = match[1];
              displayPhone = match[2];
              displayContent = l.content.replace(/\(Contact:.*?\)/, '').trim();
            }
          }

          return {
            ...l,
            id: l.id.toString(),
            status: l.lead_status.toLowerCase(),
            content: l.lead_type === 'FAVORITE' ? 'User favorited your shop' : 
                     l.lead_type === 'ABANDONED_CART' ? 'User abandoned their cart' : 
                     displayContent,
            contact: displayContact,
            phone: displayPhone
          };
        });
        setLeads(mappedLeads);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [token, shopId]);

  const columns = [
    { id: 'new', title: 'New Leads', color: '#ef4444' },
    { id: 'contacted', title: 'Contacted', color: '#f59e0b' },
    { id: 'converted', title: 'Converted/Won', color: '#10b981' }
  ];

  const handleStatusChange = async (itemId, newStatus) => {
    // Optimistic update
    setLeads(prev => prev.map(o => o.id === itemId ? { ...o, status: newStatus } : o));
    try {
      await fetch(`${API_BASE}/shops/my-shop/leads/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error('Failed to update lead status:', err);
      // Revert if failed
      fetchLeads();
    }
  };

  const handleAddManualLead = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/universal-catalog/${shopId}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          leadType: 'MANUAL',
          content: `${newLeadContent} (Contact: ${newLeadName}, Phone: ${newLeadPhone})`
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddLead(false);
        setNewLeadContent('');
        setNewLeadName('');
        setNewLeadPhone('');
        fetchLeads();
      } else {
        alert('Failed to add manual lead');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding manual lead');
    }
  };

  const renderCard = (lead) => (
    <div className="p-4 rounded-xl shadow-sm border border-border bg-background hover:border-blue-500 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
      <div className="flex justify-between items-start mb-2">
        <h4 style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>#{lead.id} • {lead.lead_type}</h4>
      </div>
      <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>{lead.content}</p>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: 600 }}>{lead.contact}</span>
        {lead.phone && (
          <div className="flex gap-2">
            <a href={`tel:${lead.phone}`} style={{ padding: '6px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', borderRadius: '8px', textDecoration: 'none' }}>
              <Phone size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus style={{ color: '#f59e0b' }} /> Lead CRM Center
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>Manage inquiries, favorites, and cart abandonments</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowAddLead(!showAddLead)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: showAddLead ? 'rgba(255,255,255,0.1)' : '#3b82f6', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            {showAddLead ? 'Cancel' : '+ Add Manual Lead'}
          </button>
          <button onClick={fetchLeads} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={16} /> Refresh Leads
          </button>
        </div>
      </div>

      {showAddLead && (
        <form onSubmit={handleAddManualLead} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Lead Name</label>
              <input required value={newLeadName} onChange={e=>setNewLeadName(e.target.value)} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Phone Number</label>
              <input required value={newLeadPhone} onChange={e=>setNewLeadPhone(e.target.value)} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Inquiry Details</label>
              <textarea required value={newLeadContent} onChange={e=>setNewLeadContent(e.target.value)} style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }} rows="2" />
            </div>
          </div>
          <button type="submit" style={{ padding: '10px 20px', background: '#22c55e', color: 'white', borderRadius: '8px', fontWeight: 600, width: '100%', border: 'none', cursor: 'pointer' }}>Save Lead</button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px' }}>Loading Leads CRM...</p>
        </div>
      ) : (
        <OrderKanban 
          columns={columns}
          items={leads}
          onStatusChange={handleStatusChange}
          renderItem={renderCard}
        />
      )}
    </div>
  );
}
