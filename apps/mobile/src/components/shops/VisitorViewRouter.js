import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Dummy VisitorViewRouter to prevent crashes
export default function VisitorViewRouter({ shop, products, categories }) {
  if (!shop) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{shop.name || 'Shop Details'}</Text>
      <Text style={styles.subtitle}>{shop.type || 'Retail'} - {shop.address || 'Unknown Address'}</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Visitor View Route Content will be rendered here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  placeholder: {
    padding: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#64748b',
  },
});
