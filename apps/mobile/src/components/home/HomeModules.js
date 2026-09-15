import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useHomeLayout } from '../../hooks/useHomeLayout';
import { sessionIntentTracker } from '../../services/sessionIntentTracker';

/**
 * Home-screen modules, ordered by the contextual bandit.
 *
 * The registry below is the contract between the policy and the UI: the
 * bandit's arms are these keys, and anything it returns that is not here is
 * ignored rather than rendered as a blank. That matters because the policy's
 * arm list lives server-side and can gain an entry before an app build ships
 * with the component for it — an unknown arm must degrade to absence, not to a
 * crash on a user's home screen.
 *
 * Ordering is the only thing personalised. Every module is always present: a
 * bandit that could hide SOS or pharmacy shortcuts because a user has not
 * tapped them recently would be optimising engagement against safety.
 */

const MODULES = {
  NearbyShops: {
    label: 'Nearby Shops',
    caption: 'Order from local stores',
    icon: '🏪',
    tint: '#3b82f6',
    route: '/(tabs)/directory',
    category: 'shops',
  },
  EmergencyServices: {
    label: 'Emergency',
    caption: 'SOS, pharmacy, medical',
    icon: '🚨',
    tint: '#ef4444',
    route: '/modules/sos',
    category: 'emergency',
  },
  CarpoolCommute: {
    label: 'Carpool',
    caption: 'Share a ride, split the fare',
    icon: '🚗',
    tint: '#06b6d4',
    route: '/advanced',
    category: 'carpool',
  },
  FreshMarketplace: {
    label: 'Marketplace',
    caption: 'Buy and sell locally',
    icon: '🛍️',
    tint: '#f59e0b',
    route: '/advanced',
    category: 'marketplace',
  },
  LocalJobs: {
    label: 'Local Jobs',
    caption: 'Work near you',
    icon: '💼',
    tint: '#8b5cf6',
    route: '/modules/jobs',
    category: 'jobs',
  },
  SocietyAlerts: {
    label: 'Society',
    caption: 'Notices and visitors',
    icon: '🏘️',
    tint: '#10b981',
    route: '/community',
    category: 'society',
  },
};

export default function HomeModules({ pincode = null, tenureDays = 0, regionId = null }) {
  const { layout, strategy, reportEngagement } = useHomeLayout({ pincode, tenureDays, regionId });
  const rewardedImpressions = useRef(new Set());

  // A small reward for being shown, once per module per mount. Without an
  // impression signal the policy cannot tell "shown and ignored" from "never
  // shown", and those must not look the same — the first is evidence against an
  // arm, the second is the reason to explore it.
  useEffect(() => {
    for (const arm of layout) {
      if (!MODULES[arm] || rewardedImpressions.current.has(arm)) continue;
      rewardedImpressions.current.add(arm);
      reportEngagement(arm, 0.05);
    }
  }, [layout, reportEngagement]);

  const open = (arm) => {
    const module = MODULES[arm];
    if (!module) return;

    // Full reward: a tap is the outcome the policy is optimising for.
    reportEngagement(arm, 1);
    // Feeds the intent classifier too, so opening the pharmacy module shifts
    // the next recommendation query toward urgency.
    sessionIntentTracker.record('CARD_CLICK', { category: module.category, itemId: arm });
    router.push(module.route);
  };

  const known = layout.filter((arm) => MODULES[arm]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>For you</Text>
        {strategy === 'linucb' ? (
          // Disclosed rather than silent. A reordering personalised to the
          // person looking at it should say so.
          <Text style={styles.badge}>Personalised</Text>
        ) : null}
      </View>

      <View style={styles.grid}>
        {known.map((arm, index) => {
          const module = MODULES[arm];
          return (
            <TouchableOpacity
              key={arm}
              onPress={() => open(arm)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${module.label}. ${module.caption}`}
              style={[
                styles.card,
                { borderColor: `${module.tint}44`, backgroundColor: `${module.tint}14` },
                // The leading module gets the full width. The bandit's ordering
                // is only useful if position actually changes prominence;
                // reordering six identical tiles communicates nothing.
                index === 0 ? styles.cardWide : null,
              ]}
            >
              <Text style={styles.icon}>{module.icon}</Text>
              <Text style={[styles.label, { color: module.tint }]} numberOfLines={1}>
                {module.label}
              </Text>
              <Text style={styles.caption} numberOfLines={1}>{module.caption}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 24, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4f46e5',
    backgroundColor: 'rgba(79,70,229,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    letterSpacing: 0.4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '31%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  cardWide: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', gap: 12, paddingVertical: 16 },
  icon: { fontSize: 24, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  caption: { fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 2 },
});
