'use client';
import React, { useState } from 'react';
import {
  TrendingUp, IndianRupee, ShoppingBag, Users, Calendar,
  Download, Filter, ArrowUpRight, ArrowDownRight, Activity,
  PieChart, BarChart3, Receipt
} from 'lucide-react';

// KPIS will be built dynamically

export default function ShopAnalyticsManager({ token, shopId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/v1/shops/my-shop/analytics-data`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setAnalytics(data.analytics);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAnalytics();
  }, [token]);

  const KPIS = analytics ? [
    { id: 'revenue', label: 'Total Revenue', value: `₹${analytics.revenue.toLocaleString()}`, icon: IndianRupee, color: '#10b981' },
    { id: 'orders', label: 'Total Orders', value: analytics.orders.toString(), icon: ShoppingBag, color: '#3b82f6' },
    // views is null while store views are not tracked: shown as "—", not 0.
    { id: 'views', label: 'Store Views', value: analytics.views == null ? '—' : String(analytics.views), icon: Users, color: '#8b5cf6' },
    { id: 'conversion', label: 'Orders Completed', value: `${analytics.conversion}%`, icon: Activity, color: '#f59e0b' }
  ] : [];



  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--primary)' }} /> Analytics & Financials
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Track your shop's performance, revenue, and bank settlements</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {KPIS.map(kpi => (
          <div key={kpi.id} style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                <kpi.icon size={20} />
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>{kpi.label}</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{kpi.value}</h4>
          </div>
        ))}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Figures are for your shop's recorded activity. Charts, tax and settlement reports will appear here once there is data to report.</p>
    </div>
  );
}
