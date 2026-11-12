import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useCartStore } from '../../src/store/cartStore';
import { listWishlist, unsaveProduct, moveToCart, readRecent, clearRecent } from '../../src/services/product';

/**
 * Saved items and recently viewed (C12). Saved items are the customer's on the
 * server (the same list as the web's /wishlist); recently viewed is this phone's.
 */
export default function WishlistScreen() {
  const router = useRouter();
  const { authToken } = useAuth() || {};
  const [items, setItems] = useState(null);
  const [recent, setRecent] = useState([]);
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    if (!authToken) { setItems([]); return; }
    listWishlist().then(setItems).catch(() => setItems([]));
  }, [authToken]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { readRecent().then(setRecent); }, []);

  const toCart = async (item) => {
    setNotice(null);
    try {
      await moveToCart(item.productId);
      await useCartStore.getState().pullFromServer();
      setNotice({ ok: true, text: `${item.productName} is in your cart.` });
      load();
    } catch (e) {
      setNotice({ ok: false, text: e?.message || 'Could not move it to the cart.' });
    }
  };

  const remove = async (item) => {
    setItems((list) => list.filter((i) => i.productId !== item.productId));
    try { await unsaveProduct(item.productId); } catch { load(); }
  };

  const open = (shopId, productId) => router.push(`/product/${encodeURIComponent(shopId)}/${encodeURIComponent(productId)}`);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>Saved items</Text>
        {!authToken ? <Text style={styles.muted}>Sign in to see the items you have saved.</Text> : null}
        {notice ? <Text style={[styles.notice, { color: notice.ok ? '#15803d' : '#dc2626' }]}>{notice.text}</Text> : null}
        {authToken && items && items.length === 0 ? <Text style={styles.muted}>Nothing saved yet. Tap ♡ Save on a product to keep it here.</Text> : null}
        {(items || []).map((item) => (
          <View key={item.id} style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => open(item.shopId, item.productId)}>
              <View style={styles.thumb}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.productName}</Text>
                <Text style={styles.muted}>{item.shopName}</Text>
                <Text style={styles.price}>₹{item.price}{item.mrp > item.price ? `  (MRP ₹${item.mrp})` : ''}</Text>
                {!item.isAvailable ? <Text style={styles.out}>Not available right now</Text> : null}
              </View>
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity accessibilityRole="button" disabled={!item.isAvailable} onPress={() => toCart(item)} style={[styles.primary, !item.isAvailable && { opacity: 0.5 }]}>
                <Text style={styles.primaryText}>Move to cart</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={() => remove(item)} style={styles.secondary}>
                <Text style={styles.secondaryText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.recentHead}>
          <Text style={styles.h2}>Recently viewed</Text>
          {recent.length ? <TouchableOpacity onPress={() => clearRecent().then(setRecent)}><Text style={styles.link}>Clear</Text></TouchableOpacity> : null}
        </View>
        {recent.length === 0 ? <Text style={styles.muted}>Products you look at appear here.</Text> : null}
        <View style={styles.grid}>
          {recent.map((p) => (
            <TouchableOpacity key={p.productId} style={styles.tile} onPress={() => open(p.shopId, p.productId)}>
              <View style={styles.tilePhoto}>{p.image ? <Image source={{ uri: p.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
              <Text style={styles.name} numberOfLines={2}>{p.name}</Text>
              <Text style={styles.muted}>₹{p.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  body: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  muted: { color: '#64748b', fontSize: 13 },
  notice: { fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  name: { fontWeight: '800', color: '#0f172a' },
  price: { fontWeight: '900', color: '#0f172a', marginTop: 2 },
  out: { color: '#dc2626', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  primary: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontWeight: '800', color: '#0f172a' },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 8 },
  link: { color: '#4f46e5', fontWeight: '800', padding: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  tilePhoto: { aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: 6 },
});
