import React, { useState, useEffect } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { loadWithFallback } from '../../../src/utils/mockDataHelper';
import DemoBadge from '../../../src/components/DemoBadge';

const PLANS = [
  { id: 'milk', name: 'Fresh Buffalo Milk (1L)', category: 'Dairy & Essentials', provider: 'Sharma Dairy & Farms', price: '₹68/day', billing: 'Daily Auto-Debit', schedule: 'Every morning (6:00 AM)', rating: '4.8 ★', icon: '🥛' },
  { id: 'water', name: 'Bisleri 20L Water Can', category: 'Dairy & Essentials', provider: 'H2O Express Dhanori', price: '₹75/can', billing: 'On Delivery Auto-Debit', schedule: 'Alternate days', rating: '4.7 ★', icon: '🪣' },
  { id: 'tiffin', name: 'Homely Veg Tiffin (Lunch + Dinner)', category: 'Food & Meals', provider: 'Aaji cha Swad (Home Chef)', price: '₹180/day', billing: 'Weekly Auto-Debit', schedule: 'Mon-Sat (12:30 PM & 8:00 PM)', rating: '4.9 ★', icon: '🍱' },
  { id: 'news', name: 'Times of India + Maharashtra Times', category: 'Media', provider: 'Dhanori News Agency', price: '₹220/month', billing: 'Monthly Auto-Debit', schedule: 'Every morning (6:30 AM)', rating: '4.5 ★', icon: '📰' },
];

function SubscriptionsModule() {
  const [subscribedIds, setSubscribedIds] = useState(['milk']);
  const [walletBalance, setWalletBalance] = useState(1420);
  const [plans, setPlans] = useState(PLANS);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    loadWithFallback('/subscriptions', PLANS, setPlans, setIsDemo);
  }, []);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activePlan, setActivePlan] = useState(null);

  const handleToggleSubscription = (plan) => {
    if (subscribedIds.includes(plan.id)) {
      Alert.alert(
        'Pause/Cancel',
        `Do you want to stop the subscription for ${plan.name}?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Stop Deliveries', onPress: () => setSubscribedIds(prev => prev.filter(id => id !== plan.id)), style: 'destructive'}
        ]
      );
    } else {
      setActivePlan(plan);
      setShowScheduleModal(true);
    }
  };

  const confirmSubscription = () => {
    if (activePlan) {
      setSubscribedIds(prev => [...prev, activePlan.id]);
      setShowScheduleModal(false);
      setActivePlan(null);
      Alert.alert('Success', 'Subscription Activated. Auto-debit will occur from your wallet.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>📅 Subscriptions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Wallet & Header Info */}
        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmount}>₹{walletBalance}</Text>
          </View>
          <TouchableOpacity style={styles.addMoneyBtn} onPress={() => router.push('/(tabs)/wallet')}>
            <Text style={styles.addMoneyBtnText}>+ Add Money</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionDesc}>Subscribe once, get daily hassle-free deliveries at your doorstep. Zero commission for providers.</Text>

        {/* My Active Subscriptions (if any) */}
        {subscribedIds.length > 0 && (
          <View style={styles.activeSection}>
            <Text style={styles.sectionTitle}>My Active Deliveries</Text>
            {PLANS.filter(p => subscribedIds.includes(p.id)).map(plan => (
              <View key={`active-${plan.id}`} style={styles.activeCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBox}><Text style={styles.icon}>{plan.icon}</Text></View>
                  <View style={{flex: 1}}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.providerName}>{plan.provider}</Text>
                  </View>
                </View>
                <View style={styles.activeFooter}>
                  <Text style={styles.deliveryStatus}>🚚 Next delivery: {plan.schedule}</Text>
                  <TouchableOpacity style={styles.pauseBtn} onPress={() => handleToggleSubscription(plan)}>
                    <Text style={styles.pauseBtnText}>Manage/Pause</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Discover Local Plans</Text>
        {PLANS.map(plan => {
          const isSubscribed = subscribedIds.includes(plan.id);
          return (
            <View key={plan.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}><Text style={styles.icon}>{plan.icon}</Text></View>
                <View style={{flex: 1}}>
                  <Text style={styles.category}>{plan.category}</Text>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.providerName}>{plan.provider} • {plan.rating}</Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>{plan.price}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Billing</Text>
                  <Text style={styles.detailValue}>{plan.billing}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Schedule</Text>
                  <Text style={styles.detailValue}>{plan.schedule}</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.actionBtn, isSubscribed && styles.actionBtnSubscribed]} 
                onPress={() => handleToggleSubscription(plan)}
              >
                <Text style={styles.actionBtnText}>
                  {isSubscribed ? 'Subscribed (Manage)' : '+ Subscribe Now'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Schedule Modal */}
      <Modal visible={showScheduleModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Customize Delivery Schedule</Text>
            {activePlan && (
              <Text style={styles.modalDesc}>Set your preferred delivery guidelines for {activePlan.name}.</Text>
            )}
            
            <Text style={styles.label}>Delivery Days</Text>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerText}>Everyday ▾</Text>
            </View>
            
            <Text style={styles.label}>Special Delivery Note</Text>
            <TextInput style={styles.input} placeholder="e.g. Ring bell, leave outside door, etc." placeholderTextColor="#64748b" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#e2e8f0'}]} onPress={() => setShowScheduleModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#3b82f6'}]} onPress={confirmSubscription}>
                <Text style={styles.modalBtnText}>Confirm & Sub</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  content: { padding: 16 },
  
  walletCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  walletLabel: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  walletAmount: { color: '#3b82f6', fontSize: 24, fontWeight: 'bold' },
  addMoneyBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addMoneyBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },
  
  sectionDesc: { color: '#64748b', fontSize: 13, marginBottom: 24 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  
  activeSection: { marginBottom: 24, padding: 16, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  activeCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6', marginBottom: 12 },
  activeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#ffffff', paddingTop: 12 },
  deliveryStatus: { color: '#10b981', fontSize: 12, fontWeight: 'bold' },
  pauseBtn: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  pauseBtnText: { color: '#475569', fontSize: 11, fontWeight: 'bold' },

  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  iconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  icon: { fontSize: 24 },
  category: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  planName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  providerName: { color: '#64748b', fontSize: 12 },
  
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 },
  detailItem: { flex: 1 },
  detailLabel: { color: '#64748b', fontSize: 10, marginBottom: 4 },
  detailValue: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
  
  actionBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnSubscribed: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  actionBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalDesc: { color: '#64748b', fontSize: 13, marginBottom: 24, lineHeight: 20 },
  label: { color: '#475569', fontSize: 13, marginBottom: 8, fontWeight: 'bold' },
  pickerContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#ffffff', borderRadius: 8, padding: 14, marginBottom: 16 },
  pickerText: { color: '#0f172a', fontSize: 14 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#ffffff', borderRadius: 8, padding: 14, color: '#0f172a', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
});

export default withRoleGuard(SubscriptionsModule, 'subscriptions');
