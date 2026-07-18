import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Utensils } from 'lucide-react-native';

export default function TiffinSubscriptionManager({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tiffin & Meal Planner</Text>
        <Text style={styles.subtitle}>{shop.name}</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.placeholderCard}>
          <Utensils size={32} color="#059669" />
          <Text style={styles.placeholderTitle}>Active Subscriptions</Text>
          <Text style={styles.placeholderDesc}>No active meal plans for today.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecfdf5' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#a7f3d0' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#065f46' },
  subtitle: { fontSize: 14, color: '#047857', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  placeholderCard: { padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#a7f3d0', alignItems: 'center', marginTop: 24 },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#065f46', marginTop: 12, marginBottom: 8 },
  placeholderDesc: { fontSize: 13, color: '#047857', textAlign: 'center' }
});
