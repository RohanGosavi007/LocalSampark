'use client';
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Link as LinkIcon, Plus, Megaphone, Activity, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function AdCampaignsPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/ads/banners', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBanners(data.data);
      }
    } catch (err) {
      toast.error('Failed to load ad campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleCreateBanner = async () => {
    if (!imageUrl) return toast.error('Image URL is required');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/ads/banners', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, deep_link: deepLink })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Banner ad created successfully!');
        setImageUrl('');
        setDeepLink('');
        fetchBanners();
      } else {
        toast.error(data.error || 'Failed to create banner');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/ads/banners/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Banner is now ${newStatus}`);
        fetchBanners();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <Megaphone className="text-amber-500" /> Ad Campaigns
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage promotional banners, sponsored slots, and track campaign performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Plus className="w-5 h-5 text-emerald-500" /> New Banner Ad
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Banner Image URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <input 
                    type="url" 
                    placeholder="https://example.com/banner.png"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border outline-none text-sm"
                    style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Routing Deep Link</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="localsampark://shop/offer/1"
                    value={deepLink}
                    onChange={e => setDeepLink(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border outline-none font-mono text-sm"
                    style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <button 
                onClick={handleCreateBanner}
                disabled={submitting}
                className="w-full py-4 mt-4 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
              >
                <Megaphone className="w-5 h-5" /> {submitting ? 'Deploying...' : 'Deploy Banner to App'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Banners Grid */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Activity className="w-5 h-5 text-blue-500" /> Live Campaign Dashboard
            </h2>

            {loading ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading campaigns...</div>
            ) : banners.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No ad campaigns exist yet.</div>
            ) : (
              <div className="space-y-4">
                {banners.map(banner => (
                  <div key={banner.id} className="p-4 border rounded-2xl flex flex-col sm:flex-row gap-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    
                    {/* Banner Image Preview */}
                    <div className="w-full sm:w-48 h-24 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 border" style={{ borderColor: 'var(--border-color)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={banner.image_url} alt="Banner Preview" className="w-full h-full object-cover" onError={(e) => e.target.src='https://placehold.co/600x200/png?text=Invalid+Image'} />
                    </div>

                    {/* Banner Stats & Controls */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1 ${banner.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                            {banner.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {banner.status}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(banner.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                          Link: {banner.deep_link || 'None'}
                        </p>
                      </div>

                      <div className="flex justify-between items-end mt-4">
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Impressions</p>
                            <p className="text-sm font-black flex items-center gap-1" style={{ color: 'var(--text-main)' }}>
                              {banner.impressions} <TrendingUp className="w-3 h-3 text-blue-500"/>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Clicks</p>
                            <p className="text-sm font-black flex items-center gap-1" style={{ color: 'var(--text-main)' }}>
                              {banner.clicks} <TrendingUp className="w-3 h-3 text-emerald-500"/>
                            </p>
                          </div>
                        </div>

                        <button 
                          onClick={() => toggleStatus(banner.id, banner.status)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${banner.status === 'active' ? 'bg-slate-100 dark:bg-slate-800 text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700' : 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30'}`}
                        >
                          {banner.status === 'active' ? 'Pause Campaign' : 'Activate Campaign'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
