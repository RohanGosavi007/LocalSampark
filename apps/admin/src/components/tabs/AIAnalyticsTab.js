'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

/**
 * Territory analytics.
 *
 * This file did not compile. A `setError(e)` call had been spliced into the
 * middle of an object literal inside the catch block, between two array
 * elements:
 *
 *     top_categories: [
 *       { category: 'Grocery & Staples', revenue: 45000, growth: '+18%'
 *     setError(e);
 *     },
 *
 * It went unnoticed because the component is orphaned — nothing imports it, so
 * Next never compiled it and `next build` stayed green. It is wired into
 * app/page.js now, which means it has to actually parse.
 *
 * The fabricated fallback is also gone. On any fetch failure the component used
 * to display ₹79,500 GMV, 142 orders and three invented "demand sectors"
 * styled identically to real data, with no indication anything had failed. In
 * an operations console that is worse than an empty state: the numbers are the
 * input to a business decision. Failures now surface through TabError, and the
 * metric cards render only when the API actually returned something.
 *
 * Growth percentages are shown only when the API supplies them. The previous
 * "↑ +21.4% vs last month" and "Conversion: 64%" captions were hardcoded
 * constants that never changed regardless of the data above them.
 */

const cardStyle = {
  background: '#1e293b',
  padding: '1.5rem',
  borderRadius: '1rem',
  border: '1px solid #334155',
  flex: 1,
};

const btnPrimary = {
  padding: '0.6rem 1.2rem',
  background: '#4f46e5',
  border: 'none',
  color: '#fff',
  borderRadius: '0.5rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const labelStyle = { color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 };
const captionStyle = { color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.2rem' };

/** Formats a number as INR without inventing precision the API did not send. */
function inr(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
}

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : '—';
}

function MetricCard({ label, value, caption, color }) {
  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, marginTop: '0.5rem' }}>{value}</div>
      {caption ? <div style={captionStyle}>{caption}</div> : null}
    </div>
  );
}

export default function AIAnalyticsTab({ API_BASE, authHeaders }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resData = await fetchJson(`${API_BASE}/admin/analytics/overview`, {
        headers: authHeaders(),
      });
      setData(resData.analytics || null);
    } catch (e) {
      // Surface the failure instead of substituting invented figures.
      setError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, authHeaders]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const categories = Array.isArray(data?.top_categories) ? data.top_categories : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={fetchAnalytics} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.4rem 0', color: '#f8fafc' }}>
            📊 Territory Performance &amp; Intelligence
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Gross Merchandise Value, order and dispatch volume, and lead pipeline for the selected territory.
          </p>
        </div>
        <button type="button" onClick={fetchAnalytics} disabled={loading} style={btnPrimary}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {!data && !error && !loading ? (
        <div style={{ ...cardStyle, flex: undefined, color: '#94a3b8', fontSize: '0.9rem' }}>
          No analytics have been reported for this territory yet.
        </div>
      ) : null}

      {data ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <MetricCard
              label="TOTAL TERRITORY GMV"
              value={inr(data.total_gmv)}
              caption={data.gmv_change ? `${data.gmv_change} vs last month` : null}
              color="#4ade80"
            />
            <MetricCard
              label="TOTAL E-COMMERCE ORDERS"
              value={count(data.total_orders)}
              caption={data.avg_order_value ? `Avg order: ${inr(data.avg_order_value)}` : null}
              color="#818cf8"
            />
            <MetricCard
              label="SERVICE DISPATCHES"
              value={count(data.service_bookings)}
              caption={data.avg_inspection_fee ? `Avg inspection: ${inr(data.avg_inspection_fee)}` : null}
              color="#f59e0b"
            />
            <MetricCard
              label="ACTIVE FRANCHISE LEADS"
              value={count(data.active_leads)}
              caption={data.lead_conversion_rate ? `Conversion: ${data.lead_conversion_rate}` : null}
              color="#38bdf8"
            />
          </div>

          <div style={{ ...cardStyle, flex: undefined }}>
            <h4 style={{ color: '#f8fafc', margin: '0 0 1rem 0', fontSize: '1rem' }}>
              📈 Demand Distribution by Sector
            </h4>
            {categories.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                No sector breakdown available for this period.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {categories.map((c, i) => (
                  <div
                    key={c.category || i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #334155',
                      paddingBottom: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem' }}>{c.category}</div>
                      <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Quarterly volume</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#4ade80', fontWeight: 800, fontSize: '1rem' }}>{inr(c.revenue)}</div>
                      {c.growth ? (
                        <div style={{ color: '#818cf8', fontWeight: 700, fontSize: '0.75rem' }}>{c.growth}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
