'use client';
import React from 'react';
import { useLanguage } from './LanguageToggle';
import { MANDI_RATES } from '../data/rural-services';

export default function MandiTicker() {
  const { t } = useLanguage();

  return (
    <div style={{ background: '#0f172a', color: 'white', padding: '0.4rem 0', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}>
      <div style={{ background: '#ef4444', color: 'white', padding: '0.4rem 1rem', fontWeight: 800, fontSize: '0.8rem', zIndex: 2, position: 'relative', whiteSpace: 'nowrap', boxShadow: '5px 0 15px rgba(0,0,0,0.5)' }}>
        🚨 {t('mandi_live')}
      </div>
      
      <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'scrollTicker 30s linear infinite', gap: '2rem' }}>
        {MANDI_RATES.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 600, color: '#fcd34d' }}>{item.crop}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({item.market})</span>
            <span style={{ fontWeight: 800 }}>{item.price}</span>
            {item.trend === 'up' && <span style={{ color: '#4ade80', fontWeight: 800 }}>▲ {item.change}</span>}
            {item.trend === 'down' && <span style={{ color: '#f87171', fontWeight: 800 }}>▼ {item.change}</span>}
            {item.trend === 'stable' && <span style={{ color: '#94a3b8', fontWeight: 800 }}>— {item.change}</span>}
            <span style={{ color: '#475569', marginLeft: '1rem' }}>|</span>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scrollTicker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-150%); }
        }
      `}} />
    </div>
  );
}
