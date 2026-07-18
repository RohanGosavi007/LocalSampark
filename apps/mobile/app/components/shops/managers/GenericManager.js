import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Package, Calendar, Settings, TrendingUp } from 'lucide-react-native';

export default function GenericManager({ shop, type }) {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manager Dashboard</Text>
        <Text style={styles.subtitle}>{shop.name} ({type})</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'orders' && styles.activeTab]} onPress={() => setActiveTab('orders')}>
          {type === 'appointment' ? <Calendar size={20} color={activeTab === 'orders' ? '#4f46e5' : '#6b7280'} /> : <Package size={20} color={activeTab === 'orders' ? '#4f46e5' : '#6b7280'} />}
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            {type === 'appointment' ? 'Appointments' : 'Orders'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.tab, activeTab === 'analytics' && styles.activeTab]} onPress={() => setActiveTab('analytics')}>
          <TrendingUp size={20} color={activeTab === 'analytics' ? '#4f46e5' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'settings' && styles.activeTab]} onPress={() => setActiveTab('settings')}>
          <Settings size={20} color={activeTab === 'settings' ? '#4f46e5' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'orders' && (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>No Active {type === 'appointment' ? 'Appointments' : 'Orders'}</Text>
            <Text style={styles.placeholderDesc}>When customers place an order, it will appear here in real-time.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4, borderRadius: 8 },
  activeTab: { backgroundColor: '#eef2ff' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
  activeTabText: { color: '#4f46e5' },
  content: { flex: 1, padding: 16 },
  placeholderCard: { padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', marginTop: 24 },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  placeholderDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center' }
});
