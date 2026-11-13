import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  myShopId, listCoupons, createCoupon, setCouponActive, couponFromForm, couponSummary, isCouponActive,
} from '../../../src/services/sellerTools';

/**
 * S5 on Android: the shop's own coupons. They work only on orders from this
 * shop; the server pins each one to it.
 */
const EMPTY = { code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_discount_amount: '' };

export default function MerchantCoupons() {
  const [shopId, setShopId] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const id = shopId || (await myShopId());
      setShopId(id);
      setCoupons(await listCoupons(id));
    } catch (e) {
      setError(e.message || 'Your coupons could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setError(''); setNotice('');
    const checked = couponFromForm(form);
    if (checked.error) { setError(checked.error); return; }
    setBusy(true);
    try {
      const made = await createCoupon(shopId, form);
      setNotice(`Coupon ${made.code} created.`);
      setForm(EMPTY);
      setCoupons(await listCoupons(shopId));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c) => {
    setError(''); setNotice('');
    try {
      await setCouponActive(shopId, c.id, !isCouponActive(c));
      setCoupons(await listCoupons(shopId));
    } catch (e) {
      setError(e.message);
    }
  };

  const field = (key, label, props = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={form[key]} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))} accessibilityLabel={label} {...props} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Coupons</Text>
        <Text style={styles.sub}>Coupons you make here work only on orders from your shop.</Text>

        {field('code', 'Code', { autoCapitalize: 'characters' })}
        <View style={styles.typeRow}>
          {[['percentage', '% off'], ['fixed', '₹ off']].map(([v, l]) => (
            <TouchableOpacity key={v} onPress={() => setForm((f) => ({ ...f, discount_type: v }))}
              style={[styles.typeBtn, form.discount_type === v && styles.typeBtnOn]} accessibilityRole="radio" accessibilityState={{ selected: form.discount_type === v }}>
              <Text style={[styles.typeText, form.discount_type === v && styles.typeTextOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {field('discount_value', 'Discount', { keyboardType: 'decimal-pad' })}
        {field('min_order_amount', 'Minimum order (₹)', { keyboardType: 'decimal-pad' })}
        {field('max_discount_amount', 'Maximum discount (₹)', { keyboardType: 'decimal-pad' })}

        {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
        {!!notice && <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text>}

        <TouchableOpacity style={styles.primary} onPress={create} disabled={busy || !shopId} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create coupon</Text>}
        </TouchableOpacity>

        <Text style={styles.section}>Your coupons</Text>
        {loading ? <ActivityIndicator /> : coupons.length === 0 ? (
          <Text style={styles.sub}>No coupons yet.</Text>
        ) : coupons.map((c) => (
          <View key={c.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.code}>{c.code}</Text>
              <Text style={styles.sub}>{couponSummary(c)} · {isCouponActive(c) ? 'Active' : 'Off'}</Text>
            </View>
            <TouchableOpacity onPress={() => toggle(c)} style={styles.secondary} accessibilityRole="button">
              <Text style={styles.secondaryText}>{isCouponActive(c) ? 'Switch off' : 'Switch on'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  field: { marginTop: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, minHeight: 44 },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, alignItems: 'center', minHeight: 44 },
  typeBtnOn: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  typeText: { fontWeight: '700', color: '#334155' },
  typeTextOn: { color: '#fff' },
  error: { color: '#b91c1c', marginTop: 12 },
  notice: { color: '#065f46', marginTop: 12, fontWeight: '700' },
  primary: { backgroundColor: '#f59e0b', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, minHeight: 48, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
  section: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 24, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  code: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  secondaryText: { fontWeight: '700', color: '#334155' },
});
