import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Camera, Search, Minus } from 'lucide-react-native';
import { apiGet, apiPut } from '../../../lib/api';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) {}
let NetInfo = null;
try { NetInfo = require('@react-native-community/netinfo').default; } catch (e) {}

/**
 * Merchant point-of-sale panel.
 *
 * This opened on a hardcoded shelf — "Aashirvaad Atta 5kg, stock 12", "Tata Salt
 * 1kg, stock 45", "Amul Butter 500g, stock 8" — so every shop owner, whatever
 * they actually sell, saw the same three branded items presented as their own
 * inventory. SELL then decremented a number in React state and nothing else: the
 * merchant watched stock fall from 12 to 11, and the count reset on the next
 * render with no sale recorded anywhere.
 *
 * It now reads the shop's real catalog and writes each sale back, so the number
 * on screen is the number in the database.
 */
export default function RetailPOS({ themeColor = '#10b981' }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [pending, setPending] = React.useState(null);
  const [isOffline, setIsOffline] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // /shops/my-shop resolves the caller's own shop from their token and
      // returns its catalog in the same response.
      const res = await apiGet('/shops/my-shop');
      const rows = res?.products ?? [];
      setItems(
        rows.map((p) => ({
          id: String(p.id),
          name: p.name ?? '',
          stock: Number(p.stock_quantity ?? p.inventory_count ?? 0),
        }))
      );
    } catch (err) {
      // An empty shelf with a stated reason. Never an invented one.
      setItems([]);
      setLoadError(err?.message || 'Could not load your inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    let unsubscribe;
    if (NetInfo) {
      unsubscribe = NetInfo.addEventListener((state) => {
        setIsOffline(!(state.isConnected && state.isInternetReachable));
      });
    }
    return () => unsubscribe?.();
  }, []);

  const handleSell = async (item) => {
    if (item.stock <= 0 || pending) return;
    if (Haptics) {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    }

    const next = item.stock - 1;
    setPending(item.id);
    // Optimistic, then reconciled — a sale should register instantly at the
    // counter, but it must not silently disagree with the database.
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, stock: next } : p)));

    try {
      await apiPut(`/shops/my-shop/products/${item.id}`, { stock_quantity: next });
    } catch (err) {
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, stock: item.stock } : p)));
      Alert.alert('Sale not recorded', err?.message || 'Stock was left unchanged.');
    } finally {
      setPending(null);
    }
  };

  const visible = query.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  return (
    <View style={s.root}>
      <Text style={s.title}>Smart POS & Inventory</Text>

      {isOffline ? (
        <View style={s.offlineBanner}>
          <Text style={s.offlineText}>Offline — sales cannot be recorded right now.</Text>
        </View>
      ) : null}

      <TouchableOpacity style={s.scanArea}>
        <Camera size={28} color="#94a3b8" style={{ marginBottom: 4 }} />
        <Text style={s.scanText}>Tap to scan barcode</Text>
      </TouchableOpacity>

      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search size={18} color="#64748b" style={{ marginRight: 8 }} />
          {/* The search box was decorative: no value, no handler, so typing in
              it filtered nothing. */}
          <TextInput
            placeholder="Search products..."
            placeholderTextColor="#64748b"
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      <Text style={s.sectionLabel}>Quick Add Items</Text>

      {loading ? (
        <View style={s.stateBox}><ActivityIndicator color={themeColor} /></View>
      ) : visible.length === 0 ? (
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>
            {loadError ? 'Could not load your inventory' : query.trim() ? 'No matching products' : 'No products yet'}
          </Text>
          <Text style={s.stateBody}>
            {loadError || (query.trim()
              ? 'Try a different search.'
              : 'Add products to your catalog and they will appear here.')}
          </Text>
          {loadError ? (
            <TouchableOpacity style={s.retryBtn} onPress={load}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={s.listContainer}>
          {visible.map((item, idx) => (
            <View key={item.id} style={[s.listItem, idx !== visible.length - 1 && s.listBorder]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemStock}>
                  Stock: <Text style={s.stockCount}>{item.stock}</Text> units left
                </Text>
              </View>
              <TouchableOpacity
                style={[s.sellBtn, (item.stock <= 0 || pending === item.id) && s.sellBtnDisabled]}
                disabled={item.stock <= 0 || pending === item.id}
                onPress={() => handleSell(item)}
              >
                {pending === item.id ? (
                  <ActivityIndicator size="small" color="#34d399" />
                ) : (
                  <>
                    <Minus size={14} color="#10b981" style={{ marginRight: 4 }} />
                    <Text style={s.sellBtnText}>{item.stock <= 0 ? 'OUT' : 'SELL'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, marginTop: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  offlineBanner: { backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', borderRadius: 12, padding: 12, marginBottom: 16 },
  offlineText: { color: '#fca5a5', fontWeight: '700', fontSize: 12 },
  scanArea: { height: 96, backgroundColor: '#0f172a', borderWidth: 2, borderStyle: 'dashed', borderColor: '#1e293b', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  scanText: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  searchInput: { flex: 1, color: '#ffffff', fontWeight: '500', fontSize: 14 },
  sectionLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  listContainer: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  itemName: { color: '#ffffff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  itemStock: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  stockCount: { color: '#34d399', fontWeight: '700' },
  sellBtn: { minWidth: 76, minHeight: 44, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sellBtnDisabled: { opacity: 0.45 },
  sellBtnText: { color: '#34d399', fontWeight: '900', fontSize: 12 },
  stateBox: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 24, alignItems: 'center' },
  stateTitle: { color: '#ffffff', fontWeight: '800', fontSize: 14, marginBottom: 6, textAlign: 'center' },
  stateBody: { color: '#94a3b8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});
