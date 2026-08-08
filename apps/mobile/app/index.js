import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Alert, Image as RNImage, Platform } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { 
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay,
  withRepeat, withSequence, interpolate, Extrapolation, FadeIn, FadeInDown, FadeInUp,
  SlideInRight
} from 'react-native-reanimated';

// Crash-safe native module imports with fallbacks
let ExpoImage;
try {
  ExpoImage = require('expo-image').Image;
} catch (e) {
  ExpoImage = RNImage;
}

let LinearGradient;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  LinearGradient = ({ children, style }) => <View style={[style, { backgroundColor: '#0F172A' }]}>{children}</View>;
}

let Haptics;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = { impactAsync: () => {}, ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' }, notificationAsync: () => {}, NotificationFeedbackType: { Success: 'success' } };
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 2;

const PILLARS = [
  { title: 'Community', icon: '💬', desc: 'Share local updates & stories.', gradient: ['#EC4899', '#8B5CF6'], route: '/community' },
  { title: 'Local Shops', icon: '🛒', desc: 'Order from neighborhood stores.', gradient: ['#F97316', '#F59E0B'], route: '/shops' },
  { title: 'Gig & Jobs', icon: '🔧', desc: 'Hire verified local services.', gradient: ['#3B82F6', '#06B6D4'], route: '/jobs' },
  { title: 'Real Estate', icon: '🏢', desc: 'Search rentals without brokers.', gradient: ['#EC4899', '#F43F5E'], route: '/properties' },
  { title: 'Delivery', icon: '📦', desc: 'Send packages across your zone.', gradient: ['#8B5CF6', '#6366F1'], route: '/delivery' },
  { title: 'Carpool', icon: '🚗', desc: 'Share rides to IT Parks.', gradient: ['#10B981', '#059669'], route: '/carpool' },
  { title: 'Society Mgmt', icon: '🏘️', desc: 'Digital gate passes & notices.', gradient: ['#6366F1', '#4F46E5'], route: '/society' },
  { title: 'Krishi Hub', icon: '🌾', desc: '120+ agriculture services.', gradient: ['#84CC16', '#22C55E'], route: '/modules/krishi' },
  { title: 'Earn & Franchise', icon: '💸', desc: 'Become a partner and earn.', gradient: ['#F59E0B', '#EF4444'], route: '/earn' },
];

const safeNavigate = (path) => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(path);
  } catch (err) {
    Alert.alert('Navigation Error', `Failed to open ${path}: ${err.message}`);
  }
};

// ── Glass Pillar Card with Reanimated ──
function PillarCard({ pillar, index }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { stiffness: 400, damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 300, damping: 10 });
  };

  return (
    <Animated.View 
      entering={FadeInUp.delay(index * 80).springify().damping(15)}
      style={[animatedStyle]}
    >
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => safeNavigate(pillar.route)}
        activeOpacity={0.9}
        style={styles.pillarCard}
      >
        {/* Glass background */}
        <View style={styles.pillarCardInner}>
          {/* Gradient icon container */}
          <LinearGradient
            colors={pillar.gradient}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Glass shine overlay */}
            <View style={styles.iconShine} />
            <Text style={styles.pillarIcon}>{pillar.icon}</Text>
          </LinearGradient>
          
          <Text style={styles.pillarTitle}>{pillar.title}</Text>
          <Text style={styles.pillarDesc}>{pillar.desc}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Animated Stat Counter ──
