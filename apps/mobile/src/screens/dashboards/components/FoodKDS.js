import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function FoodKDS({ themeColor = '#FF6B00' }) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Kitchen Display</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kanbanBoard}>
        {['Incoming', 'Preparing', 'Ready'].map((stage, i) => (
          <View key={stage} style={[styles.column, { borderColor: themeColor + '30' }]}>
            <View style={[styles.colHeader, { backgroundColor: themeColor + '10' }]}>
              <Text style={[styles.colTitle, { color: themeColor }]}>{stage}</Text>
              <View style={[styles.badge, { backgroundColor: themeColor }]}><Text style={styles.badgeText}>{3 - i}</Text></View>
            </View>
            
            {[1, 2].map(order => (
              <View key={order} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNo}>#10{order + i}</Text>
                  <Text style={styles.orderTime}>4m ago</Text>
                </View>
                <View style={styles.itemsList}>
                  <Text style={styles.itemText}>1x Margherita Pizza</Text>
                  <Text style={styles.itemText}>2x Garlic Bread</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: themeColor }]}
                  onPress={handleAction}
                >
                  <Text style={styles.actionText}>{stage === 'Incoming' ? 'Accept' : 'Next Stage'}</Text>
                </TouchableOpacity>
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
  kanbanBoard: { flexGrow: 0, paddingBottom: 10 },
  column: { width: 280, marginRight: 16, borderWidth: 1, borderRadius: 16, padding: 8, backgroundColor: '#ffffff' },
  colHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 12 },
  colTitle: { fontWeight: 'bold', fontSize: 14 },
  badge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  orderCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginBottom: 10 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderNo: { fontWeight: 'bold', fontSize: 16 },
  orderTime: { color: '#64748b', fontSize: 12 },
  itemsList: { marginBottom: 12 },
  itemText: { fontSize: 13, color: '#334155', marginBottom: 4 },
  actionBtn: { padding: 10, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});
