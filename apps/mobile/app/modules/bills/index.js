import React, { useState } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { router } from 'expo-router';

const BILLS = [
  { id: 'elec', name: 'MSEDCL Pune (Electricity)', biller: 'Maharashtra State Electricity Distribution', icon: '⚡', due: '12-Jul-2026', amount: 1840 },
  { id: 'gas', name: 'MNGL Piped Gas', biller: 'Maharashtra Natural Gas Ltd', icon: '🔥', due: '08-Jul-2026', amount: 560 },
  { id: 'maint', name: 'Society Maintenance', biller: 'Pride Aashiyana Co-op Society', icon: '🏘️', due: '05-Jul-2026', amount: 3500 },
  { id: 'water', name: 'PMC Water Tax', biller: 'Pune Municipal Corporation', icon: '🚰', due: '30-Jul-2026', amount: 450 },
];

function BillsModule() {
  const [bills, setBills] = useState(BILLS);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [walletBalance, setWalletBalance] = useState(4820);
  
  const CONVENIENCE_FEE = 5;

  const handlePayClick = (bill) => {
    setSelectedBill(bill);
    setPaymentDone(false);
  };

  const handleExecutePayment = () => {
    if (selectedBill) {
      const totalAmount = selectedBill.amount + CONVENIENCE_FEE;
      if (walletBalance >= totalAmount) {
        setWalletBalance(prev => prev - totalAmount);
        setBills(prev => prev.filter(b => b.id !== selectedBill.id));
        setPaymentDone(true);
      } else {
        Alert.alert('Error', 'Insufficient wallet balance! Please reload your wallet.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>📱 Utility Bills</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Wallet Banner */}
        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmt}>₹{walletBalance}</Text>
          </View>
          <TouchableOpacity style={styles.topupBtn} onPress={() => router.push('/modules/wallet')}>
            <Text style={styles.topupText}>+ Topup</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Outstanding Bills</Text>
        
        {bills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>All Clean! No Pending Bills</Text>
            <Text style={styles.emptySubtitle}>You are completely up to date.</Text>
          </View>
        ) : (
          bills.map(bill => (
            <View key={bill.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.iconWrapper}><Text style={styles.icon}>{bill.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <Text style={styles.billerName} numberOfLines={1}>{bill.biller}</Text>
                  <View style={styles.dueBadge}><Text style={styles.dueText}>Due: {bill.due}</Text></View>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.amount}>₹{bill.amount}</Text>
                <TouchableOpacity style={styles.payBtn} onPress={() => handlePayClick(bill)}>
                  <Text style={styles.payBtnText}>Pay Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={!!selectedBill} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {paymentDone ? (
              <View style={styles.successView}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successDesc}>Biller has received payment and transaction receipt has been added to your ledger.</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedBill(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : selectedBill ? (
              <View>
                <Text style={styles.modalTitle}>Payment Summary</Text>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Biller Details</Text>
                  <Text style={styles.summaryValue}>{selectedBill.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Bill Amount</Text>
                  <Text style={styles.summaryValue}>₹{selectedBill.amount}</Text>
                </View>
                <View style={[styles.summaryRow, { borderBottomWidth: 1, borderBottomColor: '#ffffff', paddingBottom: 16 }]}>
                  <Text style={styles.summaryLabel}>Platform Fee</Text>
                  <Text style={styles.summaryValue}>₹{CONVENIENCE_FEE}</Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 16 }]}>
                  <Text style={[styles.summaryLabel, { fontSize: 18, color: '#0f172a' }]}>Total Pay</Text>
                  <Text style={[styles.summaryValue, { fontSize: 18, color: '#3b82f6' }]}>₹{selectedBill.amount + CONVENIENCE_FEE}</Text>
                </View>

                <TouchableOpacity style={styles.executeBtn} onPress={handleExecutePayment}>
                  <Text style={styles.executeBtnText}>Execute Wallet Debit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedBill(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, 
  backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  walletCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  walletLabel: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  walletAmt: { color: '#3b82f6', fontSize: 24, fontWeight: 'bold' },
  topupBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  topupText: { color: '#0f172a', fontWeight: 'bold' },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyCard: { backgroundColor: '#ffffff', padding: 32, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: '#64748b', fontSize: 14 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  iconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  icon: { fontSize: 24 },
  billName: { color: '#0f172a', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  billerName: { color: '#64748b', fontSize: 12, marginBottom: 6 },
  dueBadge: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  dueText: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold' },
  cardRight: { alignItems: 'flex-end' },
  amount: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  payBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  payBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#f8fafc', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { color: '#64748b', fontSize: 14 },
  summaryValue: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  executeBtn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  executeBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#64748b', fontWeight: 'bold', fontSize: 16 },
  
  successView: { alignItems: 'center', paddingVertical: 20 },
  successIcon: { fontSize: 48, marginBottom: 16 },
  successTitle: { color: '#10b981', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  successDesc: { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  closeBtn: { backgroundColor: '#e2e8f0', padding: 16, borderRadius: 8, alignItems: 'center', width: '100%' },
  closeBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 }
});

export default withRoleGuard(BillsModule, 'bills');
