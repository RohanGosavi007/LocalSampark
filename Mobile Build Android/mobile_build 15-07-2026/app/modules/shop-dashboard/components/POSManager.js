import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function POSManager() {
  const [scannedItems, setScannedItems] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  
  const handleBarcodeScanned = ({ type, data }) => {
    setIsScanning(false);
    setScannedItems([...scannedItems, { id: Date.now(), name: `Scanned Item (${data.slice(-4)})`, price: 200 }]);
    Alert.alert('Scanned!', `Barcode: ${data}`);
  };

  const startScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Error', 'Camera permission required');
        return;
      }
    }
    setIsScanning(true);
  };
  
  const total = scannedItems.reduce((sum, item) => sum + item.price, 0);
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>📠 POS Terminal</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>Live Register</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Scan Barcode or Search Item..."
        />
        <TouchableOpacity style={styles.searchBtn} onPress={startScanner}>
          <Ionicons name="barcode-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Barcode Scanner Modal */}
      <Modal visible={isScanning} animationType="slide" transparent={false}>
        <View style={{ flex: 1 }}>
          <CameraView 
            style={StyleSheet.absoluteFillObject} 
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a'] }}
            onBarcodeScanned={handleBarcodeScanned} 
          />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setIsScanning(false)}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Text style={styles.subtitle}>Quick Items</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickItemsScroll}>
        {[1, 2, 3, 4, 5].map(i => (
          <TouchableOpacity key={i} style={styles.quickItem} onPress={() => {
            setScannedItems([...scannedItems, { id: Date.now(), name: `Item ${i}`, price: 150 }]);
          }}>
            <Text style={{ fontSize: 24 }}>📦</Text>
            <Text style={styles.quickItemName}>Item {i}</Text>
            <Text style={styles.quickItemPrice}>₹150</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.cartContainer}>
        <Text style={styles.cartTitle}>Current Order ({scannedItems.length} items)</Text>
        {scannedItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={{ color: '#9ca3af' }}>No items scanned yet</Text>
          </View>
        ) : (
          <ScrollView style={{ height: 100, marginBottom: 12 }}>
            {scannedItems.map((item, idx) => (
              <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>{idx + 1}. {item.name}</Text>
                <Text>₹{item.price}</Text>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>₹{total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.payBtn} onPress={() => {
          Alert.alert('Success', 'Payment completed via Card.');
          setScannedItems([]);
        }}>
          <Text style={styles.payBtnText}>💳 Pay via Card</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.payBtn, { backgroundColor: '#6b7280' }]}>
          <Text style={styles.payBtnText}>💵 Cash</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  liveBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  liveText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44, backgroundColor: '#fff' },
  searchBtn: { backgroundColor: '#3b82f6', width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  quickItemsScroll: { marginBottom: 16 },
  quickItem: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginRight: 12, alignItems: 'center', width: 100 },
  quickItemName: { fontWeight: 'bold', marginVertical: 4 },
  quickItemPrice: { color: '#3b82f6' },
  cartContainer: { backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  cartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyCart: { height: 100, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalAmount: { fontSize: 18, fontWeight: 'bold' },
  payBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  payBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#ef4444', padding: 16, borderRadius: 8 }
});
