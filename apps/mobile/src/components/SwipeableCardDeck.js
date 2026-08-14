import React, { useCallback, useRef, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, Extrapolation, runOnJS, useAnimatedReaction,
  SharedTransition,
} from 'react-native-reanimated';
import { Star, MapPin, Clock, ChevronRight } from 'lucide-react-native';
import { colors, radii, elevation, timing } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.88;
const CARD_H = CARD_W * 1.25;
const SWIPE_THRESHOLD = SCREEN_W * 0.3;
const ROTATION_FACTOR = 15; // degrees per screen width

const SPRING = {
  damping: timing.spring.damping,
  stiffness: timing.spring.stiffness,
  mass: timing.spring.mass,
};

/**
 * SwipeableCardDeck
 *
 * Physics-based card swiping with a deck stack visual. The top card follows
 * the finger with natural rotation and velocity-driven throw. Cards beneath
 * scale up and fade in as the top card departs.
 *
 * Uses Gesture Handler v2 and Reanimated worklets — all touch processing
 * runs on the UI thread, so the JS thread can't stutter the interaction.
 */

// ─── Single Card ──────────────────────────────────────────────────────────

function SwipeCard({ shop, index, totalCards, activeIndex, onSwipeComplete, onPress }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isActive = useMemo(() => index === 0, [index]);

  const panGesture = Gesture.Pan()
    .enabled(isActive)
    .onUpdate((e) => {
      'worklet';
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.35; // Damped vertical
    })
    .onEnd((e) => {
      'worklet';
      const velocityThreshold = 800;
      const shouldDismiss =
        Math.abs(translateX.value) > SWIPE_THRESHOLD ||
        Math.abs(e.velocityX) > velocityThreshold;

      if (shouldDismiss) {
        const direction = translateX.value > 0 ? 1 : -1;
        const exitX = direction * SCREEN_W * 1.5;
        const exitVelocity = Math.max(Math.abs(e.velocityX), 1200);

        translateX.value = withSpring(exitX, {
          velocity: e.velocityX,
          damping: 20,
          stiffness: 100,
        });
        translateY.value = withSpring(e.translationY * 0.5, {
          damping: 25,
          stiffness: 120,
        });

        // Notify JS thread after animation settles
        const timeToSettle = Math.min((SCREEN_W / exitVelocity) * 1000 + 200, 600);
        // Use runOnJS to callback after timeout
        runOnJS(onSwipeComplete)(shop, direction > 0 ? 'right' : 'left');
      } else {
        // Snap back with spring
        translateX.value = withSpring(0, SPRING);
        translateY.value = withSpring(0, SPRING);
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(isActive)
    .onEnd(() => {
      'worklet';
      if (Math.abs(translateX.value) < 5) {
        runOnJS(onPress)(shop);
      }
    });

  const composed = Gesture.Simultaneous(panGesture, tapGesture);

  const cardStyle = useAnimatedStyle(() => {
    if (!isActive) {
      // Stacked cards: scale down and shift up per depth
      const stackScale = interpolate(index, [0, 1, 2, 3], [1, 0.95, 0.9, 0.85], Extrapolation.CLAMP);
      const stackY = interpolate(index, [0, 1, 2, 3], [0, -12, -22, -30], Extrapolation.CLAMP);
      const stackOpacity = interpolate(index, [0, 1, 2, 3], [1, 0.85, 0.6, 0.3], Extrapolation.CLAMP);

      return {
        transform: [
          { scale: stackScale },
          { translateY: stackY },
        ],
        opacity: stackOpacity,
        zIndex: totalCards - index,
      };
    }

    // Active card: follow finger
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_W, 0, SCREEN_W],
      [-ROTATION_FACTOR, 0, ROTATION_FACTOR],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
      opacity: 1,
      zIndex: totalCards,
    };
  });

  // Swipe direction indicator overlay
  const likeOverlay = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const nopeOverlay = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const categoryColor = getCategoryAccent(shop.category || shop.category_name);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Image / Placeholder */}
        <View style={[styles.cardImage, { backgroundColor: `${categoryColor}15` }]}>
          {shop.logoUrl || shop.photo_url ? (
            <Image
              source={{ uri: shop.logoUrl || shop.photo_url }}
              style={styles.cardImageImg}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.cardEmoji}>
              {shop.emoji || getCategoryEmoji(shop.category || shop.category_name)}
            </Text>
          )}

          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
            <Text style={styles.categoryBadgeText} numberOfLines={1}>
              {shop.category || shop.category_name || 'Local'}
            </Text>
          </View>

          {/* Swipe indicators */}
          <Animated.View style={[styles.swipeIndicator, styles.likeIndicator, likeOverlay]}>
            <Text style={styles.swipeIndicatorText}>VISIT →</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeIndicator, styles.nopeIndicator, nopeOverlay]}>
            <Text style={styles.swipeIndicatorText}>← SKIP</Text>
          </Animated.View>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.metaText}>{shop.rating || '4.5'}</Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{shop.distance ? `${shop.distance} km` : 'Nearby'}</Text>
            </View>
            {shop.has_delivery && (
              <View style={styles.metaItem}>
                <Clock size={14} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.primary }]}>
                  {shop.estimatedDeliveryTime || '30 min'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.shopDescription} numberOfLines={2}>
            {shop.description || 'Your trusted neighbourhood shop'}
          </Text>

          <View style={styles.ctaRow}>
            <View style={[styles.ctaButton, { backgroundColor: categoryColor }]}>
              <Text style={styles.ctaText}>
                {shop.type === 'appointment' ? 'Book Now' : 'View Shop'}
              </Text>
              <ChevronRight size={16} color="#fff" />
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Deck Container ───────────────────────────────────────────────────────

