import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';

export default function DirectoryTab({ role }) {
  const [contacts] = useState([
    { id: 1, role: 'Electrician', name: 'Ramesh', phone: '9876543210' },
    { id: 2, role: 'Plumber', name: 'Suresh', phone: '8765432109' },
    { id: 3, role: 'Estate Manager', name: 'Amit Singh', phone: '9998887776' },
  ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Emergency & Staff Directory</Text>
        <TextInput style={styles.input} placeholder="Search by name or role..." placeholderTextColor="#94a3b8" />
        
        {contacts.map(c => (
          <View key={c.id} style={styles.contactRow}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📞</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.cTitle}>{c.name}</Text>
              <Text style={styles.cMeta}>{c.role}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16, color: '#0f172a' },
  
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  icon: { fontSize: 18 },
  cTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  cMeta: { color: '#64748b', fontSize: 12 },
  
  callBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  callBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 }
});
