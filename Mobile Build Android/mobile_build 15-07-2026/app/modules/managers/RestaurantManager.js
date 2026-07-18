import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ManagerLayout from './components/ManagerLayout';

const TableManagementTab = () => {
  return (
    <ScrollView style={styles.tabContainer}>
      <Text style={styles.sectionTitle}>Floor Layout (Ground)</Text>
      <View style={styles.grid}>
        <View style={[styles.tableBox, styles.tableOccupied]}>
          <Text style={styles.tableNumber}>T1</Text>
          <Text style={styles.tableStatusWhite}>Occupied</Text>
        </View>
        <View style={[styles.tableBox, styles.tableAvailable]}>
          <Text style={styles.tableNumber}>T2</Text>
          <Text style={styles.tableStatusDark}>Available</Text>
        </View>
        <View style={[styles.tableBox, styles.tableAvailable]}>
          <Text style={styles.tableNumber}>T3</Text>
          <Text style={styles.tableStatusDark}>Available</Text>
        </View>
        <View style={[styles.tableBox, styles.tableReserved]}>
          <Text style={styles.tableNumber}>T4</Text>
          <Text style={styles.tableStatusWhite}>Reserved</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default function RestaurantManager() {
  const tabs = [
    { name: 'Dine-in Table Mgmt', component: TableManagementTab },
    { name: 'KDS (Kitchen)' },
    { name: 'Menu Pricing' }
  ];

  return <ManagerLayout title="Restaurant POS" icon="restaurant" tabs={tabs} />;
}

const styles = StyleSheet.create({
  tabContainer: { paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tableBox: { width: '48%', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  tableOccupied: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  tableAvailable: { backgroundColor: '#fff' },
  tableReserved: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  tableNumber: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  tableStatusWhite: { color: '#fff', fontWeight: 'bold' },
  tableStatusDark: { color: '#64748b', fontWeight: 'bold' }
});