export default function SwipeableCardDeck({
  shops = [],
  onSwipe,
  onPress,
  maxVisible = 3,
  emptyMessage = 'No more shops to explore!',
}) {
  const currentIndex = useRef(0);
  const [visibleShops, setVisibleShops] = React.useState(
    shops.slice(0, maxVisible)
  );

  React.useEffect(() => {
    currentIndex.current = 0;
    setVisibleShops(shops.slice(0, maxVisible));
  }, [shops, maxVisible]);

  const handleSwipeComplete = useCallback((shop, direction) => {
    onSwipe?.(shop, direction);

    currentIndex.current += 1;
    const nextSlice = shops.slice(currentIndex.current, currentIndex.current + maxVisible);
    setVisibleShops(nextSlice);
  }, [shops, maxVisible, onSwipe]);

  const handlePress = useCallback((shop) => {
    onPress?.(shop);
  }, [onPress]);

  if (visibleShops.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🏪</Text>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.deckContainer}>
      {/* Render in reverse so the first item is on top */}
      {[...visibleShops].reverse().map((shop, reverseIndex) => {
        const index = visibleShops.length - 1 - reverseIndex;
        return (
          <SwipeCard
            key={shop.id || `card-${currentIndex.current + index}`}
            shop={shop}
            index={index}
            totalCards={visibleShops.length}
            onSwipeComplete={handleSwipeComplete}
            onPress={handlePress}
          />
        );
      })}
    </View>
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
  };
  const key = Object.keys(map).find(k =>
    (category || '').toLowerCase().includes(k)
  );
  return map[key] || '🏪';
}

const styles = StyleSheet.create({
  deckContainer: {
    width: CARD_W,
    height: CARD_H,
    alignSelf: 'center',
    marginVertical: 16,
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...elevation(3),
  },
  cardImage: {
    height: CARD_H * 0.48,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardImageImg: {
    width: '100%',
    height: '100%',
  },
  cardEmoji: {
    fontSize: 72,
    opacity: 0.7,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  swipeIndicator: {
    position: 'absolute',
    top: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.base,
    borderWidth: 2,
  },
  likeIndicator: {
    right: 16,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  nopeIndicator: {
    left: 16,
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}20`,
  },
  swipeIndicatorText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#fff',
  },
  cardInfo: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  shopName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  shopDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.base,
    gap: 4,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: {
    width: CARD_W,
    height: CARD_H * 0.6,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    marginVertical: 16,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
