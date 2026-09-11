import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';
import { Ionicons } from '@expo/vector-icons';

/**
 * shop_products.dietary_tags is a JSON string array, e.g. '["VEG"]'. Returns
 * true for veg, false for non-veg, and null when the shop tagged neither — in
 * which case no badge is shown at all.
 */
function dietaryVeg(product) {
  const raw = product.dietary_tags ?? product.dietaryTags;
  if (!raw) return null;
  let tags = raw;
  if (typeof raw === 'string') {
    try { tags = JSON.parse(raw); } catch { tags = [raw]; }
  }
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const upper = tags.map((t) => String(t).toUpperCase());
  if (upper.includes('NON_VEG') || upper.includes('NONVEG') || upper.includes('NON-VEG')) return false;
  if (upper.includes('VEG') || upper.includes('VEGAN')) return true;
  return null;
}

// MOCK_MENU was a three-dish menu at fixed prices — Paneer Butter Masala ₹220,
// Chicken Biryani ₹280, Garlic Naan ₹45 — shown as the menu of whichever
// restaurant the customer had opened. The router now passes the real one.

export default function RestaurantVisitorView({ shop, products = [] }) {
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');

  const items = useMemo(
    () =>
      products.map((p) => ({
        id: String(p.id),
        name: p.name || '',
        description: p.description || '',
        price: Number(p.price) || 0,
        category: p.subcategory || p.category || null,
        // A dish is only marked veg or non-veg when the shop said so. The mock
        // set `type` on every item, so an untagged dish would have rendered as
        // non-veg by default — a claim this app has no business making.
        veg: dietaryVeg(p),
      })),
    [products]
  );

  const menuCategories = useMemo(() => {
    const found = [...new Set(items.map((i) => i.category).filter(Boolean))];
    return found.length ? ['All', ...found] : [];
  }, [items]);

  const visibleItems =
    activeCategory === 'All' ? items : items.filter((i) => i.category === activeCategory);

  return (
    <VisitorLayout shop={shop} 
      /* The fallbacks invented a business: "Spice Route" on "FC Road, Pune". */
      shopName={shop.name || 'Restaurant'}
      shopAddress={shop.address || ''}
      shopIcon="🍽️"
      cartCount={cart.length}
      onCheckout={() => router.push('/modules/checkout')}
    >
      <View style={{ padding: 16 }}>
        
        {/* Book Dine-in Action */}
        <TouchableOpacity style={styles.dineInBox} onPress={() => router.push('/modules/dine-in')}>
          <View style={styles.dineInIconBg}>
            <Ionicons name="restaurant" size={24} color="#ea580c" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dineInTitle}>Book a Table</Text>
            <Text style={styles.dineInSub}>Reserve your spot for dine-in.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Digital Menu</Text>
        
        {/* The category strip was four fixed labels — All / Starters / Mains /
            Breads — that filtered nothing and were not this restaurant's own
            sections. It is now built from the categories the dishes actually
            carry, and hidden when there is nothing to filter by. */}
        {menuCategories.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {menuCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.menuCat, activeCategory === cat && styles.menuCatActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={activeCategory === cat ? styles.menuCatTextActive : styles.menuCatText}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {visibleItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No dishes listed yet</Text>
            <Text style={styles.emptyBody}>This restaurant has not published its menu.</Text>
          </View>
        ) : visibleItems.map(item => (
          <View key={item.id} style={styles.productCard}>
            <View style={styles.prodImgBox}><Text style={{fontSize: 32}}>🍽️</Text></View>
            <View style={styles.prodInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {item.veg === null ? null : (
                  <View style={[styles.vegBadge, { borderColor: item.veg ? '#16a34a' : '#dc2626' }]}>
                    <View style={[styles.vegDot, { backgroundColor: item.veg ? '#16a34a' : '#dc2626' }]} />
                  </View>
                )}
                <Text style={styles.prodName}>{item.name}</Text>
              </View>
              {item.description ? <Text style={styles.prodDesc}>{item.description}</Text> : null}
              <Text style={styles.prodPrice}>₹{item.price}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setCart([...cart, item])}>
              <Text style={styles.addBtnText}>+ ADD</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  emptyBox: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  emptyBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  dineInBox: { flexDirection: 'row', backgroundColor: '#fff7ed', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#fed7aa' },
  dineInIconBg: { backgroundColor: '#fff', padding: 10, borderRadius: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  dineInTitle: { fontSize: 16, fontWeight: 'bold', color: '#9a3412', marginBottom: 4 },
  dineInSub: { fontSize: 12, color: '#ea580c' },
  
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  
  menuCat: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  menuCatActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  menuCatText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
  menuCatTextActive: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  productCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  prodImgBox: { width: 60, height: 60, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  prodInfo: { flex: 1 },
  vegBadge: { width: 12, height: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  prodName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  prodDesc: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  prodPrice: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  addBtn: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#ea580c', fontWeight: 'bold', fontSize: 12 },
});
