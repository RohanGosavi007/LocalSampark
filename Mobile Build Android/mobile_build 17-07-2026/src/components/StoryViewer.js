import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Dimensions, SafeAreaView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function StoryViewer({ visible, stories, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      startAnimation();
    } else {
      progress.setValue(0);
    }
  }, [visible, currentIndex]);

  const startAnimation = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000, // 5 seconds per story
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        goToNext();
      }
    });
  };

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      progress.setValue(0);
      startAnimation();
    }
  };

  const handlePress = (evt) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 3) {
      goToPrev();
    } else {
      goToNext();
    }
  };

  if (!visible || !stories || stories.length === 0) return null;

  const currentStory = stories[currentIndex];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity activeOpacity={1} style={styles.imageContainer} onPress={handlePress}>
          <Image source={{ uri: currentStory.image || 'https://via.placeholder.com/600x800?text=Story' }} style={styles.image} />
          
          <View style={styles.overlay}>
            {/* Progress Bars */}
            <View style={styles.progressRow}>
              {stories.map((_, i) => (
                <View key={i} style={styles.progressBg}>
                  <Animated.View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: i === currentIndex ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : 
                               i < currentIndex ? '100%' : '0%' 
                      }
                    ]} 
                  />
                </View>
              ))}
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.userInfo}>
                <Image source={{ uri: currentStory.userAvatar || 'https://ui-avatars.com/api/?name=U' }} style={styles.avatar} />
                <View>
                  <Text style={styles.userName}>{currentStory.userName || 'User'}</Text>
                  <Text style={styles.timeText}>{currentStory.time || 'Just now'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Text Overlay */}
            {currentStory.text && (
              <View style={styles.textOverlay}>
                <Text style={styles.storyText}>{currentStory.text}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  imageContainer: { flex: 1, backgroundColor: '#000' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, padding: 16, paddingTop: 40, justifyContent: 'space-between' },
  
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  progressBg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#fff' },
  userName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  timeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  closeBtn: { padding: 4 },
  
  textOverlay: { paddingBottom: 60, alignItems: 'center' },
  storyText: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 }
});
