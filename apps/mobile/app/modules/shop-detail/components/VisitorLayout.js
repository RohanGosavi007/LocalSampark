import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function VisitorLayout({ shopName, shopAddress, shopIcon, children, cartCount, onCheckout }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Shop Details</Text>
        <TouchableOpacity style={styles.shareBtn}><Text style={{fontSize: 20}}>🔗</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.shopHero}>
          <LinearGradient colors={['#3b82f6', '#1e3a8a']} style={styles.heroBg} />
          <View style={styles.shopLogoBox}>
            <Text style={{fontSize: 40}}>{shopIcon || '🏪'}</Text>
          </View>
          <Text style={styles.shopName}>{shopName}</Text>
          <Text style={styles.shopAddress}>📍 {shopAddress}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>⭐ 4.8</Text>
              <Text style={styles.statLabel}>214 Ratings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>🚀 15 min</Text>
              <Text style={styles.statLabel}>Delivery</Text>
            </View>
          </View>
          
          <View style={styles.offerBadge}>
            <Text style={{fontSize: 16, marginRight: 8}}>🏷️</Text>
            <Text style={styles.offerText}>Get 10% Off on orders above ₹500. Code: LOCAL10</Text>
          </View>
        </View>

        {children}

      </ScrollView>

      {cartCount > 0 && (
        <View style={styles.cartBottomBar}>
          <View>
            <Text style={styles.cartItemCount}>{cartCount} Item(s) in Cart</Text>
            <Text style={styles.cartTotal}>Proceed to pay</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout}>
            <Text style={styles.checkoutBtnText}>Checkout →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', paddingTop: 40 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: '#334155' },
  shareBtn: { padding: 8 },
  
  content: { paddingBottom: 100 },
  
  shopHero: { backgroundColor: '#fff', alignItems: 'center', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#e2e8f0', position: 'relative' },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  shopLogoBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginBottom: 12, marginTop: -20 },
  shopName: { fontSize: 22, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 4 },
  shopAddress: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 20, width: '100%' },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  
  offerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', width: '100%' },
  offerText: { flex: 1, fontSize: 12, color: '#b45309', fontWeight: 'bold' },
  
  cartBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  cartItemCount: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  cartTotal: { fontSize: 12, color: '#64748b' },
  checkoutBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  checkoutBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
