import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useCartStore } from '../../../src/store/cartStore';
import { apiGet } from '../../../src/lib/api';
import DemoBadge from '../../../src/components/DemoBadge';
import SkeletonLoader from '../../../src/components/SkeletonLoader';

// ── Mock fallback data (shown when API is unreachable) ──
const MOCK_SHOP = {
  id: 'mock-shop-1',
  name: 'Sharma Grocery & Daily Needs',
  category: 'Grocery & Supermarket',
  category_name: 'Grocery & Supermarket',
  rating: 4.8,
  reviews_count: 124,
  distance: '1.2 km',
  delivery_time: '15-20 mins',
  has_delivery: true,
  address: 'Dhanori, Pune',
  image_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=600&auto=format&fit=crop',
};

const MOCK_PRODUCTS = [
  { id: 'mock-p1', name: 'Amul Taaza Milk 500ml', price: 28, category_name: 'Dairy', description: 'Fresh standardized milk', track_inventory: 0, inventory_count: 99 },
  { id: 'mock-p2', name: 'Aashirvaad Atta 5kg', price: 240, category_name: 'Groceries', description: '100% whole wheat chakki atta', track_inventory: 0, inventory_count: 99 },
  { id: 'mock-p3', name: 'Maggi 2-Min Noodles', price: 14, category_name: 'Snacks', description: 'Masala noodles single pack', track_inventory: 0, inventory_count: 99 },
  { id: 'mock-p4', name: 'Amul Butter 100g', price: 58, category_name: 'Dairy', description: 'Pasteurised butter', track_inventory: 0, inventory_count: 99 },
  { id: 'mock-p5', name: 'Tata Salt 1kg', price: 28, category_name: 'Groceries', description: 'Iodised vacuum evaporated salt', track_inventory: 0, inventory_count: 99 },
  { id: 'mock-p6', name: 'Fortune Sunlite Oil 1L', price: 155, category_name: 'Groceries', description: 'Refined sunflower oil', track_inventory: 0, inventory_count: 99 },
];

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams();
  const { items: cart, addItem: addToCart, removeItem: removeFromCart, updateQuantity, getCartTotal, getItemCount } = useCartStore();

  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch real data from backend API ──
  useEffect(() => {
    const loadShopData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch shop details
        const shopData = await apiGet(`/shops/${id}`);
        const resolvedShop = shopData?.shop || shopData;
        
        if (resolvedShop && resolvedShop.id) {
          setShop(resolvedShop);
        } else {
          throw new Error('Shop not found');
        }

        // Fetch shop products
        try {
          const productsData = await apiGet(`/shops/${id}/products`);
          const resolvedProducts = productsData?.products || productsData?.rows || productsData;
          setProducts(Array.isArray(resolvedProducts) ? resolvedProducts : []);
        } catch (prodErr) {
          console.warn('[ShopDetail] Products API failed, using mock products:', prodErr.message);
          setProducts(MOCK_PRODUCTS);
          setIsDemo(true);
        }
      } catch (shopErr) {
        console.warn('[ShopDetail] Shop API failed, using mock data:', shopErr.message);
        setShop({ ...MOCK_SHOP, id: id || MOCK_SHOP.id });
        setProducts(MOCK_PRODUCTS);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadShopData();
    } else {
      setShop(MOCK_SHOP);
      setProducts(MOCK_PRODUCTS);
      setIsDemo(true);
      setLoading(false);
    }
  }, [id]);

  // Helper to get qty from cart
  const getQty = (prodId) => {
    const item = cart.find(c => c.id === prodId);
    return item ? item.quantity : 0;
  };

  // ── Properly add to cart with shop_id and shop_name ──
  const handleAddToCart = (product) => {
    const cartProduct = {
      ...product,
      price: parseFloat(product.price) || 0,
      shop_id: shop?.id,
      shop_name: shop?.name,
      shop_category: shop?.category_name || shop?.category,
    };
    addToCart(cartProduct, 1, {});
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <SkeletonLoader type="card" count={3} />
        </View>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🏪</Text>
          <Text style={styles.errorTitle}>Shop Not Found</Text>
          <Text style={styles.errorMessage}>This shop may have been removed or is temporarily unavailable.</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const shopImage = shop.image_url || shop.banner_url || shop.logo_url || 
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=600&auto=format&fit=crop';

  return (
    <SafeAreaView style={styles.container}>
      <DemoBadge visible={isDemo} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Image & Back Button */}
        <View style={styles.headerImageContainer}>
          <Image source={shopImage} style={styles.headerImage} contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
          <View style={styles.overlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={{ fontSize: 20, color: '#ffffff' }}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Shop Info */}
        <View style={styles.shopInfoCard}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopCategory}>{shop.category_name || shop.category}</Text>
          {shop.address && <Text style={styles.shopAddress}>📍 {shop.address}</Text>}
          
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}><Text style={styles.metaText}>⭐ {shop.rating || '4.0'} ({shop.reviews_count || 0})</Text></View>
            {shop.distance && <View style={styles.metaBadge}><Text style={styles.metaText}>📍 {shop.distance}</Text></View>}
            {shop.delivery_time && <View style={styles.metaBadge}><Text style={styles.metaText}>⏱️ {shop.delivery_time}</Text></View>}
            {shop.has_delivery && <View style={[styles.metaBadge, { backgroundColor: '#dcfce7' }]}><Text style={[styles.metaText, { color: '#16a34a' }]}>🛵 Delivery</Text></View>}
          </View>
        </View>

        {/* Product Catalog */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Product Catalog ({products.length})</Text>
          
          {products.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No products available yet.</Text>
            </View>
          ) : (
            products.map(item => {
              const qty = getQty(item.id);
              const price = parseFloat(item.price) || 0;
              const outOfStock = item.track_inventory === 1 && (item.inventory_count || 0) <= 0;
              
              return (
                <View key={item.id} style={styles.productCard}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productDesc}>{item.description || item.desc || ''}</Text>
                    <Text style={styles.productPrice}>₹{price}</Text>
                  </View>
                  
                  <View style={styles.productAction}>
                    {outOfStock ? (
                      <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                      </View>
                    ) : qty === 0 ? (
                      <TouchableOpacity 
                        style={styles.addBtn}
                        onPress={() => handleAddToCart(item)}
                      >
                        <Text style={styles.addBtnText}>ADD</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.qtyControl}>
                        <TouchableOpacity 
                          style={styles.qtyBtn}
                          onPress={() => updateQuantity(item.id, qty - 1)}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{qty}</Text>
                        <TouchableOpacity 
                          style={styles.qtyBtn}
                          onPress={() => updateQuantity(item.id, qty + 1)}
                          disabled={item.track_inventory === 1 && qty >= item.inventory_count}
                        >
                          <Text style={[styles.qtyBtnText, item.track_inventory === 1 && qty >= item.inventory_count && { opacity: 0.3 }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Floating View Cart Button */}
      {getItemCount() > 0 && (
        <View style={styles.cartFloatingContainer}>
          <TouchableOpacity 
            style={styles.cartFloatingBtn}
            onPress={() => router.push('/modules/checkout')}
          >
            <View>
              <Text style={styles.cartCount}>{getItemCount()} ITEMS</Text>
              <Text style={styles.cartTotal}>₹{getCartTotal().toFixed(0)}</Text>
            </View>
            <Text style={styles.cartActionText}>View Cart →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, padding: 16 },
  
  // Error state
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  errorMessage: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  errorBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  errorBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  // Header
  headerImageContainer: { height: 220, width: '100%', position: 'relative' },
  headerImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  backBtn: { position: 'absolute', top: 40, left: 16, backgroundColor: 'rgba(15, 23, 42, 0.8)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  // Shop info
  shopInfoCard: { backgroundColor: '#ffffff', marginTop: -30, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  shopName: { color: '#0f172a', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  shopCategory: { color: '#64748b', fontSize: 14, marginBottom: 4 },
  shopAddress: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metaText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  
  // Products
  menuContainer: { padding: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyProducts: { backgroundColor: '#f1f5f9', borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  
  productCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  productInfo: { flex: 1, paddingRight: 16 },
  productName: { color: '#0f172a', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  productDesc: { color: '#64748b', fontSize: 12, marginBottom: 8, lineHeight: 18 },
  productPrice: { color: '#10b981', fontSize: 15, fontWeight: 'bold' },
  
  productAction: { width: 90, alignItems: 'center' },
  addBtn: { backgroundColor: '#3b82f6', width: '100%', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  outOfStockBadge: { backgroundColor: '#fee2e2', width: '100%', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  outOfStockText: { color: '#ef4444', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  
  qtyControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', borderRadius: 8, width: '100%', padding: 4 },
  qtyBtn: { width: 28, height: 28, backgroundColor: '#ffffff', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  qtyText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  
  cartFloatingContainer: { position: 'absolute', bottom: 20, left: 16, right: 16, zIndex: 100 },
  cartFloatingBtn: { backgroundColor: '#10b981', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, elevation: 5, shadowColor: '#10b981', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8 },
  cartCount: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', opacity: 0.9, marginBottom: 2 },
  cartTotal: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  cartActionText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
