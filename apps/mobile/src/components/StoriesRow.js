import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import StoryViewer from './StoryViewer';
import { router } from 'expo-router';
import { apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * The stories rail at the top of the feed.
 *
 * Its own constant was named MOCK_STORIES, and it was rendered unconditionally.
 * Four of the five entries were invented, and three of them made claims a
 * neighbour would act on: "Society Admin — Important Society Meeting Tomorrow at
 * 10 AM in the Clubhouse"; "Glow Salon — Flat 20% OFF on all Spa Services this
 * weekend!"; "Pharmacy — New stock of Vitamin C supplements arrived". A
 * resident could have turned up to a meeting nobody called, or walked to a
 * chemist for stock that was never delivered. The fifth was a neighbour,
 * "Neha P.", who does not live there.
 *
 * The stock photographs came from Unsplash and were presented as those
 * businesses' own premises.
 *
 * /stories returns what people have actually posted, and the rail collapses to
 * just the user's own "Add story" tile when nobody has posted anything.
 */

/** Group the flat story rows into one rail entry per author. */
function groupByAuthor(rows) {
  const byUser = new Map();

  for (const row of rows) {
    const userId = String(row.user_id);
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        id: userId,
        user: row.full_name || 'Neighbour',
        avatar: row.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.full_name || 'N')}&background=64748b&color=fff`,
        hasStory: true,
        isUser: false,
        items: [],
      });
    }
    byUser.get(userId).items.push({
      id: String(row.id),
      image: row.media_url,
      userName: row.full_name || 'Neighbour',
      userAvatar: row.avatar_url || null,
      time: row.created_at ? new Date(row.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '',
      text: row.caption || '',
    });
  }

  return [...byUser.values()];
}

export default function StoriesRow() {
  const { user } = useAuth();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentStories, setCurrentStories] = useState([]);
  const [stories, setStories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiGet('/stories')
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res) ? res : (res?.data ?? []);
        setStories(groupByAuthor(rows));
      })
      // A rail that cannot load shows only the user's own tile. It never
      // invents neighbours.
      .catch(() => { if (!cancelled) setStories([]); });
    return () => { cancelled = true; };
  }, []);

  const rail = [
    {
      id: 'self',
      user: 'Your Story',
      avatar: user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'You')}&background=0D8ABC&color=fff`,
      hasStory: false,
      isUser: true,
    },
    ...stories,
  ];

  const handleStoryPress = (story) => {
    if (story.isUser && !story.hasStory) {
      router.push('/modules/story-create');
    } else if (story.hasStory && story.items) {
      setCurrentStories(story.items);
      setViewerVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {rail.map((story) => (
          <TouchableOpacity 
            key={story.id} 
            style={styles.storyContainer} 
            activeOpacity={0.7}
            onPress={() => handleStoryPress(story)}
          >
            <View style={[styles.avatarWrapper, story.hasStory ? styles.hasStory : styles.noStory]}>
              <Image source={story.avatar } style={styles.avatar}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
              {story.isUser && (
                <View style={styles.addButton}>
                  <Text style={styles.addButtonText}>+</Text>
                </View>
              )}
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {story.user}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <StoryViewer 
        visible={viewerVisible} 
        stories={currentStories} 
        onClose={() => setViewerVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  storyContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 64,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  hasStory: {
    borderWidth: 2,
    borderColor: '#ec4899', // Pinkish Instagram-like ring
  },
  noStory: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  addButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  addButtonText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  userName: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  }
});
