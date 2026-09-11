import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';

export default function DirectoryTab({ role }) {
  // Three named people with phone numbers — an electrician, a plumber and an
  // estate manager — presented as this society's own staff directory. A resident
  // with a burst pipe would have called a stranger. Nothing in the backend holds
  // a society staff list, so the tab says so rather than inventing one.
  const [contacts] = useState([]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Emergency & Staff Directory</Text>
        <TextInput style={styles.input} placeholder="Search by name or role..." placeholderTextColor="#94a3b8" />
        
        {contacts.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>No contacts listed</Text>
            <Text style={styles.stateBody}>
              Your committee has not published a staff directory yet.
            </Text>
          </View>
        ) : contacts.map(c => (
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
  stateBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
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
