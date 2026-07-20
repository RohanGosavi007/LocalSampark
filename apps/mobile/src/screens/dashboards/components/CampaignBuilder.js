import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';

export default function CampaignBuilder({ shopId }) {
  const [title, setTitle] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [isFlashSale, setIsFlashSale] = useState(false);

  const handleCreate = () => {
    Alert.alert('Campaign Created', `"${title}" has been scheduled successfully!`);
    setTitle('');
    setDiscountValue('');
    setIsFlashSale(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Campaign</Text>

      <Text style={styles.label}>Campaign Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Weekend Flash Sale"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Discount Value (₹ or %)</Text>
      <TextInput
        style={styles.input}
        placeholder="20"
        keyboardType="numeric"
        value={discountValue}
        onChangeText={setDiscountValue}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Flash Sale (FOMO Timer)?</Text>
        <Switch
          value={isFlashSale}
          onValueChange={setIsFlashSale}
          trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleCreate}>
        <Text style={styles.buttonText}>Schedule Campaign</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
