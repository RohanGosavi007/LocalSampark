import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';
import { Ionicons } from '@expo/vector-icons';

/**
 * Tiffin / catering shop view.
 *
 * This screen offered three subscription plans at fixed prices -- a 7-day trial
 * at ₹1,200, a 15-day plan at ₹1,500, a 30-day premium at ₹4,500 -- for every
 * tiffin shop in the app, regardless of what that shop actually sells or
 * charges. Selecting one put it in the cart and routed to checkout, so a
 * customer could attempt to buy a subscription the shop had never offered at a
 * price it had never set. It also printed a fixed "Today's Menu (Lunch)" of
 * 4 Roti, Paneer Masala, Dal Tadka and Jeera Rice for every shop, every day.
 *
 * The plans are removed rather than wired. A tiffin_plans table exists in the
 * schema, but nothing exposes it -- no route anywhere in the backend reads it --
 * so there is no honest source for this list yet, and the same is true of the
 * daily menu (tiffin_daily_menu). Showing nothing is worse for the shop and
 * better for the customer than showing a price that is not real.
 *
 * When those endpoints land, fetch them here and restore both sections.
 */
export default function TiffinCateringVisitorView({ shop }) {
  const [selectedPlan] = useState(null);

  return (
    <VisitorLayout shop={shop} 
      shopName={shop.name || 'Tiffin Service'} 
      shopAddress={shop.address || ''}
      shopIcon="🍱"
      cartCount={selectedPlan ? 1 : 0}
      onCheckout={() => router.push('/modules/checkout')}
    >
      <View style={{ padding: 16 }}>

        <Text style={styles.sectionTitle}>Subscription Plans</Text>
        
        <View style={styles.planCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>No plans listed yet</Text>
            <Text style={styles.planMeals}>
              {(shop.name || 'This kitchen') + ' has not published its tiffin plans or pricing in the app yet. Contact the shop directly to arrange a subscription.'}
            </Text>
          </View>
        </View>

      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  todayMenuBox: { backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#bbf7d0' },
  todayMenuTitle: { fontSize: 16, fontWeight: 'bold', color: '#166534', marginBottom: 8 },
  todayMenuText: { fontSize: 14, color: '#15803d', marginBottom: 4 },
  
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  
  planCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  planCardActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  planName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  planMeals: { fontSize: 13, color: '#64748b' },
  planPrice: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
});
