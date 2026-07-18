import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';

export default function WalletScreen() {
  const { walletBalance: balance, walletTransactions: transactions } = useAuth();
  const [amountInput, setAmountInput] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

  const handleAddMoney = () => {
    const amt = parseFloat(amountInput);
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    
    // Simulate Razorpay flow
    Alert.alert(
      'Proceed to Payment',
      `You are being redirected to Razorpay to add ₹${amt.toFixed(2)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pay Now', 
          onPress: () => {
            // Usually this would call backend, but auth context handles state mock for now
            // We just clear input
            setAmountInput('');
            Alert.alert('Payment Successful', `₹${amt.toFixed(2)} has been securely loaded into your wallet.`);
          }
        }
      ]
    );
  };

  const handleDownloadPassbook = () => {
    Alert.alert('Passbook Download', 'Generating PDF passbook of last 6 months...');
    setTimeout(() => {
      Alert.alert('Success', 'Passbook downloaded to your device storage.');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <View style={styles.header}>
          <Text style={styles.title}>👛 Local Wallet</Text>
          <Text style={styles.subtitle}>Zero fee peer-to-peer neighborhood payments</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Balance Card */}
          <LinearGradient colors={['#1e1b4b', '#4338ca']} style={styles.balanceCard} start={{x:0, y:0}} end={{x:1, y:1}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={{fontSize: 24}}>💳</Text>
            </View>
            <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
            
            <View style={styles.balanceActions}>
              <TouchableOpacity style={styles.iconAction} onPress={() => setShowQRModal(true)}>
                <View style={styles.actionIconBg}><Text style={{fontSize: 20}}>📷</Text></View>
                <Text style={styles.actionText}>Scan QR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.iconAction}>
                <View style={styles.actionIconBg}><Text style={{fontSize: 20}}>🔁</Text></View>
                <Text style={styles.actionText}>Transfer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.iconAction} onPress={handleDownloadPassbook}>
                <View style={styles.actionIconBg}><Text style={{fontSize: 20}}>📥</Text></View>
                <Text style={styles.actionText}>Passbook</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Load Funds */}
          <View style={styles.loadFundsCard}>
            <Text style={styles.sectionTitle}>Load Funds via Razorpay</Text>
            <Text style={styles.inputLabel}>Amount (INR)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0.00" 
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={amountInput}
                onChangeText={setAmountInput}
              />
            </View>
            
            <View style={styles.quickAmounts}>
              {[500, 1000, 2000].map(amt => (
                <TouchableOpacity key={amt} style={styles.quickAmtChip} onPress={() => setAmountInput(amt.toString())}>
                  <Text style={styles.quickAmtText}>+₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={handleAddMoney}>
              <Text style={styles.addBtnText}>Proceed to Pay</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View style={styles.transactionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
          </View>
          
          <View style={styles.transactionList}>
            {transactions.map(txn => {
              const amtStr = typeof txn.amount === 'string' ? txn.amount.replace('₹', '') : txn.amount;
              return (
              <View key={txn.id} style={styles.txnItem}>
                <View style={[styles.txnIconBox, { backgroundColor: txn.type === 'credit' ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={styles.txnIcon}>{txn.type === 'credit' ? '↓' : '↑'}</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.txnPurpose} numberOfLines={1}>{txn.purpose}</Text>
                  <Text style={styles.txnDate}>{txn.date || txn.time} • {txn.method || 'App'}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={[styles.txnAmount, {color: txn.type === 'credit' ? '#16a34a' : '#0f172a'}]}>
                    {txn.type === 'credit' ? '+' : '-'}₹{amtStr}
                  </Text>
                  <Text style={styles.txnStatus}>{txn.status || 'Success'}</Text>
                </View>
              </View>
            )})}
          </View>
        </ScrollView>

        {/* QR Scanner Modal (Mock) */}
        <Modal visible={showQRModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.qrModalContent}>
              <View style={styles.qrScannerBox}>
                <View style={styles.qrCornerTl} />
                <View style={styles.qrCornerTr} />
                <View style={styles.qrCornerBl} />
                <View style={styles.qrCornerBr} />
                <View style={styles.qrScanLine} />
              </View>
              <Text style={styles.qrHelpText}>Align QR code within the frame to pay local shops</Text>
              
              <TouchableOpacity style={styles.closeQrBtn} onPress={() => setShowQRModal(false)}>
                <Text style={styles.closeQrBtnText}>Close Scanner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  
  content: { padding: 16, paddingBottom: 100 },
  
  balanceCard: { padding: 24, borderRadius: 24, marginBottom: 24, elevation: 8, shadowColor: '#4338ca', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: {width:0, height:8} },
  balanceLabel: { color: '#c7d2fe', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  balanceAmount: { color: '#fff', fontSize: 44, fontWeight: '900', marginVertical: 12 },
  
  balanceActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  iconAction: { alignItems: 'center' },
  actionIconBg: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { color: '#e0e7ff', fontSize: 12, fontWeight: '600' },

  loadFundsCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  inputLabel: { color: '#64748b', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, marginBottom: 16 },
  currencySymbol: { fontSize: 24, color: '#0f172a', fontWeight: '700', marginRight: 8 },
  input: { flex: 1, paddingVertical: 16, fontSize: 24, color: '#0f172a', fontWeight: '800' },
  
  quickAmounts: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  quickAmtChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  quickAmtText: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  
  addBtn: { backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAllText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  
  transactionList: { backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 2 },
  txnItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 16 },
  txnIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnIcon: { fontSize: 20, fontWeight: 'bold' },
  txnPurpose: { color: '#0f172a', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  txnDate: { color: '#64748b', fontSize: 12 },
  txnAmount: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  txnStatus: { fontSize: 11, color: '#10b981', fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  qrModalContent: { alignItems: 'center', width: '100%' },
  qrScannerBox: { width: 250, height: 250, position: 'relative', marginBottom: 32 },
  qrCornerTl: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#3b82f6' },
  qrCornerTr: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#3b82f6' },
  qrCornerBl: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#3b82f6' },
  qrCornerBr: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#3b82f6' },
  qrScanLine: { width: '100%', height: 2, backgroundColor: '#3b82f6', position: 'absolute', top: '50%', opacity: 0.8 },
  qrHelpText: { color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 40 },
  closeQrBtn: { backgroundColor: '#fff', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 30 },
  closeQrBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 }
});
