import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiGet } from '../../src/lib/api';
import { useZone } from '../../src/context/ZoneContext';

const { width, height } = Dimensions.get('window');

export default function TrustFeedScreen() {
  const router = useRouter();
  const { activeZone } = useZone();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const zoneId = activeZone?.id || 1;
        const data = await apiGet(`/trust-reviews/feed?zoneId=${zoneId}`);
        setFeed(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to fetch trust feed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [activeZone]);

  const renderItem = ({ item }) => (
    <View style={styles.videoContainer}>
      {/* Fake Video Player Full Screen */}
      <View style={styles.fakeVideoBg}>
        <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.8)" />
      </View>
      
      {/* Overlay UI */}
      <View style={styles.overlay}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Trust Feed</Text>
        </View>

        {/* Bottom Content */}
        <View style={styles.bottomContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.user_name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.userName}>
                {item.user_name} 
                {item.is_verified_buyer && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
              </Text>
              <Text style={styles.shopName}>Reviewed {item.shop_name}</Text>
            </View>
          </View>
          <Text style={styles.reviewText}>"{item.review_text}"</Text>
          <View style={styles.stars}>
            {[...Array(5)].map((_, i) => (
              <Ionicons key={i} name={i < item.rating ? "star" : "star-outline"} size={16} color="#fbbf24" />
            ))}
          </View>
        </View>

        {/* Right Actions */}
        <View style={styles.actionsRight}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="heart" size={32} color="#fff" />
            <Text style={styles.actionText}>Helpful</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble" size={30} color="#fff" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-social" size={32} color="#fff" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={feed.length > 0 ? feed : [{ id: 1, user_name: 'Rahul K.', shop_name: 'Sharma Grocery', review_text: 'Excellent quality and fast delivery!', rating: 5, is_verified_buyer: true }]}
        renderItem={renderItem}
        estimatedItemSize={height}
        pagingEnabled
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoContainer: { width, height },
  fakeVideoBg: { flex: 1, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 16, textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  bottomContent: { padding: 20, paddingBottom: 40, paddingRight: 80 },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#94a3b8', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#fff' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  userName: { color: '#fff', fontSize: 16, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  shopName: { color: '#cbd5e1', fontSize: 12 },
  reviewText: { color: '#fff', fontSize: 15, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  stars: { flexDirection: 'row', marginBottom: 16 },
  actionsRight: { position: 'absolute', right: 16, bottom: 80, alignItems: 'center' },
  actionBtn: { alignItems: 'center', marginBottom: 24 },
  actionText: { color: '#fff', fontSize: 12, marginTop: 4, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }
});
