import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function PayoutsScreen() {
  const [payouts, setPayouts] = useState([
    { id: 'PAY-8921', payee: 'Rahul Desai (Pune East)', type: 'Franchise', amount: 24500, date: '28-Jun-2026', status: 'Pending' },
    { id: 'PAY-8922', payee: 'Glow & Glamour Salon', type: 'Shop Owner', amount: 8200, date: '28-Jun-2026', status: 'Pending' },
    { id: 'PAY-8910', payee: 'Amit Singh (NCR Central)', type: 'Franchise', amount: 45000, date: '27-Jun-2026', status: 'Approved' },
    { id: 'PAY-8905', payee: 'Ramesh Groceries', type: 'Shop Owner', amount: 3100, date: '26-Jun-2026', status: 'Rejected' },
  ]);

  const handleAction = (id, action) => {
    Haptics.impactAsync(action === 'Approved' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      `${action} Payout`,
      `Are you sure you want to mark ${id} as ${action}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          style: action === 'Rejected' ? 'destructive' : 'default',
          onPress: () => {
            setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: action } : p));
            Haptics.notificationAsync(
              action === 'Approved' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
            );
          }
        }
      ]
    );
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Pending': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
      case 'Approved': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'Rejected': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
      default: return { bg: '#334155', color: '#0f172a' };
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Payout Management', 
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#fff'
      }} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Withdrawal Requests</Text>
        <Text style={styles.headerDesc}>Review and approve partner payout requests.</Text>

        {payouts.map((p) => {
          const s = getStatusStyle(p.status);
          
          return (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.payId}>{p.id}</Text>
                  <Text style={styles.payDate}>{p.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statusText, { color: s.color }]}>{p.status}</Text>
                </View>
              </View>

              <Text style={styles.payee}>{p.payee}</Text>
              
              <View style={styles.detailsRow}>
                <Text style={styles.typeTag}>{p.type}</Text>
                <Text style={styles.amount}>₹{p.amount.toLocaleString()}</Text>
              </View>

              {p.status === 'Pending' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} 
                    onPress={() => handleAction(p.id, 'Rejected')}
                  >
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]} 
                    onPress={() => handleAction(p.id, 'Approved')}
                  >
                    <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  headerDesc: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  payId: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  payDate: { color: '#64748b', fontSize: 12, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontWeight: 'bold', fontSize: 12 },
  
  payee: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  typeTag: { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: '600' },
  amount: { color: '#0f172a', fontSize: 24, fontWeight: 'bold' },
  
  actionsRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 16 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { fontWeight: 'bold', fontSize: 14 }
});
