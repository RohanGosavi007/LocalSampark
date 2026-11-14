import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  myShopId, listVariants, addVariant, removeVariant, variantPriceLabel,
} from '../../../src/services/sellerTools';
import { apiGet } from '../../../src/lib/api';

/**
 * S2 on Android: a product's options (size, colour, pack) — each with its own
 * price change and stock. Opened from "Options" on the products tab.
 */
const EMPTY = { variant_name: '', variant_value: '', price_modifier: '', inventory_count: '' };

export default function ProductVariants() {
  const { productId, name } = useLocalSearchParams();
  const [shopId, setShopId] = useState(null);
  const [price, setPrice] = useState(0);
  const [variants, setVariants] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [problems, setProblems] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mine = await apiGet('/shops/my-shop');
      const id = mine && mine.shop && mine.shop.id;
      if (!id) throw new Error('No shop is linked to this account.');
      setShopId(id);
      const product = ((mine && mine.products) || []).find((p) => String(p.id) === String(productId));
      setPrice(Number(product && product.price) || 0);
      setVariants(await listVariants(id, productId));
    } catch (e) {
      setError((e && e.message) || 'The options could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setError(''); setNotice(''); setProblems({});
    setBusy(true);
    try {
      await addVariant(shopId, productId, price, form);
      setForm(EMPTY);
      setNotice('Option added.');
      setVariants(await listVariants(shopId, productId));
    } catch (e) {
      setProblems(e.problems || {});
      setError(e.message || 'The option could not be added.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (v) => {
    Alert.alert('Remove option', `Remove ${v.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await removeVariant(shopId, productId, v.id);
          setVariants(await listVariants(shopId, productId));
        } catch (e) { setError((e && e.message) || 'The option could not be removed.'); }
      } },
    ]);
  };

  const input = (key, label, props = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={form[key]} onChangeText={(t) => setForm((f) => ({ ...f, [key]: t }))} accessibilityLabel={label} {...props} />
      {!!problems[key] && <Text style={styles.error} accessibilityLiveRegion="polite">{problems[key]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Options{name ? ` — ${name}` : ''}</Text>
        <Text style={styles.sub}>Base price ₹{price}. An option can add to or reduce it.</Text>

        {loading ? <ActivityIndicator style={{ marginTop: 24 }} /> : (
          <>
            {variants.length === 0 ? <Text style={styles.sub}>No options yet.</Text> : variants.map((v) => (
              <View key={v.id} style={styles.row} testID={`variant-${v.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{v.label}</Text>
                  <Text style={styles.sub}>{variantPriceLabel(v.priceModifier)} · {v.stock} in stock</Text>
                </View>
                <TouchableOpacity onPress={() => remove(v)} accessibilityRole="button" accessibilityLabel={`Remove ${v.label}`} style={styles.removeBtn}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.section}>Add an option</Text>
            {input('variant_name', 'Option (e.g. Size)')}
            {input('variant_value', 'Value (e.g. Large)')}
            {input('price_modifier', 'Price change in ₹ (e.g. 20 or -10)', { keyboardType: 'numbers-and-punctuation' })}
            {input('inventory_count', 'Stock', { keyboardType: 'number-pad' })}
            {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
            {!!notice && <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text>}
            <TouchableOpacity style={styles.primary} onPress={add} disabled={busy || !shopId} accessibilityRole="button">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Add option</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  section: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  rowTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  removeBtn: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  removeText: { color: '#b91c1c', fontWeight: '700' },
  field: { marginTop: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, minHeight: 44 },
  error: { color: '#b91c1c', marginTop: 6, fontSize: 13 },
  notice: { color: '#065f46', marginTop: 12, fontWeight: '700' },
  primary: { backgroundColor: '#f59e0b', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, minHeight: 48, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
});
