import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../../store/cartStore';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

export default function FoodVisitorView({ shop, products = [], loading = false }) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAdd = (product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem({
      id: product.id || product._id || Math.random().toString(),
      shop_id: shop?.id,
      shop_name: shop?.name,
      shop_category: 'food',
      name: product.name,
      price: product.price,
    }, 1, { modifier: 'regular' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonLoader height={200} width="100%" />
        <View style={{ padding: 16 }}>
           <SkeletonLoader height={40} width={200} style={{ marginBottom: 20 }} />
           {[1, 2, 3].map(i => <SkeletonLoader key={i} height={100} width="100%" style={{ marginBottom: 15 }} borderRadius={16} />)}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerImageContainer}>
        {shop?.cover_image ? (
          <Image source={shop.cover_image } style={styles.coverImage}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={styles.placeholderImage} />
        )}
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>{shop?.name || 'Restaurant'}</Text>
        <Text style={styles.subtitle}>Food & Beverages • {shop?.delivery_time || '15-20 mins'}</Text>
      </View>
      
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Recommended</Text>
        {products.length > 0 ? (
          products.map((item, idx) => (
            <View key={idx} style={styles.menuItem}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
                <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={() => handleAdd(item)}>
                <Text style={styles.addText}>ADD</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          // Fallback Dummy Data if no products provided
          [1, 2, 3].map((item) => (
            <View key={item} style={styles.menuItem}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>Margherita Pizza</Text>
                <Text style={styles.itemPrice}>₹250</Text>
                <Text style={styles.itemDesc} numberOfLines={2}>Classic cheese and tomato pizza with basil.</Text>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={() => handleAdd({ name: 'Margherita Pizza', price: 250 })}>
                <Text style={styles.addText}>ADD</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerImageContainer: { height: 200, width: '100%', backgroundColor: '#e2e8f0' },
  coverImage: { width: '100%', height: '100%', objectFit: 'cover' },
  placeholderImage: { width: '100%', height: '100%', backgroundColor: '#FF6B00', opacity: 0.2 },
  header: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0', marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  menuContainer: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  menuItem: { 
    flexDirection: 'row', 
    backgroundColor: '#ffffff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center'
  },
  itemDetails: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#FF6B00', marginTop: 4 },
  itemDesc: { fontSize: 12, color: '#64748b', marginTop: 4 },
  addButton: { 
    backgroundColor: '#fff7ed', 
    borderColor: '#FF6B00',
    borderWidth: 1,
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  addText: { color: '#FF6B00', fontWeight: 'bold' }
});
