import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../../theme';
import BouncyButton from '../../../src/components/BouncyButton';

// MOCK_PRODUCTS lived here: "Amul Taaza Homogenised Milk ₹68 (was ₹72)",
// "Ashirvaad Shudh Chakki Atta ₹240", "Farm Fresh Tomatoes" — named third-party
// goods at specific prices with variant sizes and struck-through "old" prices,
// shown as the catalogue of whichever shop the customer had opened. The router
// above now fetches the shop's real products and passes them in.


/**
 * shop_products rows do not have the shape the mock did. The mock supplied
 * `image`, `inStock`, `oldPrice` and a `variants` array; a real row carries
 * `image_url`, `is_available` / `inventory_count`, `mrp`, and no variants at
 * all. Reading the mock's field names off a real row silently produced a
 * broken image, an always-in-stock badge and `₹undefined` struck through.
 */
function normalise(p) {
  const price = Number(p.price) || 0;
  const mrp = Number(p.mrp) || 0;
  const tracked = Number(p.track_inventory) === 1;
  return {
    id: String(p.id),
    name: p.name || '',
    description: p.description || '',
    image: p.image_url || p.image || null,
    price,
    // Only shown when the shop actually recorded a higher MRP. The mock printed
    // a struck-through "old price" on every tile whether or not one existed.
    oldPrice: mrp > price ? mrp : null,
    inStock: (p.is_available === undefined || !!Number(p.is_available)) &&
             (!tracked || Number(p.inventory_count ?? 0) > 0),
    variants: Array.isArray(p.variants) ? p.variants : [],
  };
}

export default function RetailVisitorView({ shop, products = [] }) {
  const items = useMemo(() => products.map(normalise), [products]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['45%'], []);

  const handleCheckout = () => {
    router.push('/modules/checkout');
  };

  const openVariantSheet = useCallback((product) => {
    // Real catalogue rows carry no variants. Opening a "Select Variant" sheet
    // with nothing in it — which is what the mock's shape guaranteed once the
    // data was real — is worse than adding the product directly.
    if (!product.variants || product.variants.length === 0) {
      setCart((prev) => [...prev, { ...product }]);
      return;
    }
    setSelectedProduct(product);
    bottomSheetRef.current?.expand();
  }, []);

  const handleAddVariant = (variant) => {
    setCart([...cart, { ...selectedProduct, variant_id: variant.id, price: variant.price }]);
    bottomSheetRef.current?.close();
  };

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <VisitorLayout shop={shop} 
        /* The fallbacks here were a made-up business: "Sharma Grocery" at
            "Block A, Dhanori Market, Pune". A shop with no name or address on
            record should show neither. */
        shopName={shop.name || 'Shop'} 
        shopAddress={shop.address || ''}
        shopIcon="🏪"
        cartCount={cart.length}
        onCheckout={handleCheckout}
      >
        <View style={{ padding: SPACING.md }}>
          {/* "Bestsellers" asserted a ranking nothing computes. */}
          <Text style={styles.sectionTitle}>Products</Text>

          {items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No products listed yet</Text>
              <Text style={styles.emptyBody}>
                This shop has not added anything to its catalogue.
              </Text>
            </View>
          ) : (
          <View style={styles.gridContainer}>
            {items.map(prod => (
              <View key={prod.id} style={styles.productCard}>
                <View style={styles.imageContainer}>
                  {prod.image ? (
                    <Image source={{ uri: prod.image }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, styles.imagePlaceholder]}>
                      <Text style={styles.imagePlaceholderText}>📦</Text>
                    </View>
                  )}
                  {!prod.inStock && (
                    <View style={styles.outOfStockOverlay}>
                      <Text style={styles.outOfStockText}>SOLD OUT</Text>
                    </View>
                  )}
                  <BouncyButton 
                    style={[styles.addButton, !prod.inStock && styles.addBtnDisabled]}
                    disabled={!prod.inStock}
                    onPress={() => openVariantSheet(prod)}
                  >
                    <Text style={[styles.addButtonText, !prod.inStock && styles.addBtnTextDisabled]}>ADD</Text>
                  </BouncyButton>
                </View>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodName} numberOfLines={2}>{prod.name}</Text>
                  <Text style={styles.prodDesc} numberOfLines={1}>{prod.description}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.prodPrice}>₹{prod.price}</Text>
                    {prod.oldPrice ? (
                      <Text style={styles.prodOldPrice}>₹{prod.oldPrice}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
          )}
        </View>
      </VisitorLayout>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
      >
        {selectedProduct && (
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Select Variant</Text>
            <Text style={styles.sheetSubTitle}>{selectedProduct.name}</Text>
            
            {(selectedProduct.variants || []).map((v) => (
              <TouchableOpacity key={v.id} style={styles.variantRow} onPress={() => handleAddVariant(v)}>
                <View>
                  <Text style={styles.variantSize}>{v.size}</Text>
                  <Text style={styles.variantPrice}>₹{v.price}</Text>
                </View>
                <BouncyButton style={styles.variantAddBtn} onPress={() => handleAddVariant(v)}>
                  <Text style={styles.variantAddBtnText}>+ ADD</Text>
                </BouncyButton>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.h3, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.md },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: { width: '48%', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, ...SHADOWS.sm, marginBottom: SPACING.md, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 140, position: 'relative' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  outOfStockText: { color: COLORS.error, fontWeight: '900', fontSize: 14 },
  addButton: { position: 'absolute', bottom: -12, alignSelf: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: 24, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.primary, ...SHADOWS.sm },
  addButtonText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  addBtnDisabled: { backgroundColor: COLORS.background, borderColor: COLORS.border },
  addBtnTextDisabled: { color: COLORS.textMuted },
  prodInfo: { padding: SPACING.sm, paddingTop: 20 },
  prodName: { fontSize: TYPOGRAPHY.sizes.caption, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  prodDesc: { fontSize: 11, color: COLORS.textMuted, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  prodPrice: { fontSize: TYPOGRAPHY.sizes.subtext, fontWeight: '900', color: COLORS.text, marginRight: 6 },
  prodOldPrice: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  imagePlaceholder: { backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 32 },
  emptyBox: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, alignItems: 'center', ...SHADOWS.sm },
  emptyTitle: { fontSize: TYPOGRAPHY.sizes.body, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyBody: { fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.textMuted, textAlign: 'center' },
  
  // Sheet Styles
  sheetBackground: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg },
  sheetIndicator: { backgroundColor: COLORS.border, width: 40 },
  sheetContent: { padding: SPACING.lg },
  sheetTitle: { fontSize: TYPOGRAPHY.sizes.h3, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  sheetSubTitle: { fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.textMuted, marginBottom: SPACING.lg },
  variantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  variantSize: { fontSize: TYPOGRAPHY.sizes.body, fontWeight: '700', color: COLORS.text },
  variantPrice: { fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.textMuted, marginTop: 4 },
  variantAddBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 20, paddingVertical: 8, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.primary },
  variantAddBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
});
