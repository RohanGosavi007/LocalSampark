'use client';
import { useState, useEffect } from 'react';
import { AlertCircle, Target, Users, ArrowUpRight, ArrowDownRight, MessageCircle } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function FranchiseIntelligenceWidget({ zoneId }) {
  const [healthScores, setHealthScores] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!zoneId) return;

    const fetchIntelligence = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        // Parallel fetching
        const [healthRes, leadsRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/franchise-intelligence/${zoneId}/health-scores`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/api/v1/franchise-intelligence/${zoneId}/leads`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (healthRes.ok) setHealthScores(await healthRes.json());
        if (leadsRes.ok) setLeads(await leadsRes.json());

      } catch (err) {
        console.error('Failed to fetch franchise intelligence', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIntelligence();
  }, [zoneId]);

  const atRiskShops = healthScores.filter(s => s.status === 'At-Risk');
  const healthyShops = healthScores.filter(s => s.status === 'Healthy');

  const handleWhatsApp = (phone, shopName) => {
    // One-tap WhatsApp recruitment/support
    const msg = encodeURIComponent(`Hi ${shopName}, I'm your LocalSampark franchise manager. How can I help you grow your business today?`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading intelligence data...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* At-Risk Merchants Widget */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="text-red-500" /> At-Risk Merchants
            </h3>
            <p className="text-sm text-slate-400 mt-1">Shops with zero orders in last 7 days</p>
          </div>
          <div className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-sm font-bold border border-red-500/20">
            {atRiskShops.length} Needs Help
          </div>
        </div>

        <div className="space-y-4">
          {atRiskShops.length === 0 ? (
            <p className="text-emerald-400 text-center py-4">All merchants are performing well!</p>
          ) : (
            atRiskShops.slice(0, 5).map(shop => (
              <div key={shop.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">{shop.name}</h4>
                  <div className="flex items-center gap-4 mt-1 text-xs">
                    <span className="text-slate-500">Score: <span className="text-red-400 font-bold">{shop.health_score}/100</span></span>
                    <span className="text-slate-500 flex items-center gap-1">
                      Orders: <ArrowDownRight size={12} className="text-red-400" /> 0
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleWhatsApp('919999999999', shop.name)}
                  className="bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] p-2 rounded-lg transition-colors border border-[#25D366]/30"
                >
                  <MessageCircle size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lead Pipeline Kanban */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="text-purple-500" /> B2B Lead Pipeline
            </h3>
            <p className="text-sm text-slate-400 mt-1">Prospective merchants in your zone</p>
          </div>
          <div className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-sm font-bold border border-purple-500/20">
            {leads.length} Leads
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4">
          {/* Prospects */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center justify-between">
              Prospects <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{leads.filter(l => l.status === 'new').length}</span>
            </h4>
            <div className="space-y-3">
              {leads.filter(l => l.status === 'new').slice(0, 3).map(lead => (
                <div key={lead.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm cursor-pointer hover:border-purple-500/50 transition">
                  <p className="text-sm font-bold text-slate-200">{lead.name}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{lead.business_type}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* In Progress */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center justify-between">
              Contacted <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{leads.filter(l => l.status === 'contacted').length}</span>
            </h4>
            <div className="space-y-3">
              {leads.filter(l => l.status === 'contacted').slice(0, 3).map(lead => (
                <div key={lead.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm border-l-2 border-l-purple-500">
                  <p className="text-sm font-bold text-slate-200">{lead.name}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{lead.business_type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
