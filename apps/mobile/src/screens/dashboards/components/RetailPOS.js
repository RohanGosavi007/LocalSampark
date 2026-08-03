import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Camera, Search, ShoppingBag, Minus, Plus } from 'lucide-react-native';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) {}
let NetInfo = null;
try { NetInfo = require('@react-native-community/netinfo').default; } catch (e) {}

export default function RetailPOS({ themeColor = '#10b981' }) {
  const [items, setItems] = React.useState([
    { id: 1, name: 'Aashirvaad Atta 5kg', stock: 12 },
    { id: 2, name: 'Tata Salt 1kg', stock: 45 },
    { id: 3, name: 'Amul Butter 500g', stock: 8 }
  ]);
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    let unsubscribe;
    if (NetInfo) { unsubscribe = NetInfo.addEventListener(state => { setIsOffline(!(state.isConnected && state.isInternetReachable)); }); }
    return () => unsubscribe?.();
  }, []);

  const handleAction = async (item) => {
    if (Haptics) { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e) {} }
    setItems(prev => prev.map(p => p.id === item.id ? { ...p, stock: Math.max(0, p.stock - 1) } : p));
  };

  return (
    <View style={s.root}>
      <Text style={s.title}>Smart POS & Inventory</Text>
      <TouchableOpacity style={s.scanArea}><Camera size={28} color="#94a3b8" style={{ marginBottom: 4 }} /><Text style={s.scanText}>Tap to scan barcode</Text></TouchableOpacity>
      <View style={s.searchRow}>
        <View style={s.searchBox}><Search size={18} color="#64748b" style={{ marginRight: 8 }} /><TextInput placeholder="Search products..." placeholderTextColor="#64748b" style={s.searchInput} /></View>
        <TouchableOpacity style={s.searchBtn}><Text style={s.searchBtnText}>Search</Text></TouchableOpacity>
      </View>
      <Text style={s.sectionLabel}>Quick Add Items</Text>
      <View style={s.listContainer}>
        {items.map((item, idx) => (
          <View key={item.id} style={[s.listItem, idx !== items.length - 1 && s.listBorder]}>
            <View style={{ flex: 1, marginRight: 8 }}><Text style={s.itemName}>{item.name}</Text><Text style={s.itemStock}>Stock: <Text style={s.stockCount}>{item.stock}</Text> units left</Text></View>
            <TouchableOpacity style={s.sellBtn} onPress={() => handleAction(item)}><Minus size={14} color="#10b981" style={{ marginRight: 4 }} /><Text style={s.sellBtnText}>SELL</Text></TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, marginTop: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  scanArea: { height: 96, backgroundColor: '#0f172a', borderWidth: 2, borderStyle: 'dashed', borderColor: '#1e293b', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  scanText: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  searchInput: { flex: 1, color: '#ffffff', fontWeight: '500', fontSize: 14 },
  searchBtn: { backgroundColor: '#059669', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12, alignItems: 'center' },
  searchBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  sectionLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  listContainer: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  itemName: { color: '#ffffff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  itemStock: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  stockCount: { color: '#34d399', fontWeight: '700' },
  sellBtn: { backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  sellBtnText: { color: '#34d399', fontWeight: '900', fontSize: 12 },
});
