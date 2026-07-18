import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';

export default function FranchiseAgents() {
  const [agents] = useState([
    { id: 'FA-101', name: 'Ramesh Singh', role: 'Field Agent', onboardedShops: 42, earnings: '₹14,500', status: 'Active' },
    { id: 'FA-105', name: 'Suresh Patil', role: 'Field Agent', onboardedShops: 12, earnings: '₹4,200', status: 'Active' },
    { id: 'DA-204', name: 'Kiran Kumar', role: 'Delivery Agent', deliveries: 156, earnings: '₹8,900', status: 'Inactive' },
  ]);

  const handleMessage = (name) => {
    Alert.alert('Message Agent', `Opening chat with ${name}...`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 My Team (Agents)</Text>
        <Text style={styles.subtitle}>Field & Delivery Agents in Territory</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {agents.map(agent => (
          <View key={agent.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.agentName}>{agent.name}</Text>
              <View style={[styles.statusBadge, agent.status === 'Active' ? styles.statusActive : styles.statusInactive]}>
                <Text style={[styles.statusText, agent.status === 'Active' ? {color: '#10b981'} : {color: '#ef4444'}]}>
                  {agent.status}
                </Text>
              </View>
            </View>

            <Text style={styles.roleText}>🏷️ {agent.role}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{agent.role === 'Field Agent' ? 'Shops Onboarded' : 'Deliveries'}</Text>
                <Text style={styles.statValue}>{agent.onboardedShops || agent.deliveries}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Earnings</Text>
                <Text style={styles.statValue}>{agent.earnings}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.msgBtn} onPress={() => handleMessage(agent.name)}>
                <Text style={styles.msgBtnText}>💬 Message Agent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailsBtn}>
                <Text style={styles.detailsBtnText}>View KPI</Text>
              </TouchableOpacity>
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
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  
  content: { padding: 15 },
  
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  agentName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusActive: { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' },
  statusInactive: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  
  roleText: { color: '#475569', fontSize: 14, marginBottom: 15 },
  
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#f8fafc', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statLabel: { color: '#64748b', fontSize: 11, marginBottom: 5, textAlign: 'center' },
  statValue: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', gap: 10 },
  msgBtn: { flex: 1, backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  msgBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  detailsBtn: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  detailsBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 14 }
});
