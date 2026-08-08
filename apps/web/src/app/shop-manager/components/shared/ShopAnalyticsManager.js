'use client';
import React, { useState } from 'react';
import {
  TrendingUp, IndianRupee, ShoppingBag, Users, Calendar,
  Download, Filter, ArrowUpRight, ArrowDownRight, Activity,
  PieChart, BarChart3, Receipt
} from 'lucide-react';

const KPIS = [
  { id: 'revenue', label: 'Today\'s Revenue', value: '₹12,450', trend: '+14.5%', isPositive: true, icon: IndianRupee, color: '#10b981' },
  { id: 'orders', label: 'Total Orders', value: '142', trend: '+5.2%', isPositive: true, icon: ShoppingBag, color: '#3b82f6' },
  { id: 'aov', label: 'Avg. Order Value', value: '₹87.6', trend: '-1.4%', isPositive: false, icon: Receipt, color: '#f59e0b' },
  { id: 'customers', label: 'New Customers', value: '28', trend: '+12.0%', isPositive: true, icon: Users, color: '#8b5cf6' }
];

const SETTLEMENTS = [
  { id: 'SET-9921', date: 'Today, 10:00 AM', amount: 8450, status: 'Processing', method: 'NEFT to HDFC ***1234' },
  { id: 'SET-9920', date: 'Yesterday', amount: 11200, status: 'Settled', method: 'NEFT to HDFC ***1234' },
  { id: 'SET-9919', date: 'Aug 05, 2026', amount: 9800, status: 'Settled', method: 'NEFT to HDFC ***1234' },
  { id: 'SET-9918', date: 'Aug 04, 2026', amount: 10450, status: 'Settled', method: 'NEFT to HDFC ***1234' },
  { id: 'SET-9917', date: 'Aug 03, 2026', amount: 9100, status: 'Failed', method: 'NEFT to HDFC ***1234' },
];

const TOP_PRODUCTS = [
  { id: 'p1', name: 'Amul Milk 1L', qty: 145, revenue: 9860 },
  { id: 'p2', name: 'Aashirvaad Atta 5kg', qty: 32, revenue: 8000 },
  { id: 'p3', name: 'Parle-G Biscuits', qty: 210, revenue: 4200 },
  { id: 'p4', name: 'Tata Salt 1kg', qty: 85, revenue: 1870 },
  { id: 'p5', name: 'Sunflower Oil 1L', qty: 12, revenue: 1680 },
];

export default function ShopAnalyticsManager() {
  const [dateRange, setDateRange] = useState('Today');

  // Helper to render a simple bar chart
  const renderBarChart = () => {
    const data = [4500, 5200, 4800, 6100, 5900, 8400, 7200, 9100, 10500, 9800, 11200, 12450];
    const max = Math.max(...data);
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 180, padding: '1rem 0 0', borderBottom: '1px solid var(--border)' }}>
        {data.map((val, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', group: 'true' }}>
            <div style={{ 
              width: '100%', 
              height: `${(val / max) * 100}%`, 
              background: i === data.length - 1 ? 'var(--primary)' : 'var(--primary-light, rgba(99,102,241,0.2))',
              borderRadius: '0.25rem 0.25rem 0 0',
              transition: 'all 0.3s ease'
            }} />
          </div>
        ))}
      </div>
    );
  };

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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--surface)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            <option>Today</option>
            <option>Yesterday</option>
            <option>Last 7 Days</option>
            <option>This Month</option>
          </select>
          <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Download size={15} /> Export PDF
          </button>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '2rem', background: kpi.isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: kpi.isPositive ? '#10b981' : '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>
                {kpi.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {kpi.trend}
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>{kpi.label}</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{kpi.value}</h4>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Revenue Chart */}
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Revenue Trend</h4>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }}/> Current Period</span>
            </div>
          </div>
          {renderBarChart()}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span>8 AM</span>
            <span>12 PM</span>
            <span>4 PM</span>
            <span>8 PM</span>
          </div>
        </div>

        {/* GST & Tax Summary */}
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} style={{ color: '#f59e0b' }} /> GST Summary
          </h4>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px dashed var(--border)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gross Sales</span>
              <span style={{ fontWeight: 700 }}>₹12,450.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>CGST Collected</span>
              <span style={{ fontWeight: 600 }}>₹311.25</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>SGST Collected</span>
              <span style={{ fontWeight: 600 }}>₹311.25</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
              <span style={{ fontWeight: 700 }}>Total Tax Liability</span>
              <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1.1rem' }}>₹622.50</span>
            </div>
            <button style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '0.625rem', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Download GSTR Report
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Top Products */}
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
          <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.25rem' }}>Top Selling Products</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Product</th>
                <th style={{ textAlign: 'right', padding: '0.75rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty Sold</th>
                <th style={{ textAlign: 'right', padding: '0.75rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {TOP_PRODUCTS.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < TOP_PRODUCTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '0.875rem 0', fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</td>
                  <td style={{ padding: '0.875rem 0', textAlign: 'right', fontSize: '0.875rem' }}>{p.qty}</td>
                  <td style={{ padding: '0.875rem 0', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>₹{p.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bank Settlements */}
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Bank Settlements</h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>View All</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {SETTLEMENTS.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{s.amount}</span>
                    <span style={{ 
                      padding: '0.1rem 0.4rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      background: s.status === 'Settled' ? 'rgba(16,185,129,0.1)' : s.status === 'Processing' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                      color: s.status === 'Settled' ? '#10b981' : s.status === 'Processing' ? '#3b82f6' : '#ef4444'
                    }}>
                      {s.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.date} · {s.method}</div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
