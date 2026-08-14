'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { ShieldCheck, CheckCircle2, XCircle, Search, Clock, FileText, Store, UserCheck, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function ApprovalsCenterPage() {
  const { adminUser } = useAdminAuth();
  const [approvals, setApprovals] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shops'); // 'shops', 'franchises', 'usersKyc'

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/approvals/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setApprovals(data.data);
      }
    } catch (err) {
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleAction = async (type, id, action) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/approvals/${type}/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully ${action}d request`);
        fetchApprovals();
      }
    } catch (err) {
      toast.error(`Failed to ${action} request`);
    }
  };

  const currentList = approvals[activeTab] || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Universal Approvals Center</h1>
          <p className="text-slate-400">Review and moderate pending registrations and KYCs.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        <button 
          onClick={() => setActiveTab('shops')} 
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition whitespace-nowrap ${activeTab === 'shops' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <Store className="w-5 h-5"/> Pending Shops 
          <span className="bg-slate-950 px-2 py-0.5 rounded-full text-xs">{approvals.shops?.length || 0}</span>
        </button>
        <button 
          onClick={() => setActiveTab('franchises')} 
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition whitespace-nowrap ${activeTab === 'franchises' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <Shield className="w-5 h-5"/> Pending Franchises
          <span className="bg-slate-950 px-2 py-0.5 rounded-full text-xs">{approvals.franchises?.length || 0}</span>
        </button>
        <button 
          onClick={() => setActiveTab('usersKyc')} 
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition whitespace-nowrap ${activeTab === 'usersKyc' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <UserCheck className="w-5 h-5"/> KYC Verifications
          <span className="bg-slate-950 px-2 py-0.5 rounded-full text-xs">{approvals.usersKyc?.length || 0}</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Entity Details</th>
                <th className="p-4 font-semibold">Submitted</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-500">Loading requests...</td></tr>
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                    <p className="text-lg">You're all caught up!</p>
                    <p className="text-sm">No pending approvals for this category.</p>
                  </td>
                </tr>
              ) : currentList.map(item => (
                <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition group">
                  <td className="p-4">
                    <div className="font-bold text-white text-lg">{item.name || item.title}</div>
                    <div className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                      <FileText className="w-4 h-4"/> ID: {item.id} | {item.category || item.pincode || item.phone_number}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs uppercase tracking-wider font-bold inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3"/> Pending Review
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleAction(activeTab === 'shops' ? 'shop' : activeTab === 'franchises' ? 'franchise' : 'userKyc', item.id, 'reject')}
                        className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition"
                        title="Reject Request"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleAction(activeTab === 'shops' ? 'shop' : activeTab === 'franchises' ? 'franchise' : 'userKyc', item.id, 'approve')}
                        className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
