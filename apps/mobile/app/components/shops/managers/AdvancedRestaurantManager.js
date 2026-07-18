import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChefHat, ListOrdered, CheckCircle2, Navigation } from 'lucide-react-native';

export default function AdvancedRestaurantManager({ shop }) {
  const [activeTab, setActiveTab] = useState('kds');

  const mockOrders = [
    { id: 'ORD-001', items: '2x Paneer Tikka, 1x Naan', status: 'preparing', time: '5m ago' },
    { id: 'ORD-002', items: '1x Veg Biryani, 1x Raita', status: 'new', time: '1m ago' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Restaurant KDS & Orders</Text>
        <Text style={styles.subtitle}>{shop.name}</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'kds' && styles.activeTab]} onPress={() => setActiveTab('kds')}>
          <ChefHat size={20} color={activeTab === 'kds' ? '#f97316' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'kds' && styles.activeTabText]}>KDS View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.tab, activeTab === 'delivery' && styles.activeTab]} onPress={() => setActiveTab('delivery')}>
          <Navigation size={20} color={activeTab === 'delivery' ? '#f97316' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'delivery' && styles.activeTabText]}>Dispatch</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'kds' && (
          <View style={styles.kdsGrid}>
            <View style={styles.column}>
              <View style={styles.colHeader}><Text style={styles.colTitle}>New Tickets</Text></View>
              {mockOrders.filter(o => o.status === 'new').map(o => (
                <View key={o.id} style={styles.ticket}>
                  <Text style={styles.ticketId}>{o.id}</Text>
                  <Text style={styles.ticketItems}>{o.items}</Text>
                  <TouchableOpacity style={styles.btnStart}><Text style={styles.btnText}>Start Prep</Text></TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.column}>
              <View style={[styles.colHeader, {backgroundColor: '#fff7ed'}]}><Text style={[styles.colTitle, {color: '#ea580c'}]}>Preparing</Text></View>
              {mockOrders.filter(o => o.status === 'preparing').map(o => (
                <View key={o.id} style={[styles.ticket, {borderColor: '#fed7aa'}]}>
                  <Text style={styles.ticketId}>{o.id}</Text>
                  <Text style={styles.ticketItems}>{o.items}</Text>
                  <TouchableOpacity style={styles.btnReady}><Text style={styles.btnText}>Mark Ready</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4, borderRadius: 8 },
  activeTab: { backgroundColor: '#fff7ed' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
  activeTabText: { color: '#ea580c' },
  content: { flex: 1 },
  kdsGrid: { flexDirection: 'row', gap: 12, padding: 12 },
  column: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 8 },
  colHeader: { padding: 8, backgroundColor: '#e5e7eb', borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  colTitle: { fontSize: 12, fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' },
  ticket: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  ticketId: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 4 },
  ticketItems: { fontSize: 13, color: '#4b5563', marginBottom: 12 },
  btnStart: { backgroundColor: '#f97316', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnReady: { backgroundColor: '#10b981', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});
