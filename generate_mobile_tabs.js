const fs = require('fs');
const path = require('path');

const tabsDir = path.join(__dirname, 'apps', 'mobile', 'app', '(tabs)');

const screens = [
  { name: 'products.js', title: 'Products', icon: '📦' },
  { name: 'appointments.js', title: 'Appointments', icon: '📅' },
  { name: 'available.js', title: 'Available Orders', icon: '🛒' },
  { name: 'active.js', title: 'Active Delivery', icon: '🗺️' },
  { name: 'earnings.js', title: 'Earnings', icon: '💰' },
  { name: 'bookings.js', title: 'Bookings', icon: '📅' },
  { name: 'reviews.js', title: 'Reviews', icon: '⭐' },
  { name: 'onboard.js', title: 'Onboard Shop', icon: '🏪' },
  { name: 'leads.js', title: 'Leads Tracker', icon: '📊' },
  { name: 'shops.js', title: 'My Shops', icon: '🏪' },
  { name: 'agents.js', title: 'My Agents', icon: '👥' },
];

screens.forEach(screen => {
  const filePath = path.join(tabsDir, screen.name);
  if (!fs.existsSync(filePath)) {
      const content = `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function ${screen.name.replace('.js', '').charAt(0).toUpperCase() + screen.name.replace('.js', '').slice(1)}Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>${screen.icon}</Text>
        <Text style={styles.title}>${screen.title}</Text>
        <Text style={styles.subtitle}>This module is currently under construction.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24 }
});
`;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Created ${screen.name}`);
  } else {
      console.log(`Exists: ${screen.name}`);
  }
});
