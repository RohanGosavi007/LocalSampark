import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';

export default function FranchiseShops() {
  const [shops, setShops] = useState([
    { id: 'SH-01', name: 'Sharma Grocery', owner: 'Rahul Sharma', category: 'Grocery', status: 'Active', revenue: '₹42,500' },
    { id: 'SH-02', name: 'Pune Pharmacy', owner: 'Dr. Vikrant', category: 'Medical', status: 'Active', revenue: '₹1,12,000' },
    { id: 'SH-03', name: 'Sunny Hardware', owner: 'Sunny P.', category: 'Hardware', status: 'Pending Approval', revenue: '₹0' },
  ]);

  const handleApprove = (id) => {
    Alert.alert('Approved', 'Shop is now live in your territory.');
    setShops(shops.map(s => s.id === id ? {...s, status: 'Active'} : s));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Territory Shops</Text>
        <Text style={styles.subtitle}>Manage businesses in your Pincode</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {shops.map(shop => (
          <View key={shop.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <View style={[styles.statusBadge, shop.status === 'Active' ? styles.statusActive : styles.statusPending]}>
                <Text style={[styles.statusText, shop.status === 'Active' ? {color: '#10b981'} : {color: '#f59e0b'}]}>
                  {shop.status}
                </Text>
              </View>
            </View>

            <Text style={styles.infoText}>👤 {shop.owner}</Text>
            <Text style={styles.infoText}>🏷️ {shop.category}</Text>
            
            <View style={styles.revenueBox}>
              <Text style={styles.revenueLabel}>Platform Revenue Generated</Text>
              <Text style={styles.revenueValue}>{shop.revenue}</Text>
            </View>

            {shop.status === 'Pending Approval' && (
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(shop.id)}>
                <Text style={styles.approveBtnText}>Review KYC & Approve</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  
  content: { padding: 15 },
  
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  shopName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', flex: 1 },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusActive: { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' },
  statusPending: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  
  infoText: { color: '#475569', fontSize: 14, marginBottom: 5 },
  
  revenueBox: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 8, marginTop: 15, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  revenueLabel: { color: '#64748b', fontSize: 12, marginBottom: 5 },
  revenueValue: { color: '#10b981', fontSize: 20, fontWeight: 'bold' },

  approveBtn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  approveBtnText: { color: '#0f172a', fontWeight: 'bold' }
});
