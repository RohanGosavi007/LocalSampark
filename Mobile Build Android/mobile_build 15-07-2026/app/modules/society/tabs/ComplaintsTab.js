import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';

export default function ComplaintsTab({ role }) {
  const [complaints] = useState([
    { id: 1, type: 'Plumbing', title: 'Leaking tap in kitchen', status: 'In Progress', date: 'Yesterday' },
    { id: 2, type: 'Electrical', title: 'Corridor light flickering', status: 'Resolved', date: '12 Jun 2026' }
  ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {(role === 'resident' || role === 'admin') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Raise a Ticket</Text>
          <TextInput style={styles.input} placeholder="E.g. Plumbing, Electrical, Lift..." placeholderTextColor="#94a3b8" />
          <TextInput style={styles.textArea} placeholder="Describe the issue in detail..." placeholderTextColor="#94a3b8" multiline numberOfLines={4} />
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Submit Complaint</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{role === 'admin' ? 'All Society Tickets' : 'My Tickets'}</Text>
        {complaints.map(comp => (
          <View key={comp.id} style={styles.compRow}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{comp.type === 'Plumbing' ? '🚰' : '⚡'}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.compTitle}>{comp.title}</Text>
              <Text style={styles.compMeta}>{comp.type} • {comp.date}</Text>
            </View>
            <View style={[styles.badge, comp.status === 'Resolved' ? styles.badgeSuccess : styles.badgeWarning]}>
              <Text style={[styles.badgeText, comp.status === 'Resolved' ? styles.badgeSuccessText : styles.badgeWarningText]}>
                {comp.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, color: '#0f172a', padding: 12, marginBottom: 12 },
  textArea: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, color: '#0f172a', padding: 12, marginBottom: 16, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  
  compRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  icon: { fontSize: 20 },
  compTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  compMeta: { color: '#64748b', fontSize: 11 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  badgeSuccessText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  badgeWarning: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' },
  badgeWarningText: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold' }
});
