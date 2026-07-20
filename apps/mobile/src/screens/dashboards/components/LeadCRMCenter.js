import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function LeadCRMCenter({ themeColor = '#6366F1' }) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lead Pipeline</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pipeline}>
        {['New Leads', 'Contacted', 'Site Visit', 'Closed'].map((stage, i) => (
          <View key={stage} style={[styles.column, { borderColor: themeColor + '30' }]}>
            <View style={[styles.colHeader, { backgroundColor: themeColor + '10' }]}>
              <Text style={[styles.colTitle, { color: themeColor }]}>{stage}</Text>
              <Text style={styles.countText}>{3 - i}</Text>
            </View>
            
            {[1, 2].map((lead) => (
              <View key={lead} style={styles.leadCard}>
                <Text style={styles.leadName}>Amit Patel</Text>
                <Text style={styles.leadReq}>Looking for: 2 BHK Flat</Text>
                <Text style={styles.leadTime}>Budget: ₹45L - ₹55L</Text>
                
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
                    <Text style={styles.actionIcon}>📞</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
                    <Text style={styles.actionIcon}>💬</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.moveBtn, { backgroundColor: themeColor }]} onPress={handleAction}>
                    <Text style={styles.moveBtnText}>Move</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1e293b' },
  pipeline: { flexGrow: 0, paddingBottom: 10 },
  column: { width: 260, marginRight: 16, borderWidth: 1, borderRadius: 16, padding: 8, backgroundColor: '#ffffff' },
  colHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 12 },
  colTitle: { fontWeight: 'bold', fontSize: 14 },
  countText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
  leadCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginBottom: 10 },
  leadName: { fontWeight: 'bold', fontSize: 15, color: '#1e293b', marginBottom: 4 },
  leadReq: { fontSize: 13, color: '#475569', marginBottom: 2 },
  leadTime: { fontSize: 12, color: '#059669', fontWeight: '500', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  actionIcon: { fontSize: 16 },
  moveBtn: { flex: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  moveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 }
});
