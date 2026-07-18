import { apiGet, apiPost, apiPut, apiDelete } from '../../../../../../../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { API_V1 } from '../../config/api';
export default function AdminApprovalsScreen() {
  const [activeTab, setActiveTab] = useState('shops');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    shops: [], events: [], properties: [], healthProviders: [],
    franchises: [], skills: [], usersKyc: [], adCampaigns: [],
    marketplace: [], redemptions: [], jobs: [], carpool: [],
    pets: [], deliveryAgents: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/admin/approvals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type, id, action) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this item?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_V1}/admin/approvals/${type}/${id}`, {
              method: 'PUT',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ action })
            });
            const json = await res.json();
            if (json.success) {
              fetchData();
            } else {
              Alert.alert('Error', json.error || 'Failed to update approval status');
            }
          } catch (e) {
            Alert.alert('Error', 'Server error');
          }
        }}
      ]
    );
  };

  const tabs = [
    { id: 'shops', label: 'Shops', icon: '🏪', count: data.shops?.length || 0 },
    { id: 'events', label: 'Events', icon: '📅', count: data.events?.length || 0 },
    { id: 'properties', label: 'Properties', icon: '🏠', count: data.properties?.length || 0 },
    { id: 'health', label: 'Health', icon: '🩺', count: data.healthProviders?.length || 0 },
    { id: 'franchises', label: 'Franchises', icon: '📍', count: data.franchises?.length || 0 },
    { id: 'skills', label: 'Providers', icon: '💼', count: data.skills?.length || 0 },
    { id: 'jobs', label: 'Jobs', icon: '📋', count: data.jobs?.length || 0 },
    { id: 'carpool', label: 'Carpool', icon: '🚗', count: data.carpool?.length || 0 },
    { id: 'marketplace', label: 'Marketplace', icon: '🛒', count: data.marketplace?.length || 0 }
  ];

  const getMappingType = (tabId) => {
    const mapping = {
      'health': 'health', 'properties': 'property', 'events': 'event',
      'franchises': 'franchise', 'skills': 'skill', 'usersKyc': 'userKyc',
      'adCampaigns': 'adCampaign', 'marketplace': 'marketplace', 'redemptions': 'redemption',
      'jobs': 'job', 'carpool': 'carpool', 'pets': 'pet', 'deliveryAgents': 'deliveryAgent',
      'shops': 'shop'
    };
    return mapping[tabId] || 'shop';
  };

  const getDetailsText = (item, tabId) => {
    switch(tabId) {
      case 'shops': return `${item.category} • ${item.phone_number}`;
      case 'events': return `${item.category || 'Event'} • ${item.venue}`;
      case 'properties': return `${item.property_type} • ₹${item.price}`;
      case 'health': return `${item.type} • ${item.specialization}`;
      case 'franchises': return `Pincode: ${item.pincode} • Owner: ${item.user_name}`;
      case 'skills': return `Exp: ${item.experience} yrs • User: ${item.user_name}`;
      case 'jobs': return `Type: ${item.category} • Shop: ${item.user_name}`;
      case 'carpool': return `To: ${item.category || item.destination} • Driver: ${item.user_name}`;
      case 'marketplace': return `Cat: ${item.category} • Price: ₹${item.price}`;
      default: return 'Pending Review';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approvals Hub</Text>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map(tab => (
            <TouchableOpacity 
              key={tab.id} 
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
              {tab.count > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{tab.count}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (data[activeTab] || []).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyDesc}>There are no pending items awaiting verification in this category.</Text>
          </View>
        ) : (
          (data[activeTab] || []).map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name || item.title || 'Untitled'}</Text>
                <Text style={styles.cardId}>ID: {String(item.id).substring(0, 8)}</Text>
              </View>
              
              <Text style={styles.cardDetails}>{getDetailsText(item, activeTab)}</Text>
              <Text style={styles.cardDate}>Requested: {new Date(item.created_at).toLocaleDateString()}</Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={styles.rejectBtn} 
                  onPress={() => handleAction(getMappingType(activeTab), item.id, 'reject')}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.approveBtn} 
                  onPress={() => handleAction(getMappingType(activeTab), item.id, 'approve')}
                >
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  tabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabsScroll: { padding: 12, gap: 12 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  tabBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  tabIcon: { fontSize: 18, marginRight: 8 },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  tabLabelActive: { color: '#3b82f6', fontWeight: '800' },
  badge: { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  content: { padding: 16, paddingBottom: 40 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, opacity: 0.5, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 },
  cardId: { fontSize: 11, color: '#94a3b8', fontWeight: '600', fontFamily: 'monospace' },
  cardDetails: { fontSize: 14, color: '#475569', marginBottom: 8 },
  cardDate: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  
  actionsRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 16 },
  rejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#fef2f2', alignItems: 'center' },
  rejectBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  approveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#10b981', alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
