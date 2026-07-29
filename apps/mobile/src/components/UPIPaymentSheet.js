import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { CreditCard, Banknote, ChevronRight, CheckCircle2 } from 'lucide-react-native';

/**
 * 10x UPI-First Checkout Experience
 * Highlights top UPI apps for single-click intent invocation to reduce cart abandonment.
 */
export default function UPIPaymentSheet({ totalAmount, onSelectPayment }) {
  const UPI_APPS = [
    { id: 'gpay', name: 'Google Pay', iconColor: '#EA4335', shortCode: 'GPay' },
    { id: 'phonepe', name: 'PhonePe', iconColor: '#5f259f', shortCode: 'PhonePe' },
    { id: 'paytm', name: 'Paytm', iconColor: '#00BAF2', shortCode: 'Paytm' },
    { id: 'bhim', name: 'BHIM UPI', iconColor: '#F97316', shortCode: 'BHIM' },
  ];

  return (
    <View style={styles.sheetContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Payment Method</Text>
        <Text style={styles.amount}>To Pay: ₹{totalAmount}</Text>
      </View>

      <Text style={styles.sectionTitle}>Recommended (Fast & Secure)</Text>
      
      <View style={styles.upiGrid}>
        {UPI_APPS.map((app) => (
          <TouchableOpacity 
            key={app.id} 
            style={styles.upiCard}
            onPress={() => onSelectPayment(app.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.upiIconBg, { backgroundColor: app.iconColor + '20' }]}>
              {/* Simulated Icon for UPI Apps */}
              <View style={[styles.upiIcon, { backgroundColor: app.iconColor }]} />
            </View>
            <Text style={styles.upiName}>{app.shortCode}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Other Options</Text>

      <TouchableOpacity 
        style={styles.otherOptionCard} 
        onPress={() => onSelectPayment('cod')}
        activeOpacity={0.7}
      >
        <View style={styles.optionLeft}>
          <View style={[styles.optionIconBg, { backgroundColor: '#E6F7F1' }]}>
            <Banknote color="#00B074" size={24} />
          </View>
          <View>
            <Text style={styles.optionTitle}>Cash on Delivery (COD)</Text>
            <Text style={styles.optionSub}>Pay at your doorstep</Text>
          </View>
        </View>
        <ChevronRight color="#CBD5E1" size={24} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.otherOptionCard} 
        onPress={() => onSelectPayment('cards')}
        activeOpacity={0.7}
      >
        <View style={styles.optionLeft}>
          <View style={[styles.optionIconBg, { backgroundColor: '#F1F5F9' }]}>
            <CreditCard color="#64748B" size={24} />
          </View>
          <View>
            <Text style={styles.optionTitle}>Credit / Debit Cards</Text>
            <Text style={styles.optionSub}>Visa, Mastercard, RuPay</Text>
          </View>
        </View>
        <ChevronRight color="#CBD5E1" size={24} />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1D36',
  },
  amount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00B074',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  upiCard: {
    alignItems: 'center',
    width: '22%',
  },
  upiIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  upiIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  upiName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1D36',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginBottom: 24,
  },
  otherOptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D36',
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 13,
    color: '#64748B',
  }
});
