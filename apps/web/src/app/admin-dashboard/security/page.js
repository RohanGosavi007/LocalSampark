'use client';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, UserX, Store, Activity, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SecurityFraudDashboard() {
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [flaggedShops, setFlaggedShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFraudData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/fraud-scan', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFlaggedUsers(data.data.flagged_users);
        setFlaggedShops(data.data.flagged_shops);
      }
    } catch (err) {
      toast.error('Failed to load fraud detection data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFraudData();
  }, []);

  const handleReview = (type, id) => {
    // In a real app, this would open a detailed review modal
    toast.success(`${type} ID ${id} marked as reviewed.`);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2 text-white">
          <ShieldAlert className="text-red-500" /> AI Fraud & Security
        </h1>
        <p className="text-slate-400">Live monitoring of anomalous platform activity and transaction velocity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Suspicious Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <UserX className="w-5 h-5 text-orange-500"/> Flagged Users (Order Velocity)
          </h2>
          {loading ? (
            <div className="text-slate-500 text-center py-8">Running AI Analysis...</div>
          ) : flaggedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-sm text-slate-400">No anomalous user activity detected.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flaggedUsers.map(user => (
                <div key={user.id} className="p-4 bg-slate-950 border border-orange-500/30 rounded-2xl flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-bold">{user.full_name || 'Unknown'} <span className="text-xs text-slate-500 font-normal">({user.phone_number})</span></h4>
                    <p className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                      <Activity size={14}/> {user.order_count} orders in 24h
                    </p>
                  </div>
                  <button onClick={() => handleReview('User', user.id)} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm transition">
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suspicious Shops */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Store className="w-5 h-5 text-red-500"/> Flagged Shops (Payout Velocity)
          </h2>
          {loading ? (
            <div className="text-slate-500 text-center py-8">Running AI Analysis...</div>
          ) : flaggedShops.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-sm text-slate-400">No anomalous shop activity detected.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flaggedShops.map(shop => (
                <div key={shop.id} className="p-4 bg-slate-950 border border-red-500/30 rounded-2xl flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-bold">{shop.shop_name}</h4>
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <Activity size={14}/> {shop.payout_count} payout requests recently
                    </p>
                  </div>
                  <button onClick={() => handleReview('Shop', shop.id)} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm transition">
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
