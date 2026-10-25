import React, { useState } from 'react';
import { BarChart, Activity, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function AnalyticsManager({ shop }) {
  const [timeframe, setTimeframe] = useState('weekly');

  const archetypeKPIs = {
    restaurant: { label: 'Table Occupancy', value: '78%', icon: <Users size={20} /> },
    pharmacy: { label: 'Prescription Queue', value: '14 Active', icon: <Activity size={20} /> },
    retail: { label: 'Cart Conversion', value: '62%', icon: <TrendingUp size={20} /> }
  };

  const getKPI = () => {
    if (shop?.category_slug?.includes('restaurant')) return archetypeKPIs.restaurant;
    if (shop?.category_slug?.includes('pharmacy')) return archetypeKPIs.pharmacy;
    return archetypeKPIs.retail;
  };

  const currentKPI = getKPI();

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <div className="glass-card" style={{ padding: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <BarChart className="text-primary" /> Revenue & Analytics
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-hover)', padding: '0.25rem', borderRadius: '0.5rem' }}>
            <button 
              onClick={() => setTimeframe('daily')}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', background: timeframe === 'daily' ? 'var(--primary)' : 'transparent', color: timeframe === 'daily' ? 'white' : 'var(--text)' }}
            >Daily</button>
            <button 
              onClick={() => setTimeframe('weekly')}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', background: timeframe === 'weekly' ? 'var(--primary)' : 'transparent', color: timeframe === 'weekly' ? 'white' : 'var(--text)' }}
            >Weekly</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <DollarSign size={16} /> Total Revenue
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{timeframe === 'daily' ? '12,450' : '84,200'}</div>
            <div style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: '0.5rem' }}>+12% vs last {timeframe.replace('ly', '')}</div>
          </div>
          
          <div style={{ padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <Users size={16} /> Unique Customers
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{timeframe === 'daily' ? '45' : '312'}</div>
            <div style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: '0.5rem' }}>+5% vs last {timeframe.replace('ly', '')}</div>
          </div>

          <div style={{ padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {currentKPI.icon} {currentKPI.label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentKPI.value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Live Metric</div>
          </div>
          
          <div style={{ padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <TrendingUp size={16} /> Top Product
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Premium Service</div>
            <div style={{ color: 'var(--primary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>24 units sold</div>
          </div>
        </div>

        {/* Mock Chart Visualization */}
        <div style={{ height: '300px', background: 'var(--bg-hover)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
          {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
            <div key={i} style={{ flex: 1, background: 'linear-gradient(to top, var(--primary), #a855f7)', height: `${h}%`, borderRadius: '0.5rem', opacity: 0.8, transition: 'height 0.3s ease' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
