import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { apiGet } from '../../../../src/lib/api';

/**
 * Three notices were hardcoded here — a water-supply interruption on the 18th,
 * new gym equipment, and an AGM described as "mandatory for all flat owners".
 * Every resident of every society saw the same three, and a resident could
 * reasonably have stored water for a cut that was not happening or set aside a
 * Sunday for a meeting nobody had called.
 */
export default function NoticesTab({ role }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet('/society/notices');
        const rows = res?.notices ?? res?.data ?? (Array.isArray(res) ? res : []);
        setNotices(
          rows.map((n) => ({
            id: String(n.id),
            title: n.title || 'Notice',
            date: n.created_at
              ? new Date(n.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
              : '',
            content: n.content || n.body || '',
            priority: n.priority || 'Normal',
          }))
        );
      } catch (err) {
        setNotices([]);
        setError(err?.message || 'Could not load notices.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        
        {loading ? (
          <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
        ) : notices.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>
              {error ? 'Could not load notices' : 'No notices yet'}
            </Text>
            <Text style={styles.stateBody}>
              {error || 'Notices your committee publishes will appear here.'}
            </Text>
          </View>
        ) : notices.map(notice => (
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
  stateBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
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
