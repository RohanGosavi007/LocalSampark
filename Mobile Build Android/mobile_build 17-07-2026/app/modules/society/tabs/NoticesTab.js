import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function NoticesTab({ role }) {
  const [notices] = useState([
    { id: 1, title: 'Water Supply Interruption', date: '15 Jun 2026', content: 'Due to municipal maintenance, water supply will be affected on 18 Jun from 10 AM to 4 PM. Please store sufficient water.', priority: 'High' },
    { id: 2, title: 'New Gym Equipment', date: '12 Jun 2026', content: 'We have installed 2 new treadmills in the clubhouse gym. The gym timings remain unchanged (6 AM to 10 PM).', priority: 'Normal' },
    { id: 3, title: 'Annual General Meeting', date: '10 Jun 2026', content: 'The AGM is scheduled for the last Sunday of this month at the Amphitheater. Attendance is mandatory for all flat owners.', priority: 'High' }
  ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {role === 'admin' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Publish Notice</Text>
          <Text style={styles.subtitle}>Broadcast important information to all residents and staff digitally.</Text>
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>+ Draft New Notice</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
          <Text style={styles.sectionTitle}>Digital Notice Board</Text>
          <Text style={{fontSize: 24}}>📋</Text>
        </View>
        
        {notices.map(notice => (
          <View key={notice.id} style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Text style={styles.nTitle}>{notice.title}</Text>
              {notice.priority === 'High' && (
                <View style={styles.badgeDanger}>
                  <Text style={styles.badgeDangerText}>Important</Text>
                </View>
              )}
            </View>
            <Text style={styles.nDate}>{notice.date}</Text>
            <Text style={styles.nContent}>{notice.content}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 20, fontWeight: '500', lineHeight: 18 },
  primaryBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  
  noticeCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  noticeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  nTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', flex: 1, paddingRight: 10 },
  nDate: { color: '#64748b', fontSize: 12, marginBottom: 12, fontWeight: '600' },
  nContent: { color: '#334155', fontSize: 14, lineHeight: 22 },
  
  badgeDanger: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeDangerText: { color: '#ef4444', fontSize: 11, fontWeight: '900' }
});
