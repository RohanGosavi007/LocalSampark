import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { Pill, ShoppingCart } from 'lucide-react-native';

export default function PharmacyVisitorView({ shop, products = [] }) {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        {item.image_url ? (
          <Image source={item.image_url } style={styles.image}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
        ) : (
          <Pill size={24} color="#059669" />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.requires_prescription === 1 && (
          <View style={styles.rxBadge}>
            <Text style={styles.rxText}>Rx Required</Text>
          </View>
        )}
        <Text style={styles.price}>₹{item.price}</Text>
      </View>
      <TouchableOpacity style={styles.addBtn}>
        <Text style={styles.addBtnText}>ADD</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Upload Prescription Banner */}
      <TouchableOpacity style={styles.uploadBanner}>
        <View style={styles.uploadIcon}>
          <Text style={{ fontSize: 24 }}>📄</Text>
        </View>
        <View style={styles.uploadTextContainer}>
          <Text style={styles.uploadTitle}>Upload Prescription</Text>
          <Text style={styles.uploadSub}>We will arrange the medicines</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Available Medicines & OTC ({products.length})</Text>
      {products.length > 0 ? (
        <FlashList estimatedItemSize={100}
          data={products}
          keyExtractor={(p, i) => p.id ? p.id.toString() : i.toString()}
          renderItem={renderItem}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products listed yet.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  uploadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ecfdf5', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#d1fae5',
    marginBottom: 20
  },
  uploadIcon: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#d1fae5' },
  uploadTextContainer: { flex: 1 },
  uploadTitle: { fontSize: 16, fontWeight: 'bold', color: '#065f46' },
  uploadSub: { fontSize: 12, color: '#047857' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111827' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb'
  },
  iconContainer: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  image: { width: '100%', height: '100%', borderRadius: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  rxBadge: { alignSelf: 'flex-start', backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  rxText: { fontSize: 10, color: '#dc2626', fontWeight: 'bold' },
  price: { fontSize: 15, fontWeight: '900', color: '#059669' },
  addBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#059669',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8
  },
  addBtnText: { color: '#059669', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { padding: 32, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  emptyText: { color: '#9ca3af' }
});
