'use client';
import React, { useState, useEffect } from 'react';
import { ShoppingBag, ShieldCheck, AlertCircle, DollarSign, RefreshCw, CheckCircle, XCircle, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function MarketplaceAdminDashboard() {
  const [activeTab, setActiveTab] = useState('escrows');
  const [stats, setStats] = useState({ total_listings: 0, active_auctions: 0, escrows_held_count: 0, escrows_held_amount: 0, active_disputes: 0 });
  const [escrows, setEscrows] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/marketplace/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEscrows = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/marketplace/escrows`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setEscrows(data.escrows);
    } catch (err) {
      toast.error('Failed to load escrows');
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/marketplace/listings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setListings(data.listings);
    } catch (err) {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'escrows') fetchEscrows();
    if (activeTab === 'listings') fetchListings();
  }, [activeTab]);

  const resolveEscrow = async (id, resolution) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/marketplace/escrows/${id}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchEscrows();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to resolve escrow');
    }
  };

  const updateListingStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/marketplace/listings/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchListings();
      }
    } catch (err) {
      toast.error('Failed to update listing');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <ShoppingBag className="text-cyan-500" /> Marketplace & Escrow Command Center
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Audit peer-to-peer item listings, live auctions, and manage dispute resolutions.</p>
        </div>
        <button onClick={() => { fetchStats(); if (activeTab==='escrows') fetchEscrows(); else fetchListings(); }} className="px-4 py-2 rounded-xl flex items-center gap-2 border font-medium text-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Total Active Listings</span>
          <p className="text-2xl font-black text-cyan-400">{stats.total_listings}</p>
        </div>
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Live Auctions</span>
          <p className="text-2xl font-black text-amber-400">{stats.active_auctions}</p>
        </div>
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Escrow Funds Held</span>
          <p className="text-2xl font-black text-emerald-400">₹{(stats.escrows_held_amount || 0).toLocaleString()}</p>
          <span className="text-[10px] text-slate-500">{stats.escrows_held_count} transactions</span>
        </div>
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Active Disputes</span>
          <p className="text-2xl font-black text-red-400">{stats.active_disputes}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={() => setActiveTab('escrows')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'escrows' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          🛡️ Escrow Safe-Pay ({escrows.length})
        </button>
        <button onClick={() => setActiveTab('listings')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'listings' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          📦 Product Listings ({listings.length})
        </button>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading Marketplace Data...</div>
      ) : activeTab === 'escrows' ? (
        <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-bold text-white mb-4">Escrow Audit Ledger & Dispute Control</h2>
          {escrows.length === 0 ? (
            <p className="text-slate-500 text-sm">No escrow transactions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b text-xs uppercase font-bold text-slate-400" style={{ borderColor: 'var(--border-color)' }}>
                  <tr>
                    <th className="py-3 px-4">Item / Listing</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Buyer</th>
                    <th className="py-3 px-4">Seller</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {escrows.map(e => (
                    <tr key={e.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white">{e.listing_title || 'Direct Payment'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">₹{e.amount}</td>
                      <td className="py-3 px-4">{e.buyer_name || 'Buyer'} <span className="text-[10px] block text-slate-500">{e.buyer_phone}</span></td>
                      <td className="py-3 px-4">{e.seller_name || 'Seller'} <span className="text-[10px] block text-slate-500">{e.seller_phone}</span></td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          e.status === 'held' ? 'bg-amber-500/20 text-amber-400' :
                          e.status === 'released' ? 'bg-emerald-500/20 text-emerald-400' :
                          e.status === 'disputed' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {e.status === 'held' || e.status === 'disputed' ? (
                          <>
                            <button onClick={() => resolveEscrow(e.id, 'release_to_seller')} className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-600/30">
                              Release to Seller
                            </button>
                            <button onClick={() => resolveEscrow(e.id, 'refund_to_buyer')} className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-600/30">
                              Refund Buyer
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(l => (
            <div key={l.id} className="p-4 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white text-base">{l.title}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{l.status}</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{l.category} • Condition: <span className="text-slate-200">{l.condition}</span></p>
                <p className="text-xl font-black text-cyan-400 mb-3">₹{(l.price || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-500">Seller: {l.seller_name} ({l.seller_phone})</p>
              </div>
              <div className="mt-4 pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-color)' }}>
                {l.status === 'active' ? (
                  <button onClick={() => updateListingStatus(l.id, 'suspended')} className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-600/30">
                    Suspend Listing
                  </button>
                ) : (
                  <button onClick={() => updateListingStatus(l.id, 'active')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-600/30">
                    Approve / Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
