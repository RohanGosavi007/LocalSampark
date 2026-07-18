'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, LogIn } from 'lucide-react';
import Link from 'next/link';
import DynamicIcon, { getCategoryIconInfo } from '../../components/DynamicIcon';
import ShopManagerRouter from '../components/ShopManagerRouter';

import { API_BASE } from '@/lib/api';

export default function ShopManagerDashboard({ params }) {
  const { category } = React.use(params);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get category icon info
  const catInfo = getCategoryIconInfo(category);

  // Get auth token
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('token');
      return stored || null;
    } catch { return null; }
  };

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('login_required');
      return;
    }

    (async () => {
      try {
        // Fetch shop owned by this user
        const res = await fetch(`${API_BASE}/shops/my-shop/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setShop(data.shop || { id: data.shopId });
        } else {
          setError('no_shop');
        }
      } catch (err) {
        console.error('Failed to load shop:', err);
        // Allow manager to load even if dashboard API not ready yet
        setShop({ id: 'pending' });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          
          <Link href="/shop-dashboard" className="inline-flex items-center text-text-muted hover:text-primary transition-colors font-bold mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Main Dashboard
          </Link>

          {/* ─── SHOP HEADER ──────────────────────────────────── */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: `linear-gradient(135deg, ${catInfo.color}15, ${catInfo.color}08)`,
              border: `1px solid ${catInfo.color}30`,
              borderRadius: '24px',
              padding: '32px',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: `${catInfo.color}20`, border: `2px solid ${catInfo.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px',
            }}>
              {catInfo.emoji}
            </div>
            <div>
              <h1 style={{ 
                fontSize: '28px', fontWeight: 900, color: 'var(--text)',
                margin: '0 0 4px',
              }}>
                {formatCategoryTitle(category)} Manager Pro
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: 0 }}>
                Advanced management system with real-time dashboard, analytics, and complete business tools
              </p>
            </div>
          </motion.div>

          {/* ─── CONTENT ──────────────────────────────────────── */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{
                width: '48px', height: '48px', border: `3px solid ${catInfo.color}30`,
                borderTopColor: catInfo.color, borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto 16px',
              }} />
              <p style={{ color: 'var(--text-muted)' }}>Loading your management dashboard...</p>
            </div>
          ) : error === 'login_required' ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px', borderRadius: '24px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <LogIn size={48} style={{ color: catInfo.color, marginBottom: '16px' }} />
              <h2 style={{ color: 'var(--text)', fontSize: '22px', fontWeight: 700 }}>Login Required</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: '8px 0 20px' }}>
                Please log in to access your shop management dashboard.
              </p>
              <Link href="/auth/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 28px', borderRadius: '14px', textDecoration: 'none',
                background: `linear-gradient(135deg, ${catInfo.color}, ${catInfo.color}cc)`,
                color: '#fff', fontSize: '15px', fontWeight: 700,
              }}>
                <LogIn size={18} /> Log In
              </Link>
            </div>
          ) : error === 'no_shop' ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px', borderRadius: '24px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <Shield size={48} style={{ color: '#f59e0b', marginBottom: '16px' }} />
              <h2 style={{ color: 'var(--text)', fontSize: '22px', fontWeight: 700 }}>No Shop Found</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: '8px 0 20px' }}>
                You don't have a registered shop yet. Register your business to access these tools.
              </p>
              <Link href="/register-shop" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 28px', borderRadius: '14px', textDecoration: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff', fontSize: '15px', fontWeight: 700,
              }}>
                Register Your Shop
              </Link>
            </div>
          ) : (
            <ShopManagerRouter
              token={token}
              shopId={shop?.id}
              shop={shop}
              categorySlug={category}
            />
          )}

        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// Helper: Convert slug to title
function formatCategoryTitle(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
