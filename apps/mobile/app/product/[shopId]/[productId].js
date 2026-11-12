import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useCartStore } from '../../../src/store/cartStore';
import {
  loadProduct, offer, cartLine, clampQuantity, recordView, listWishlist, saveProduct, unsaveProduct, reportReview, REPORT_REASONS,
} from '../../../src/services/product';

/**
 * The product screen (C4), the same page as the web's
 * /shops/:id/products/:productId. A declaration the seller has not given says
 * so; nothing is filled in.
 */
const LEGAL_ROWS = [
  ['genericName', 'Generic name'],
  ['netQuantity', 'Net quantity'],
  ['manufacturer', 'Manufacturer / packer / importer'],
  ['countryOfOrigin', 'Country of origin'],
  ['bestBefore', 'Best before'],
  ['consumerCare', 'Consumer care'],
];

export default function ProductScreen() {
  const { shopId, productId } = useLocalSearchParams();
  const router = useRouter();
  const { authToken } = useAuth() || {};
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [image, setImage] = useState(0);
  const [variantId, setVariantId] = useState(null);
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    loadProduct(shopId, productId)
      .then((p) => {
        setProduct(p);
        const first = p.variants.find((v) => v.inStock);
        setVariantId(first ? first.id : null);
        recordView(p).catch(() => {});
      })
      .catch((e) => setError(e?.status === 404 ? 'This product is not available.' : (e?.message || 'The product could not be loaded.')));
  }, [shopId, productId]);

  useEffect(() => {
    if (!authToken) return;
    listWishlist().then((items) => setSaved(items.some((i) => String(i.productId) === String(productId)))).catch(() => {});
  }, [authToken, productId]);

  const variant = useMemo(() => (product && variantId ? product.variants.find((v) => v.id === variantId) : null), [product, variantId]);
  const now = product ? offer(product, variant) : null;

  const add = () => {
    const { product: line, options } = cartLine(product, variant);
    addItem(line, clampQuantity(qty, now.maxQuantity), options);
    setNotice(`Added ${clampQuantity(qty, now.maxQuantity)} to your cart.`);
  };

  const toggleSave = async () => {
    if (!authToken) { router.push('/login'); return; }
    const next = !saved;
    setSaved(next);
    try {
      if (next) await saveProduct(product.id); else await unsaveProduct(product.id);
    } catch {
      setSaved(!next);
    }
  };

  // C11: report a review; it goes to the admin moderation queue.
  const report = (r) => {
    if (!authToken) { router.push('/login'); return; }
    Alert.alert('Report this review', 'Why are you reporting it?', [
      ...REPORT_REASONS.slice(0, 3).map(([reason, label]) => ({
        text: label,
        onPress: () => reportReview(product.shopId, r.id, reason)
          .then(() => Alert.alert('Thanks', 'Our team will look at it.'))
          .catch((e) => Alert.alert('Not sent', e?.message || 'Please try again.')),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (error) {
    return <SafeAreaView style={styles.center}><Text style={styles.error}>{error}</Text></SafeAreaView>;
  }
  if (!product) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.photo}>
          {product.images.length
            ? <Image source={{ uri: product.images[image] }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={product.name} />
            : <Text style={styles.muted}>No photo yet</Text>}
        </View>
        {product.images.length > 1 ? (
          <ScrollView horizontal style={{ marginTop: 8 }}>
            {product.images.map((src, i) => (
              <TouchableOpacity key={src} onPress={() => setImage(i)} accessibilityLabel={`Photo ${i + 1}`}
                style={[styles.thumb, i === image && styles.thumbOn]}>
                <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <TouchableOpacity onPress={() => router.push(`/modules/shop/${product.shopId}`)}>
          <Text style={styles.shop}>{product.seller.name}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{product.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{now.price}</Text>
          {product.mrp && product.mrp > now.price ? <Text style={styles.mrp}>MRP ₹{product.mrp}</Text> : null}
          {now.discountPercent > 0 ? <Text style={styles.discount}>{now.discountPercent}% off</Text> : null}
        </View>
        {product.mrp ? <Text style={styles.muted}>Inclusive of all taxes</Text> : null}

        {product.variants.length ? (
          <View style={styles.section}>
            <Text style={styles.label}>{product.variants[0].name}</Text>
            <View style={styles.chips}>
              {product.variants.map((v) => (
                <TouchableOpacity key={v.id} disabled={!v.inStock} onPress={() => setVariantId(v.id)}
                  accessibilityRole="radio" accessibilityState={{ checked: variantId === v.id, disabled: !v.inStock }}
                  style={[styles.chip, variantId === v.id && styles.chipOn, !v.inStock && { opacity: 0.4 }]}>
                  <Text style={[styles.chipText, variantId === v.id && styles.chipTextOn]}>{v.value} · ₹{v.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {now.inStock ? (
          <View style={styles.section}>
            <View style={styles.qtyRow}>
              <TouchableOpacity accessibilityLabel="Fewer" style={styles.qtyBtn} onPress={() => setQty((q) => clampQuantity(q - 1, now.maxQuantity))}><Text style={styles.qtyText}>−</Text></TouchableOpacity>
              <Text style={styles.qtyValue}>{clampQuantity(qty, now.maxQuantity)}</Text>
              <TouchableOpacity accessibilityLabel="More" style={styles.qtyBtn} onPress={() => setQty((q) => clampQuantity(q + 1, now.maxQuantity))}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={now.mustChoose} onPress={add} style={[styles.addBtn, now.mustChoose && { opacity: 0.5 }]}>
                <Text style={styles.addText}>Add to cart</Text>
              </TouchableOpacity>
            </View>
            {product.quantityLimit ? <Text style={styles.muted}>At most {product.quantityLimit} per order.</Text> : null}
          </View>
        ) : <Text style={styles.out}>Out of stock</Text>}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: saved }} onPress={toggleSave} style={styles.saveBtn}>
          <Text style={styles.saveText}>{saved ? '♥ Saved' : '♡ Save'}</Text>
        </TouchableOpacity>
        {notice ? (
          <TouchableOpacity onPress={() => router.push('/cart')}><Text style={styles.notice}>{notice} View cart</Text></TouchableOpacity>
        ) : null}

        {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.label}>Sold by {product.seller.name}</Text>
          {product.seller.address ? <Text style={styles.muted}>{product.seller.address}</Text> : null}
          {product.seller.foodBusiness ? (
            <Text style={styles.muted}>FSSAI Lic. No. {product.seller.fssaiLicence || 'not provided by the seller'}</Text>
          ) : null}
          <Text style={styles.muted}>{product.returns.summary}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Product details</Text>
          {LEGAL_ROWS.map(([key, label]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={[styles.rowValue, !product.legal[key] && styles.missing]}>{product.legal[key] || 'Not provided by the seller'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>
            Reviews of {product.seller.name}
            {product.reviews.averageRating !== null ? ` · ${product.reviews.averageRating}★ from ${product.reviews.verifiedCount} verified` : ''}
          </Text>
          {product.reviews.items.length === 0 ? <Text style={styles.muted}>No reviews yet.</Text> : null}
          {product.reviews.items.map((r) => (
            <View key={r.id} style={styles.review}>
              <Text style={styles.reviewHead}>{'★'.repeat(r.rating)} {r.author} {r.verifiedPurchase ? '· Verified purchase' : '· Not a verified purchase'}</Text>
              {r.text ? <Text style={styles.reviewText}>{r.text}</Text> : null}
              {r.reply ? <Text style={styles.muted}>Reply from the shop: {r.reply}</Text> : null}
              <TouchableOpacity accessibilityRole="button" onPress={() => report(r)}>
                <Text style={[styles.muted, { textDecorationLine: 'underline', paddingVertical: 6 }]}>Report this review</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  body: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { fontSize: 16, fontWeight: '700', color: '#dc2626', textAlign: 'center' },
  photo: { aspectRatio: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', marginRight: 8, borderWidth: 2, borderColor: '#e2e8f0' },
  thumbOn: { borderColor: '#4f46e5' },
  shop: { marginTop: 16, color: '#4f46e5', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  price: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
  mrp: { color: '#64748b', textDecorationLine: 'line-through' },
  discount: { color: '#15803d', fontWeight: '800' },
  muted: { color: '#64748b', fontSize: 13, marginTop: 2 },
  section: { marginTop: 16 },
  label: { fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  chipOn: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  chipText: { fontWeight: '700', color: '#0f172a' },
  chipTextOn: { color: '#4f46e5' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  qtyText: { fontSize: 20, fontWeight: '900' },
  qtyValue: { width: 32, textAlign: 'center', fontWeight: '800', fontSize: 16 },
  addBtn: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '800' },
  out: { marginTop: 16, color: '#dc2626', fontWeight: '800' },
  saveBtn: { marginTop: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  saveText: { fontWeight: '800', color: '#0f172a' },
  notice: { marginTop: 10, color: '#15803d', fontWeight: '700' },
  desc: { marginTop: 16, color: '#334155', lineHeight: 20 },
  card: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  row: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  rowValue: { color: '#0f172a', marginTop: 2 },
  missing: { color: '#94a3b8', fontStyle: 'italic' },
  review: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  reviewHead: { fontWeight: '700', color: '#0f172a' },
  reviewText: { color: '#334155', marginTop: 2 },
});
