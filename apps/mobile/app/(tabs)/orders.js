import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState('new');
  
  const mockOrders = {
    new: [
      { id: 'ORD-8921', customer: 'Priya Sharma', items: 3, amount: '₹450', time: '10 mins ago', type: 'Delivery' },
      { id: 'ORD-8922', customer: 'Rahul Verma', items: 1, amount: '₹120', time: '5 mins ago', type: 'Pickup' }
    ],
    preparing: [
      { id: 'ORD-8919', customer: 'Amit Patel', items: 5, amount: '₹1,200', time: '25 mins ago', type: 'Delivery' }
    ],
    ready: [],
    completed: [
      { id: 'ORD-8910', customer: 'Sneha Gupta', items: 2, amount: '₹340', time: '2 hours ago', type: 'Pickup' }
    ]
  };

  const tabs = [
    { id: 'new', label: `New (${mockOrders.new.length})` },
    { id: 'preparing', label: `Cooking (${mockOrders.preparing.length})` },
    { id: 'ready', label: `Ready (${mockOrders.ready.length})` },
    { id: 'completed', label: 'Done' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
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
      </View>

      {/* Order List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {mockOrders[activeTab].length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No orders in this status</Text>
          </View>
        ) : (
          mockOrders[activeTab].map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>{order.id}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{order.type}</Text>
                </View>
              </View>
              
              <Text style={styles.customerName}>{order.customer}</Text>
              
              <View style={styles.orderMeta}>
                <Text style={styles.metaText}>{order.items} Items</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{order.time}</Text>
              </View>
              
              <View style={styles.orderFooter}>
                <Text style={styles.amount}>{order.amount}</Text>
                <View style={styles.actions}>
                  {activeTab === 'new' && (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]}><Text style={styles.actionBtnText}>Decline</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]}><Text style={styles.actionBtnText}>Accept</Text></TouchableOpacity>
                    </>
                  )}
                  {activeTab === 'preparing' && (
                    <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]}><Text style={styles.actionBtnText}>Mark Ready</Text></TouchableOpacity>
                  )}
                  {activeTab === 'ready' && order.type === 'Pickup' && (
                    <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]}><Text style={styles.actionBtnText}>Handed Over</Text></TouchableOpacity>
                  )}
                  {activeTab === 'ready' && order.type === 'Delivery' && (
                    <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: '#f59e0b', borderColor: '#d97706' }]}><Text style={styles.actionBtnText}>Assign Agent</Text></TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#ffffff', paddingHorizontal: 8, paddingBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#3b82f6' },
  
  listContainer: { padding: 16 },
  
  orderCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  typeBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold' },
  
  customerName: { color: '#e2e8f0', fontSize: 18, fontWeight: '600', marginBottom: 6 },
  
  orderMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  metaText: { color: '#64748b', fontSize: 14 },
  metaDot: { color: '#64748b', fontSize: 14, marginHorizontal: 8 },
  
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 },
  amount: { color: '#10b981', fontSize: 20, fontWeight: 'bold' },
  
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  declineBtn: { backgroundColor: 'transparent', borderColor: '#ef4444' },
  acceptBtn: { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
  actionBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#64748b', fontSize: 16 }
});
