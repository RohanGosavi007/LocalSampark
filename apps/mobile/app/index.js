import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Animated, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PILLARS = [
  { title: 'Community & Forums', icon: '💬', desc: 'Share local updates & stories.', color: '#fef08a' },
  { title: 'Local Business', icon: '🛒', desc: 'Order direct from neighborhood stores.', color: '#bbf7d0' },
  { title: 'Gig Economy & Jobs', icon: '🔧', desc: 'Hire verified local electricians & plumbers.', color: '#bfdbfe' },
  { title: 'Real Estate Hub', icon: '🏢', desc: 'Search for rental apartments without brokers.', color: '#fbcfe8' },
  { title: 'Hyperlocal Delivery', icon: '📦', desc: 'Send packages across your zone instantly.', color: '#fed7aa' },
  { title: 'Carpool & Travel', icon: '🚗', desc: 'Share daily rides to IT Parks.', color: '#ddd6fe' },
  { title: 'Society Management', icon: '🏘️', desc: 'Digital visitor gate passes & maintenance.', color: '#a7f3d0' },
  { title: 'Krishi Hub', icon: '🌾', desc: '120+ farming & agriculture services.', color: '#d9f99d' },
  { title: 'Earn & Franchise', icon: '💸', desc: 'Become a franchise partner and earn.', color: '#fef9c3' },
];

// Safe navigation wrapper — catches and shows any navigation error
const safeNavigate = (path) => {
  try {
    router.push(path);
  } catch (err) {
    Alert.alert('Navigation Error', `Failed to open ${path}: ${err.message}`);
  }
};

export default function WelcomeScreen() {
  const [stats, setStats] = useState({ neighbors: 1000, shops: 50, gigs: 10 });
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(() => {
      setStats(prev => {
        if (prev.neighbors >= 12450 && prev.shops >= 347 && prev.gigs >= 78) {
          clearInterval(interval);
          return prev;
        }
        return {
          neighbors: prev.neighbors < 12450 ? prev.neighbors + 430 : 12450,
          shops: prev.shops < 347 ? prev.shops + 12 : 347,
          gigs: prev.gigs < 78 ? prev.gigs + 3 : 78,
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HERO SECTION WITH VIBRANT GRADIENT */}
        <Animated.View style={[styles.heroContainer, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#e0e7ff', '#f0fdf4', '#ffffff']}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📍 Pilot Live in Dhanori, Pune</Text>
            </View>
            
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Image source={require('../assets/icon.png')} style={{ width: 100, height: 100, resizeMode: 'contain' }} />
            </View>
            
            <Text style={styles.heroTitle}>
              Your Neighborhood,{'\n'}
              <Text style={styles.heroHighlight}>Connected.</Text>
            </Text>
            
            <Text style={styles.heroDesc}>
              LocalSampark is India's most comprehensive hyper-local super-app. Connect with neighbors, find service providers, shop from local stores, and earn money.
            </Text>

            <View style={styles.ctaGroup}>
              <TouchableOpacity onPress={() => safeNavigate('/login')} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#ec4899', '#8b5cf6', '#3b82f6']}
                  style={styles.primaryBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.primaryBtnText}>📱 Get Started / Login</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.secondaryCtaGroup}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => safeNavigate('/modules/krishi')}>
                  <Text style={styles.secondaryBtnText}>🌾 Krishi Hub</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => safeNavigate('/modules/franchise')}>
                  <Text style={styles.secondaryBtnText}>🤝 Franchise</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* STATS BAR */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>{stats.neighbors.toLocaleString()}+</Text>
            <Text style={styles.statLabel}>Active Neighbors</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🏪</Text>
            <Text style={styles.statValue}>{stats.shops}+</Text>
            <Text style={styles.statLabel}>Local Shops</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={styles.statValue}>{stats.gigs}+</Text>
            <Text style={styles.statLabel}>On-Demand Gigs</Text>
          </View>
        </View>

        {/* PILLARS GRID */}
        <View style={styles.pillarsSection}>
          <View style={styles.badgeContainer}>
            <LinearGradient
              colors={['#3b82f6', '#8b5cf6']}
              style={styles.darkBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.darkBadgeText}>Platform Architecture</Text>
            </LinearGradient>
          </View>
          <Text style={styles.sectionTitle}>8 Pillars of LocalSampark</Text>
          <Text style={styles.sectionDesc}>Everything your community needs, unified under a single colourful platform.</Text>
          
          <View style={styles.gridContainer}>
            {PILLARS.map((pillar, idx) => (
              <View key={idx} style={styles.pillarCard}>
                <View style={[styles.iconContainer, { backgroundColor: pillar.color }]}>
                  <Text style={styles.pillarIcon}>{pillar.icon}</Text>
                </View>
                <Text style={styles.pillarTitle}>{pillar.title}</Text>
                <Text style={styles.pillarDesc}>{pillar.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroContainer: {
    width: '100%',
  },
  heroGradient: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'flex-start',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: 24,
  },
  badgeText: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 48,
    marginBottom: 20,
  },
  heroHighlight: {
    color: '#ec4899',
  },
  heroDesc: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 40,
  },
  ctaGroup: {
    width: '100%',
    gap: 16,
  },
  primaryBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryCtaGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryBtnText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    color: '#8b5cf6',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  pillarsSection: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  darkBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  darkBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionDesc: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pillarCard: {
    width: (width - 64) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pillarIcon: {
    fontSize: 24,
  },
  pillarTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pillarDesc: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  }
});
