import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Star, MapPin, Clock } from 'lucide-react-native';

const ITEM_HEIGHT = 140;

// Memoized Shop List Item for React Native
const ShopListItem = memo(({ item, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress && onPress(item)}
      style={s.card}
    >
      {/* Banner / Logo */}
      <View style={s.imageBox}>
        {item.logoUrl ? (
          <Image
            source={{ uri: item.logoUrl }}
            style={s.image}
            resizeMode="cover"
          />
        ) : (
          <View style={s.placeholderImage}>
            <Text style={s.placeholderText}>{item.name.charAt(0)}</Text>
          </View>
        )}
      </View>

      {/* Info Container */}
      <View style={s.infoContainer}>
        <View style={s.rowBetween}>
          <Text style={s.shopName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>{item.categoryType}</Text>
          </View>
        </View>

        <Text style={s.categoryText} numberOfLines={1}>
          {item.category?.name || 'Local Store'}
        </Text>

        <View style={s.metaRow}>
          <View style={s.ratingBox}>
            <Star size={12} color="#f59e0b" fill="#f59e0b" />
            <Text style={s.ratingText}>
              {item.rating} ({item.totalRatings})
            </Text>
          </View>

          <View style={s.locationBox}>
            <MapPin size={12} color="#94a3b8" />
            <Text style={s.locationText} numberOfLines={1}>
              {item.locality}
            </Text>
          </View>
        </View>

        <View style={s.footerRow}>
          <View style={s.deliveryBox}>
            <Clock size={12} color="#10b981" />
            <Text style={s.deliveryText}>
              {item.estimatedDeliveryTime || '30-45 mins'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

ShopListItem.displayName = 'ShopListItem';

export default function OptimizedShopDirectoryFlatList({
  shops = [],
  onShopPress,
  onEndReached,
  refreshing = false,
  onRefresh,
}) {
  const renderItem = useCallback(
    ({ item }) => <ShopListItem item={item} onPress={onShopPress} />,
    [onShopPress]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <FlatList
      data={shops}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      // PERFORMANCE OPTIMIZATIONS
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={5}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={50}
      onEndReachedThreshold={0.5}
      onEndReached={onEndReached}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      ListEmptyComponent={
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>No shops found in this pincode.</Text>
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  card: {
    height: ITEM_HEIGHT - 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  imageBox: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 9,
    fontWeight: 'bold',
  },
  categoryText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    color: '#64748b',
    fontSize: 11,
    marginLeft: 4,
  },
  footerRow: {
    marginTop: 6,
  },
  deliveryBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
});
