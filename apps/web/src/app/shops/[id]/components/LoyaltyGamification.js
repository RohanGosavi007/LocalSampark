'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Star, Gift, Zap, TrendingUp, Coins,
  Crown, Shield, ChevronRight, CheckCircle, Lock
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// LOYALTY GAMIFICATION — Visitor side
// Points, tiers, badges, streak, referral, and reward redemption
// ═══════════════════════════════════════════════════════════════════════

const TIERS = [
  { name: 'Bronze', minPoints: 0, color: '#cd7f32', icon: '🥉', perks: ['Earn 1 coin/₹100', 'Birthday discount'] },
  { name: 'Silver', minPoints: 500, color: '#94a3b8', icon: '🥈', perks: ['Earn 2 coins/₹100', 'Free delivery', 'Early access'] },
  { name: 'Gold', minPoints: 2000, color: '#eab308', icon: '🥇', perks: ['Earn 3 coins/₹100', 'Priority service', 'Exclusive deals'] },
  { name: 'Platinum', minPoints: 5000, color: '#a855f7', icon: '👑', perks: ['Earn 5 coins/₹100', 'VIP support', 'Free upgrades', 'Secret menu'] },
];

export default function LoyaltyGamification({ shopId, shopName }) {
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoyaltyData();
  }, [shopId]);

  async function fetchLoyaltyData() {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      const res = await fetch(`${API_BASE}/shops/${shopId}/loyalty`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoyaltyData(data);
      }
    } catch (err) {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }

  const points = loyaltyData?.points || 0;
  const streak = loyaltyData?.streak || 0;
  const currentTier = TIERS.reduce((acc, t) => points >= t.minPoints ? t : acc, TIERS[0]);
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const tierProgress = nextTier ? Math.min(100, ((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100) : 100;

  if (loading) {
    return (
      <div className="bg-background-alt p-6 rounded-2xl border border-border animate-pulse">
        <div className="h-6 bg-border rounded w-1/3 mb-4" />
        <div className="h-32 bg-border rounded mb-4" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Points & Tier Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentTier.color}15, ${currentTier.color}05)`,
          border: `1px solid ${currentTier.color}30`,
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-text-muted text-sm font-medium">Your Loyalty Points</p>
              <p className="text-3xl font-black text-text flex items-center gap-2 mt-1">
                <Coins className="w-7 h-7" style={{ color: currentTier.color }} />
                {points.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <span className="text-4xl">{currentTier.icon}</span>
              <p className="text-xs font-bold mt-1" style={{ color: currentTier.color }}>{currentTier.name} Member</p>
            </div>
          </div>

          {/* Tier Progress */}
          {nextTier && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted font-medium">{currentTier.name}</span>
                <span className="font-bold" style={{ color: nextTier.color }}>{nextTier.name}</span>
              </div>
              <div className="h-3 bg-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${tierProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(to right, ${currentTier.color}, ${nextTier.color})` }}
                />
              </div>
              <p className="text-xs text-text-muted mt-1">
                {(nextTier.minPoints - points).toLocaleString()} more points to {nextTier.name}
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 border-t" style={{ borderColor: `${currentTier.color}20` }}>
          <div className="p-3 text-center border-r" style={{ borderColor: `${currentTier.color}20` }}>
            <Zap className="w-4 h-4 mx-auto mb-1" style={{ color: currentTier.color }} />
            <p className="text-lg font-black text-text">{streak}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase">Day Streak</p>
          </div>
          <div className="p-3 text-center border-r" style={{ borderColor: `${currentTier.color}20` }}>
            <Gift className="w-4 h-4 mx-auto mb-1" style={{ color: currentTier.color }} />
            <p className="text-lg font-black text-text">{loyaltyData?.rewards_claimed || 0}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase">Redeemed</p>
          </div>
          <div className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: currentTier.color }} />
            <p className="text-lg font-black text-text">{loyaltyData?.total_orders || 0}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase">Orders</p>
          </div>
        </div>
      </motion.div>

      {/* Rewards Catalog */}
      <div className="bg-background-alt p-5 rounded-2xl border border-border">
        <h3 className="text-lg font-bold text-text flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-amber-500" /> Redeem Rewards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: '₹50 Discount', cost: 100, icon: '🎟️', available: points >= 100 },
            { name: 'Free Delivery', cost: 50, icon: '🚴', available: points >= 50 },
            { name: '₹200 Cashback', cost: 400, icon: '💰', available: points >= 400 },
            { name: 'Buy 1 Get 1 Free', cost: 300, icon: '🎁', available: points >= 300 },
            { name: 'VIP Priority Access', cost: 500, icon: '👑', available: points >= 500 },
            { name: '₹500 Mega Voucher', cost: 1000, icon: '🏆', available: points >= 1000 },
          ].map((reward, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                reward.available
                  ? 'border-amber-500/20 hover:border-amber-500/40 cursor-pointer hover:shadow-md'
                  : 'border-border opacity-60'
              }`}
            >
              <span className="text-2xl">{reward.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-text text-sm">{reward.name}</p>
                <p className="text-xs text-amber-500 font-bold flex items-center gap-1">
                  <Coins className="w-3 h-3" /> {reward.cost} coins
                </p>
              </div>
              {reward.available ? (
                <button className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold">
                  Redeem
                </button>
              ) : (
                <Lock className="w-4 h-4 text-text-muted" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="bg-background-alt p-5 rounded-2xl border border-border">
        <h3 className="text-lg font-bold text-text flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-purple-500" /> Tier Benefits
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {TIERS.map((tier, i) => {
            const isUnlocked = points >= tier.minPoints;
            return (
              <div key={i} className="min-w-[180px] p-4 rounded-xl border text-center shrink-0"
                style={{
                  borderColor: isUnlocked ? `${tier.color}40` : 'var(--border)',
                  opacity: isUnlocked ? 1 : 0.5,
                }}>
                <span className="text-2xl">{tier.icon}</span>
                <p className="font-bold mt-2" style={{ color: tier.color }}>{tier.name}</p>
                <p className="text-xs text-text-muted mb-2">{tier.minPoints}+ points</p>
                <ul className="text-left space-y-1">
                  {tier.perks.map((perk, j) => (
                    <li key={j} className="text-xs text-text-muted flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 shrink-0" style={{ color: isUnlocked ? '#22c55e' : '#475569' }} />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral */}
      <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-5 text-center">
        <span className="text-3xl">🎁</span>
        <h3 className="text-lg font-bold text-text mt-2">Refer & Earn 100 Coins</h3>
        <p className="text-text-muted text-sm mt-1">Share with friends. You both earn 100 coins on their first order!</p>
        <button className="mt-3 px-6 py-2.5 rounded-xl bg-pink-500 text-white font-bold text-sm hover:bg-pink-600 transition-colors">
          🔗 Share Referral Link
        </button>
      </div>
    </div>
  );
}
