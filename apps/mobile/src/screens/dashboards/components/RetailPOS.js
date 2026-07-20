import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import { OfflineQueueService } from '../../../services/OfflineQueueService';

export default function RetailPOS({ themeColor = '#00E676' }) {
  const [items, setItems] = React.useState([
    { id: 1, name: 'Aashirvaad Atta 5kg', stock: 12 },
    { id: 2, name: 'Tata Salt 1kg', stock: 45 },
    { id: 3, name: 'Amul Butter 500g', stock: 8 }
  ]);
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });
    return () => unsubscribe();
  }, []);

  const handleAction = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Optimistic Update
    setItems(prev => prev.map(p => 
      p.id === item.id ? { ...p, stock: p.stock - 1 } : p
    ));

    // Offline Queue
    try {
      if (isOffline) {
        await OfflineQueueService.enqueue(`/api/v1/shops/inventory/decrement`, 'POST', { productId: item.id });
        alert('Saved offline. Will sync when connection is restored.');
      } else {
        // Normal API call would go here
        // await fetch(...)
      }
    } catch (e) {
      console.log('Error queueing:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart POS & Inventory</Text>
      
      <View style={styles.scannerBox}>
        <Text style={styles.scannerIcon}>📷</Text>
        <Text style={styles.scannerText}>Tap to scan barcode</Text>
      </View>
      
      <View style={styles.searchRow}>
        <TextInput 
          placeholder="Search products..."
          style={[styles.searchInput, { borderColor: themeColor + '50' }]}
        />
        <TouchableOpacity style={[styles.btn, { backgroundColor: themeColor }]} onPress={handleAction}>
          <Text style={styles.btnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subTitle}>Quick Add Items</Text>
      <ScrollView style={styles.itemList}>
        {items.map((item) => (
          <View key={item.id} style={styles.productRow}>
            <View>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productStock}>Stock: {item.stock} units left</Text>
            </View>
            <TouchableOpacity style={[styles.addBtn, { borderColor: themeColor }]} onPress={() => handleAction(item)}>
              <Text style={[styles.addBtnText, { color: themeColor }]}>- SELL</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
  scannerBox: { height: 100, backgroundColor: '#f1f5f9', borderRadius: 16, borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  scannerIcon: { fontSize: 32, marginBottom: 4 },
  scannerText: { color: '#64748b', fontWeight: '500' },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, backgroundColor: '#fff' },
  btn: { paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  subTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#1e293b' },
  itemList: { backgroundColor: '#fff', borderRadius: 16, padding: 12 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  productName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  productStock: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 8 },
  addBtnText: { fontWeight: 'bold', fontSize: 12 }
});
