import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MessagesTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MessagesTab</Text>
      <Text style={styles.subtitle}>Feature coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  }
});
