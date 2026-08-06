import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../../../theme';
import BouncyButton from '../../../../src/components/BouncyButton';

const MOCK_PRODUCTS = [
  { 
    id: 1, 
    name: 'Amul Taaza Homogenised Milk', 
    description: 'Fresh toned milk, homogenised for thickness',
    price: 68, 
    oldPrice: 72, 
    inStock: true, 
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400&h=400',
    variants: [
      { id: 'v1', size: '1L', price: 68 },
      { id: 'v2', size: '500ml', price: 34 }
    ]
  },
  { 
    id: 2, 
    name: 'Ashirvaad Shudh Chakki Atta', 
    description: '100% whole wheat chakki atta',
    price: 240, 
    oldPrice: 260, 
    inStock: true, 
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400&h=400',
    variants: [
      { id: 'v3', size: '5kg', price: 240 },
      { id: 'v4', size: '10kg', price: 470 }
    ]
  },
  { 
    id: 3, 
    name: 'Farm Fresh Tomatoes', 
    description: 'Freshly picked red tomatoes',
    price: 45, 
    oldPrice: 55, 
    inStock: true, 
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400&h=400',
    variants: [
      { id: 'v5', size: '1kg', price: 45 },
      { id: 'v6', size: '500g', price: 25 }
    ]
  },
];

export default function RetailVisitorView({ shop }) {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['45%'], []);

  const handleCheckout = () => {
    router.push('/modules/checkout');
  };

  const openVariantSheet = useCallback((product) => {
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
      <VisitorLayout 
        shopName={shop.name || 'Sharma Grocery'} 
        shopAddress="Block A, Dhanori Market, Pune"
        shopIcon="🏪"
        cartCount={cart.length}
        onCheckout={handleCheckout}
      >
        <View style={{ padding: SPACING.md }}>
          <Text style={styles.sectionTitle}>Bestsellers</Text>
          <View style={styles.gridContainer}>
            {MOCK_PRODUCTS.map(prod => (
              <View key={prod.id} style={styles.productCard}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: prod.image }} style={styles.productImage} />
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
                    <Text style={styles.prodOldPrice}>₹{prod.oldPrice}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
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
            
            {selectedProduct.variants.map((v) => (
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
