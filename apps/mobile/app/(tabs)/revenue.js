import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function RevenuePortal() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'shops', label: 'By Shop' },
    { id: 'agents', label: 'By Agent' },
    { id: 'payouts', label: 'Payouts' }
  ];

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Big KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Net Revenue (MTD)</Text>
          <Text style={styles.kpiValue}>₹1,24,500</Text>
          <Text style={[styles.kpiChange, {color: '#10b981'}]}>↑ 15% vs Last Month</Text>
        </View>
      </View>
      
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, styles.kpiHalf]}>
          <Text style={styles.kpiLabel}>Commissions</Text>
          <Text style={styles.kpiValueSmall}>₹45,200</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiHalf]}>
          <Text style={styles.kpiLabel}>Subscriptions</Text>
          <Text style={styles.kpiValueSmall}>₹79,300</Text>
        </View>
      </View>

      {/* Mock Chart Area */}
      <View style={styles.chartContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <TouchableOpacity><Text style={styles.filterText}>This Month ▼</Text></TouchableOpacity>
        </View>
        <View style={styles.mockChart}>
          {/* Simple CSS bars to mock a chart */}
          {[40, 60, 45, 80, 50, 90, 75].map((height, i) => (
            <View key={i} style={styles.barColumn}>
              <View style={[styles.bar, { height: `${height}%` }]} />
              <Text style={styles.barLabel}>W{i+1}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Settlements</Text>
      </View>
      <View style={styles.transactionList}>
        {[
          { shop: 'Sharma Grocery', amount: '₹4,500', fee: '₹225', time: 'Today, 2:30 PM' },
          { shop: 'Local Pharmacy', amount: '₹1,200', fee: '₹60', time: 'Today, 11:15 AM' },
          { shop: 'Sai Services', amount: '₹800', fee: '₹40', time: 'Yesterday' }
        ].map((trx, i) => (
          <View key={i} style={styles.trxItem}>
            <View>
              <Text style={styles.trxShop}>{trx.shop}</Text>
              <Text style={styles.trxTime}>{trx.time}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.trxAmount}>{trx.amount}</Text>
              <Text style={styles.trxFee}>Fee: {trx.fee}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Revenue Portal</Text>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(tab => (
            <TouchableOpacity 
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'overview' ? renderOverview() : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚧</Text>
            <Text style={styles.emptyText}>{tabs.find(t=>t.id===activeTab).label} module is under construction.</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },
  
  tabContainer: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  tab: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  activeTabText: { color: '#3b82f6' },
  
  scrollContent: { padding: 16 },
  tabContent: { flex: 1 },
  
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 16 },
  kpiCard: { flex: 1, backgroundColor: '#ffffff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  kpiHalf: { padding: 16 },
  kpiLabel: { color: '#64748b', fontSize: 13, fontWeight: '500', marginBottom: 8 },
  kpiValue: { color: '#0f172a', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  kpiValueSmall: { color: '#0f172a', fontSize: 22, fontWeight: 'bold' },
  kpiChange: { fontSize: 13, fontWeight: '600' },
  
  chartContainer: { backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  filterText: { color: '#3b82f6', fontSize: 13, fontWeight: '500' },
  mockChart: { height: 150, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 20 },
  barColumn: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: 16, backgroundColor: '#3b82f6', borderRadius: 8, marginBottom: 8 },
  barLabel: { color: '#64748b', fontSize: 10 },
  
  transactionList: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16 },
  trxItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  trxShop: { color: '#0f172a', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  trxTime: { color: '#64748b', fontSize: 12 },
  trxAmount: { color: '#10b981', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  trxFee: { color: '#ef4444', fontSize: 12 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#64748b', fontSize: 16 }
});
