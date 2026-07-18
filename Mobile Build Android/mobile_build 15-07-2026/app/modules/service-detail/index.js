import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function ServiceDetailScreen() {
  const { slug } = useLocalSearchParams();
  const [service, setService] = useState(null);

  useEffect(() => {
    // Mock service detail data
    setService({
      id: slug || 'srv-1',
      title: 'Premium Deep Home Cleaning',
      provider: 'Shine & Clean Solutions',
      provider_rating: 4.8,
      reviews: 124,
      price: '₹1,500',
      duration: '4-5 Hours',
      description: 'Complete deep cleaning of your home including floors, windows, bathrooms, kitchen, and dusting of all furniture. We use eco-friendly chemicals safe for pets and children.',
      includes: ['Floor Scrubbing', 'Bathroom Deep Clean', 'Kitchen Degreasing', 'Window Cleaning'],
      image: 'https://via.placeholder.com/400x250/e2e8f0/64748b?text=Service+Image'
    });
  }, [slug]);

  if (!service) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.imageContainer}>
          <Image source={{ uri: service.image }} style={styles.headerImage} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={{ fontSize: 24, color: '#fff' }}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{service.title}</Text>
            <Text style={styles.price}>{service.price}</Text>
          </View>

          <View style={styles.providerInfo}>
            <View style={styles.providerAvatar}><Text style={{ fontSize: 20 }}>🏢</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.providerName}>{service.provider}</Text>
              <Text style={styles.rating}>⭐ {service.provider_rating} ({service.reviews} reviews)</Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>⏱️ {service.duration}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this service</Text>
            <Text style={styles.description}>{service.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's included?</Text>
            {service.includes.map((item, idx) => (
              <View key={idx} style={styles.includeItem}>
                <Text style={{ color: '#10b981', marginRight: 10 }}>✓</Text>
                <Text style={styles.includeText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/modules/checkout')}>
          <Text style={styles.bookBtnText}>Book Now - {service.price}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  imageContainer: { position: 'relative', height: 250 },
  headerImage: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 40, left: 20, width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  titleSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 16 },
  price: { fontSize: 22, fontWeight: '900', color: '#3b82f6' },
  providerInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 24, elevation: 2 },
  providerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  providerName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  rating: { fontSize: 13, color: '#64748b', marginTop: 4 },
  durationBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  durationText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  description: { fontSize: 15, color: '#475569', lineHeight: 24 },
  includeItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  includeText: { fontSize: 15, color: '#334155' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  bookBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
