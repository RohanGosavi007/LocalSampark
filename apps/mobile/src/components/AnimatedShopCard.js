import React, { useCallback } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, Extrapolation, FadeIn, FadeOut, Layout,
} from 'react-native-reanimated';
import { Star, MapPin, Truck, Clock } from 'lucide-react-native';
import { colors, radii, elevation, timing, glow } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_W = (SCREEN_W - 48 - CARD_MARGIN) / 2;

const SPRING = {
  damping: timing.spring.damping,
  stiffness: timing.spring.stiffness,
  mass: timing.spring.mass,
};

/**
 * AnimatedShopCard
 *
 * A shop card that enters with stagger-ready layout animation, scales on press
 * with spring physics, and uses a sharedTransitionTag on its image so
 * navigating to a detail screen can perform a shared-element transition.
 *
 * The card uses Reanimated's `entering` prop for stagger delays and `layout`
 * for smooth re-ordering when the list filters change.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AnimatedShopCard({ shop, index = 0, onPress, style }) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { stiffness: 500, damping: 15 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING);
  }, []);

  const handlePress = useCallback(() => {
    onPress?.(shop);
  }, [shop, onPress]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const categoryColor = getCategoryAccent(shop.category || shop.category_name);
  const emoji = getCategoryEmoji(shop.category || shop.category_name);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      entering={FadeIn.delay(Math.min(index * timing.stagger, 600)).springify()}
      layout={Layout.springify()}
      style={[styles.card, containerStyle, style]}
    >
      {/* Image area with shared transition tag */}
      <View style={[styles.imageArea, { backgroundColor: `${categoryColor}10` }]}>
        {shop.logoUrl || shop.photo_url ? (
          <Animated.Image
            source={{ uri: shop.logoUrl || shop.photo_url }}
            style={styles.image}
            resizeMode="cover"
            // sharedTransitionTag enables the shared-element transition.
            // When navigating to shop detail, Reanimated will morph this
            // image to the detail screen's hero image if both share the same tag.
            sharedTransitionTag={`shop-image-${shop.id}`}
          />
        ) : (
          <Animated.View
            style={styles.placeholderImage}
            sharedTransitionTag={`shop-image-${shop.id}`}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Animated.View>
        )}

        {/* Rating badge */}
        {shop.rating && (
          <View style={styles.ratingBadge}>
            <Star size={10} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.ratingText}>{shop.rating}</Text>
          </View>
        )}

        {/* Delivery badge */}
        {shop.has_delivery && (
          <View style={[styles.deliveryBadge, { backgroundColor: `${colors.primary}E6` }]}>
            <Truck size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Category pill */}
        <View style={[styles.categoryPill, { backgroundColor: `${categoryColor}18` }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]} numberOfLines={1}>
            {shop.category || shop.category_name || 'Local'}
          </Text>
        </View>

        <Animated.Text
          style={styles.shopName}
          numberOfLines={1}
          sharedTransitionTag={`shop-name-${shop.id}`}
        >
          {shop.name}
        </Animated.Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={11} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {shop.distance ? `${shop.distance}km` : shop.address?.split(',')[0] || 'Nearby'}
            </Text>
          </View>
          {shop.estimatedDeliveryTime && (
            <View style={styles.metaItem}>
              <Clock size={11} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary, fontWeight: '700' }]}>
                {shop.estimatedDeliveryTime}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom accent bar */}
      <View style={[styles.accentBar, { backgroundColor: categoryColor }]} />
    </AnimatedPressable>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getCategoryAccent(category) {
  const map = {
    'grocery': colors.primary,
    'restaurant': '#FF6B00',
    'pharmacy': '#2563EB',
    'salon': '#FF007F',
    'services': '#FFD600',
    'bakery': '#F59E0B',
    'electronics': '#6366F1',
    'vegetable': '#10B981',
    'dairy': '#00E5FF',
    'tiffin': '#FF6B00',
  };
  const key = Object.keys(map).find(k =>
    (category || '').toLowerCase().includes(k)
  );
  return map[key] || colors.primary;
}

function getCategoryEmoji(category) {
  const map = {
    'grocery': '🛒', 'restaurant': '🍽️', 'pharmacy': '💊',
    'salon': '✂️', 'bakery': '🧁', 'electronics': '🔌',
    'gym': '🏋️', 'automotive': '🚗', 'tiffin': '🍱',
    'vegetable': '🥬', 'fruit': '🍎', 'dairy': '🥛',
    'hardware': '🔧', 'clothing': '👗',
  };
  const key = Object.keys(map).find(k =>
    (category || '').toLowerCase().includes(k)
  );
  return map[key] || '🏪';
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation(2),
  },
  imageArea: {
    height: CARD_W * 0.7,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 42,
    opacity: 0.65,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.full,
    ...elevation(1),
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  deliveryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 12,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  accentBar: {
    height: 3,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
});

export default React.memo(AnimatedShopCard);
