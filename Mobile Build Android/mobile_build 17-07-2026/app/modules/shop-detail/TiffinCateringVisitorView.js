import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';
import { Ionicons } from '@expo/vector-icons';

export default function TiffinCateringVisitorView({ shop }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const plans = [
    { id: 1, name: '7 Days Trial', meals: 'Lunch & Dinner', price: '₹1,200', active: true },
    { id: 2, name: '15 Days Classic', meals: 'Lunch Only', price: '₹1,500', active: false },
    { id: 3, name: '30 Days Premium', meals: 'Lunch & Dinner', price: '₹4,500', active: false },
  ];

  return (
    <VisitorLayout 
      shopName={shop.name || 'Maa Ki Rasoi Tiffin'} 
      shopAddress="Kalyani Nagar, Pune"
      shopIcon="🍱"
      cartCount={selectedPlan ? 1 : 0}
      onCheckout={() => router.push('/modules/checkout')}
    >
      <View style={{ padding: 16 }}>
        
        <View style={styles.todayMenuBox}>
          <Text style={styles.todayMenuTitle}>Today's Menu (Lunch)</Text>
          <Text style={styles.todayMenuText}>• 4 Roti</Text>
          <Text style={styles.todayMenuText}>• Paneer Masala</Text>
          <Text style={styles.todayMenuText}>• Dal Tadka</Text>
          <Text style={styles.todayMenuText}>• Jeera Rice & Salad</Text>
        </View>

        <Text style={styles.sectionTitle}>Subscription Plans</Text>
        
        {plans.map(plan => (
          <TouchableOpacity 
            key={plan.id} 
            style={[styles.planCard, selectedPlan === plan.id && styles.planCardActive]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planMeals}>{plan.meals}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.planPrice}>{plan.price}</Text>
              {selectedPlan === plan.id && (
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" style={{ marginTop: 4 }} />
              )}
            </View>
          </TouchableOpacity>
        ))}

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
