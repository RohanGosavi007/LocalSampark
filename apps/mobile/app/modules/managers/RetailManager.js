import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import ManagerLayout from './components/ManagerLayout';

const PosCheckoutTab = () => {
  return (
    <View style={styles.posContainer}>
      <Text style={styles.sectionTitle}>New Sale</Text>
      <TextInput style={styles.searchInput} placeholder="Scan barcode or search product..." />
      <View style={styles.cartBox}>
        <Text style={styles.cartEmpty}>Cart is empty. Scan an item to begin.</Text>
      </View>
      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Total Amount:</Text>
        <Text style={styles.totalValue}>₹0.00</Text>
      </View>
      <TouchableOpacity style={styles.payBtn}>
        <Text style={styles.payBtnText}>Process Payment</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function RetailManager() {
  const tabs = [
    { name: 'POS/Checkout', component: PosCheckoutTab },
    { name: 'Inventory' },
    { name: 'Daily Sales' },
    { name: 'Supplier Orders' },
    { name: 'Returns' },
    { name: 'Offers' },
    { name: 'Customers' }
  ];

  return <ManagerLayout title="Retail" icon="storefront" tabs={tabs} />;
}

const styles = StyleSheet.create({
  posContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  searchInput: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cartBox: { height: 150, backgroundColor: '#f8fafc', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  cartEmpty: { color: '#94a3b8', fontSize: 13 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#f1f5f9' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#475569' },
  totalValue: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  payBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
