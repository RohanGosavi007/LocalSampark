import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CampaignBuilder() {
  const [title, setTitle] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [fomoTimer, setFomoTimer] = useState('30');

  const handleCreate = () => {
    if (!title) {
      Alert.alert("Error", "Please enter a campaign title.");
      return;
    }
    Alert.alert("Success", `Campaign "${title}" created and scheduled!`);
    setTitle('');
    setDiscountValue('');
    setIsFlashSale(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>🚀 Campaign Engine</Text>
          <Text style={styles.headerSubtitle}>Schedule promotions & flash sales</Text>
        </View>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Campaign Title</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g., Weekend Grocery Bonanza"
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.pickerFake}>
            <Text>% Percentage</Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </View>
        </View>
        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Value</Text>
          <TextInput 
            style={styles.input} 
            placeholder="20"
            keyboardType="numeric"
            value={discountValue}
            onChangeText={setDiscountValue}
          />
        </View>
      </View>

      <View style={styles.flashSaleBox}>
        <View style={styles.flashSaleHeader}>
          <View style={styles.flashSaleHeaderLeft}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#d97706" />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.flashSaleTitle}>Flash Sale Mode</Text>
              <Text style={styles.flashSaleDesc}>Activate FOMO timer</Text>
            </View>
          </View>
          <Switch 
            value={isFlashSale} 
            onValueChange={setIsFlashSale} 
            trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
            thumbColor={Platform.OS === 'ios' ? undefined : (isFlashSale ? '#fff' : '#fff')}
          />
        </View>
        
        {isFlashSale && (
          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>Timer (Minutes)</Text>
            <TextInput 
              style={styles.timerInput}
              keyboardType="numeric"
              value={fomoTimer}
              onChangeText={setFomoTimer}
            />
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
        <Ionicons name="play" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.submitBtnText}>Schedule Campaign</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  proBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  proBadgeText: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
  },
  pickerFake: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashSaleBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  flashSaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashSaleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashSaleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
  flashSaleDesc: {
    fontSize: 12,
    color: '#b45309',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#fde68a',
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400e',
  },
  timerInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#92400e',
  },
  submitBtn: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
