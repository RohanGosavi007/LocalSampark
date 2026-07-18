import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ManagerLayout({ title, icon, tabs }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title} Pro</Text>
        <Ionicons name={icon} size={24} color="#3b82f6" />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.tabBtn, activeTab === idx && styles.activeTabBtn]}
              onPress={() => setActiveTab(idx)}
            >
              <Text style={[styles.tabText, activeTab === idx && styles.activeTabText]}>{tab.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {tabs[activeTab] && tabs[activeTab].component ? (
          tabs[activeTab].component()
        ) : (
          <View style={styles.genericDataBox}>
            <View style={styles.genericDataHeader}>
              <Text style={styles.genericDataTitle}>{tabs[activeTab]?.name || 'Module'}</Text>
              <TouchableOpacity style={styles.genericDataBtn}><Text style={styles.genericDataBtnText}>+ Add New</Text></TouchableOpacity>
            </View>
            <View style={styles.emptyStateContainer}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateTitle}>No Records Found</Text>
              <Text style={styles.emptyStateSub}>There is currently no data to display for {tabs[activeTab]?.name}.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  backBtn: { padding: 4 },
  
  tabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  tabsScroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  activeTabBtn: { backgroundColor: '#1e3a8a' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#4b5563' },
  activeTabText: { color: '#fff' },
  
  content: { padding: 16 },
  
  genericDataBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginTop: 8 },
  genericDataHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottomWidth: 1, borderColor: '#f1f5f9', paddingBottom: 12 },
  genericDataTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  genericDataBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  genericDataBtnText: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold' },
  emptyStateContainer: { alignItems: 'center', paddingVertical: 32 },
  emptyStateTitle: { fontSize: 15, fontWeight: 'bold', color: '#64748b', marginTop: 12, marginBottom: 4 },
  emptyStateSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' }
});
