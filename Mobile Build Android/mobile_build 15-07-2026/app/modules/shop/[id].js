import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useCart } from '../../../src/context/CartContext';

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams();
  const { cart, addToCart, removeFromCart, updateQuantity, getCartTotal } = useCart();
  
  // Mock Data
  const shop = {
    id: id || 'shop1',
    name: 'Sharma Grocery & Daily Needs',
    category: 'Grocery & Supermarket',
    rating: 4.8,
    reviews: 124,
    distance: '1.2 km',
    deliveryTime: '15-20 mins',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=600&auto=format&fit=crop'
  };

  const menu = [
    { id: 'p1', name: 'Amul Taaza Milk 500ml', price: '28', category: 'Dairy', desc: 'Fresh standardized milk' },
    { id: 'p2', name: 'Aashirvaad Atta 5kg', price: '240', category: 'Groceries', desc: '100% whole wheat chakki atta' },
    { id: 'p3', name: 'Maggi 2-Min Noodles', price: '14', category: 'Snacks', desc: 'Masala noodles single pack' },
    { id: 'p4', name: 'Amul Butter 100g', price: '58', category: 'Dairy', desc: 'Pasteurised butter' },
  ];

  // Helper to get qty from cart
  const getQty = (prodId) => {
    const item = cart.find(c => c.id === prodId);
    return item ? item.quantity : 0;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Image & Back Button */}
        <View style={styles.headerImageContainer}>
          <Image source={{ uri: shop.image }} style={styles.headerImage} />
          <View style={styles.overlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={{ fontSize: 20 }}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Shop Info */}
        <View style={styles.shopInfoCard}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopCategory}>{shop.category}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}><Text style={styles.metaText}>⭐ {shop.rating} ({shop.reviews})</Text></View>
            <View style={styles.metaBadge}><Text style={styles.metaText}>📍 {shop.distance}</Text></View>
            <View style={styles.metaBadge}><Text style={styles.metaText}>⏱️ {shop.deliveryTime}</Text></View>
          </View>
        </View>

        {/* Menu List */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Product Catalog</Text>
          
          {menu.map(item => {
            const qty = getQty(item.id);
            
            return (
              <View key={item.id} style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productDesc}>{item.desc}</Text>
                  <Text style={styles.productPrice}>₹{item.price}</Text>
                </View>
                
                <View style={styles.productAction}>
                  {qty === 0 ? (
                    <TouchableOpacity 
                      style={styles.addBtn}
                      onPress={() => addToCart(item, 1, shop.id)}
                    >
                      <Text style={styles.addBtnText}>ADD</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.qtyControl}>
                      <TouchableOpacity 
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, qty - 1)}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity 
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, qty + 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating View Cart Button */}
      {cart.length > 0 && (
        <View style={styles.cartFloatingContainer}>
          <TouchableOpacity 
            style={styles.cartFloatingBtn}
            onPress={() => router.push('/modules/checkout')}
          >
            <View>
              <Text style={styles.cartCount}>{cart.length} ITEMS</Text>
              <Text style={styles.cartTotal}>₹{getCartTotal()}</Text>
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
  
  headerImageContainer: { height: 220, width: '100%', position: 'relative' },
  headerImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  backBtn: { position: 'absolute', top: 40, left: 16, backgroundColor: 'rgba(15, 23, 42, 0.8)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  shopInfoCard: { backgroundColor: '#ffffff', marginTop: -30, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  shopName: { color: '#0f172a', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  shopCategory: { color: '#64748b', fontSize: 14, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaBadge: { backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metaText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  
  menuContainer: { padding: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  productCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  productInfo: { flex: 1, paddingRight: 16 },
  productName: { color: '#e2e8f0', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  productDesc: { color: '#64748b', fontSize: 12, marginBottom: 8, lineHeight: 18 },
  productPrice: { color: '#10b981', fontSize: 15, fontWeight: 'bold' },
  
  productAction: { width: 90, alignItems: 'center' },
  addBtn: { backgroundColor: '#3b82f6', width: '100%', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },
  
  qtyControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#e2e8f0', borderRadius: 8, width: '100%', padding: 4 },
  qtyBtn: { width: 28, height: 28, backgroundColor: '#f8fafc', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  qtyText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  
  cartFloatingContainer: { position: 'absolute', bottom: 20, left: 16, right: 16, zIndex: 100 },
  cartFloatingBtn: { backgroundColor: '#10b981', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, elevation: 5, shadowColor: '#10b981', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8 },
  cartCount: { color: '#0f172a', fontSize: 12, fontWeight: 'bold', opacity: 0.9, marginBottom: 2 },
  cartTotal: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  cartActionText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' }
});
