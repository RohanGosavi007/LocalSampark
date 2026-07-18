import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';

export default function FieldLeads() {
  const [activeFilter, setActiveFilter] = useState('All');
  
  const leads = [
    { id: 1, name: 'Gupta Medicals', phone: '9876543210', status: 'Follow Up', lastContact: '2 days ago', note: 'Interested, needs demo.' },
    { id: 2, name: 'Sunny Hardware', phone: '9988776655', status: 'Pending KYC', lastContact: 'Yesterday', note: 'Awaiting PAN card upload.' },
    { id: 3, name: 'Royal Bakery', phone: '9123456789', status: 'Not Interested', lastContact: '1 week ago', note: 'Using Zomato, fees issue.' },
    { id: 4, name: 'Modern Salon', phone: '9001122334', status: 'Follow Up', lastContact: 'Today', note: 'Call back at 5 PM.' },
  ];

  const filtered = activeFilter === 'All' ? leads : leads.filter(l => l.status === activeFilter);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Follow Up': return '#3b82f6';
      case 'Pending KYC': return '#f59e0b';
      case 'Not Interested': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📈 Sales Pipeline</Text>
      </View>

      <View style={styles.filterRow}>
        {['All', 'Follow Up', 'Pending KYC', 'Not Interested'].map(f => (
          <TouchableOpacity 
            key={f} 
            style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterBtnText, activeFilter === f && styles.filterBtnTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.map(lead => (
          <View key={lead.id} style={styles.leadCard}>
            <View style={styles.leadHeader}>
              <Text style={styles.leadName}>{lead.name}</Text>
              <View style={[styles.statusBadge, {borderColor: getStatusColor(lead.status)}]}>
                <Text style={[styles.statusText, {color: getStatusColor(lead.status)}]}>{lead.status}</Text>
              </View>
            </View>
            
            <Text style={styles.leadPhone}>📞 {lead.phone}</Text>
            <Text style={styles.leadNote}>📝 {lead.note}</Text>
            
            <View style={styles.footerRow}>
              <Text style={styles.lastContact}>Last: {lead.lastContact}</Text>
              <View style={styles.actionBtns}>
                <TouchableOpacity style={styles.iconBtn}><Text>📱</Text></TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}><Text>✅</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  
  filterRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexWrap: 'wrap', gap: 10 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  filterBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterBtnText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  filterBtnTextActive: { color: '#0f172a' },

  content: { padding: 15 },
  
  leadCard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  leadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  leadName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  
  leadPhone: { color: '#475569', fontSize: 13, marginBottom: 5 },
  leadNote: { color: '#64748b', fontSize: 13, marginBottom: 15, fontStyle: 'italic' },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  lastContact: { color: '#64748b', fontSize: 11 },
  actionBtns: { flexDirection: 'row', gap: 10 },
  iconBtn: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }
});
