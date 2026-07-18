import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MANDI_RATES, RURAL_CATEGORIES, TOP_FEATURES } from '../../data/rural-services';

const { width } = Dimensions.get('window');

export default function KrishiScreen() {
  const router = useRouter();

  const renderMandiTicker = () => (
    <View style={styles.tickerContainer}>
      <Text style={styles.tickerTitle}>📈 Live Mandi Rates:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tickerScroll}>
        {MANDI_RATES.map((item, index) => (
          <View key={index} style={styles.tickerItem}>
            <Text style={styles.tickerCrop}>{item.crop}</Text>
            <Text style={styles.tickerMarket}>{item.market}</Text>
            <Text style={styles.tickerPrice}>{item.price}</Text>
            <Text style={[styles.tickerChange, { color: item.trend === 'up' ? '#10b981' : (item.trend === 'down' ? '#ef4444' : '#64748b') }]}>
              {item.change} {item.trend === 'up' ? '▲' : (item.trend === 'down' ? '▼' : '-')}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🌱 Krishi Hub</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Transforming Rural India</Text>
          <Text style={styles.heroSubtitle}>Digital marketplace for farmers. Direct Mandi rates, rent equipment, sell produce, and access expert advice.</Text>
          <View style={styles.heroButtons}>
            <TouchableOpacity style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Join as Farmer</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>Explore Services</Text></TouchableOpacity>
          </View>
        </View>

        {renderMandiTicker()}

        {/* Top Features */}
        <Text style={styles.sectionTitle}>Trending & Priority Features</Text>
        <View style={styles.featuresGrid}>
          {TOP_FEATURES.map((feature, idx) => (
            <TouchableOpacity 
              key={feature.id} 
              style={[styles.featureCard, { borderTopColor: feature.color }]}
              onPress={() => router.push(`/modules${feature.path}`)}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureTitle}>{feature.title_key.replace('feat_', '').replace(/_/g, ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* All Categories */}
        <Text style={styles.sectionTitle}>All Services</Text>
        {RURAL_CATEGORIES.map(category => (
          <View key={category.id} style={styles.categoryBlock}>
            <Text style={[styles.categoryTitle, { color: category.color }]}>{category.title_key.replace('cat_', '').toUpperCase()}</Text>
            <View style={styles.categoryGrid}>
              {category.features.map(feat => (
                <TouchableOpacity 
                  key={feat.id} 
                  style={styles.catFeatureCard}
                  onPress={() => router.push(`/modules${feat.path}`)}
                >
                  <View style={[styles.catFeatureIconBg, { backgroundColor: feat.color + '20' }]}>
                    <Text style={styles.catFeatureIcon}>{feat.icon}</Text>
                  </View>
                  <Text style={styles.catFeatureTitle} numberOfLines={2}>{feat.title_key.replace('feat_', '').replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        
        <View style={{height: 40}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { padding: 8, marginRight: 8 },
  backBtnText: { fontSize: 16, color: '#3b82f6', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  content: { padding: 16 },
  
  hero: { backgroundColor: '#dcfce7', padding: 24, borderRadius: 20, marginBottom: 24, alignItems: 'center' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#166534', textAlign: 'center', marginBottom: 12 },
  heroSubtitle: { fontSize: 15, color: '#14532d', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  heroButtons: { flexDirection: 'row', gap: 12 },
  primaryBtn: { backgroundColor: '#16a34a', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  secondaryBtn: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#16a34a' },
  secondaryBtnText: { color: '#16a34a', fontWeight: 'bold', fontSize: 15 },

  tickerContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 24, elevation: 2 },
  tickerTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  tickerScroll: { flexDirection: 'row' },
  tickerItem: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, marginRight: 12, minWidth: 160 },
  tickerCrop: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  tickerMarket: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  tickerPrice: { fontSize: 18, fontWeight: '900', color: '#3b82f6' },
  tickerChange: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  featureCard: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, borderTopWidth: 4 },
  featureIcon: { fontSize: 32, marginBottom: 12 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' },

  categoryBlock: { marginBottom: 24 },
  categoryTitle: { fontSize: 16, fontWeight: '900', marginBottom: 16, letterSpacing: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catFeatureCard: { width: (width - 44) / 3, backgroundColor: '#fff', padding: 12, borderRadius: 12, alignItems: 'center', elevation: 1 },
  catFeatureIconBg: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  catFeatureIcon: { fontSize: 24 },
  catFeatureTitle: { fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center', textTransform: 'capitalize' }
});
