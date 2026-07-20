import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import StoryViewer from './StoryViewer';
import { router } from 'expo-router';

const MOCK_STORIES = [
  { id: 1, user: 'Your Story', avatar: 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff', hasStory: false, isUser: true },
  { id: 2, user: 'Society Admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=f59e0b&color=fff', hasStory: true, isUser: false, items: [{ id: 101, image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800', userName: 'Society Admin', userAvatar: 'https://ui-avatars.com/api/?name=Admin&background=f59e0b&color=fff', time: '2h ago', text: 'Important Society Meeting Tomorrow at 10 AM in the Clubhouse.' }] },
  { id: 3, user: 'Glow Salon', avatar: 'https://ui-avatars.com/api/?name=Salon&background=ec4899&color=fff', hasStory: true, isUser: false, items: [{ id: 102, image: 'https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?w=800', userName: 'Glow Salon', userAvatar: 'https://ui-avatars.com/api/?name=Salon&background=ec4899&color=fff', time: '3h ago', text: 'Flat 20% OFF on all Spa Services this weekend!' }] },
  { id: 4, user: 'Pharmacy', avatar: 'https://ui-avatars.com/api/?name=Pharma&background=10b981&color=fff', hasStory: true, isUser: false, items: [{ id: 103, image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800', userName: 'Pharmacy', userAvatar: 'https://ui-avatars.com/api/?name=Pharma&background=10b981&color=fff', time: '5h ago', text: 'New stock of Vitamin C supplements arrived.' }] },
  { id: 5, user: 'Neha P.', avatar: 'https://ui-avatars.com/api/?name=Neha&background=8b5cf6&color=fff', hasStory: false, isUser: false }
];

export default function StoriesRow() {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentStories, setCurrentStories] = useState([]);

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
        {MOCK_STORIES.map((story) => (
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