function AnimatedStat({ icon, targetValue, label, delay = 0 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setValue(prev => {
          if (prev >= targetValue) {
            clearInterval(interval);
            return targetValue;
          }
          const step = Math.ceil(targetValue / 25);
          return Math.min(prev + step, targetValue);
        });
      }, 40);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [targetValue, delay]);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value.toLocaleString()}+</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const heroFloat = useSharedValue(0);

  useEffect(() => {
    heroFloat.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1, true
    );
  }, []);

  const heroFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heroFloat.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Full-screen mesh gradient background */}
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#064E3B', '#0F172A']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── HERO SECTION ── */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.heroContainer}>
          {/* Live badge */}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>📍 Pilot Live in Dhanori, Pune</Text>
          </View>
          
          {/* App icon with float animation */}
          <Animated.View style={[{ alignItems: 'center', marginBottom: 20 }, heroFloatStyle]}>
            <View style={styles.appIconGlow}>
              <ExpoImage source={require('../assets/icon.png')} style={styles.appIcon} />
            </View>
          </Animated.View>
          
          <Text style={styles.heroTitle}>
            Your Neighborhood,{'\n'}
            <Text style={styles.heroGradientText}>Connected.</Text>
          </Text>
          
          <Text style={styles.heroDesc}>
            India's most comprehensive hyper-local super-app. Connect, shop, earn — all within your zone.
          </Text>

          {/* CTA Buttons */}
          <View style={styles.ctaGroup}>
            <TouchableOpacity 
              onPress={() => safeNavigate('/login')} 
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ec4899', '#8b5cf6', '#3b82f6']}
                style={styles.primaryBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.btnShine} />
                <Text style={styles.primaryBtnText}>📱 Get Started / Login</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.secondaryCtaGroup}>
              <TouchableOpacity 
                style={styles.glassBtn} 
                onPress={() => safeNavigate('/modules/krishi')}
                activeOpacity={0.8}
              >
                <Text style={styles.glassBtnText}>🌾 Krishi Hub</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.glassBtn} 
                onPress={() => safeNavigate('/modules/franchise')}
                activeOpacity={0.8}
              >
                <Text style={styles.glassBtnText}>🤝 Franchise</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── STATS BAR ── */}
        <View style={styles.statsBar}>
          <AnimatedStat icon="👥" targetValue={12450} label="Neighbors" delay={200} />
          <View style={styles.statDivider} />
          <AnimatedStat icon="🏪" targetValue={347} label="Local Shops" delay={400} />
          <View style={styles.statDivider} />
          <AnimatedStat icon="⚡" targetValue={78} label="Gigs" delay={600} />
        </View>

        {/* ── PILLARS GRID ── */}
        <View style={styles.pillarsSection}>
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.sectionHeader}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.sectionBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.sectionBadgeText}>✨ Platform Architecture</Text>
            </LinearGradient>
            <Text style={styles.sectionTitle}>8 Pillars of LocalSampark</Text>
            <Text style={styles.sectionDesc}>Everything your community needs, unified under one platform.</Text>
          </Animated.View>
          
          <View style={styles.gridContainer}>
            {PILLARS.map((pillar, idx) => (
              <PillarCard key={idx} pillar={pillar} index={idx} />
            ))}
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Hero ──
  heroContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 28,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  liveBadgeText: {
    color: '#A5B4FC',
    fontWeight: 'bold',
    fontSize: 12,
  },
  appIconGlow: {
    width: 100,
    height: 100,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },
  appIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#F1F5F9',
    lineHeight: 48,
    marginBottom: 16,
  },
  heroGradientText: {
    color: '#818CF8',
  },
  heroDesc: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 24,
    marginBottom: 32,
  },

  // ── CTA ──
  ctaGroup: {
    width: '100%',
    gap: 14,
  },
  primaryBtn: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  btnShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryCtaGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  glassBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  glassBtnText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // ── Stats ──
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statValue: {
    color: '#818CF8',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // ── Pillars ──
  pillarsSection: {
    paddingHorizontal: 16,
    paddingTop: 36,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  sectionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 14,
  },
  sectionBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionDesc: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  pillarCard: {
    width: CARD_WIDTH,
    marginBottom: 4,
  },
  pillarCardInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    padding: 18,
    minHeight: 160,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  iconShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  pillarIcon: {
    fontSize: 22,
  },
  pillarTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  pillarDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },
});
