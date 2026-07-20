import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import i18n from '../src/i18n';

const { width } = Dimensions.get('window');

const slides = [
  { id: '1', title: 'Welcome to LocalSampark', description: 'Your one-stop app for local deliveries, services, and community engagement.', emoji: '🚀' },
  { id: '2', title: 'Live Delivery Tracking', description: 'Track your packages and agents in real-time with our advanced mapping system.', emoji: '🗺️' },
  { id: '3', title: 'Start Earning', description: 'Join as a delivery partner and earn daily payouts directly to your wallet.', emoji: '💰' }
];

export default function OnboardingTutorial() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.slide}>
        <Text style={styles.emoji}>{slides[currentSlide].emoji}</Text>
        <Text style={styles.title}>{slides[currentSlide].title}</Text>
        <Text style={styles.description}>{slides[currentSlide].description}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View key={index} style={[styles.dot, currentSlide === index && styles.activeDot]} />
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={nextSlide}>
          <Text style={styles.buttonText}>{currentSlide === slides.length - 1 ? "Get Started" : i18n.t('next')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emoji: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  description: { fontSize: 16, color: '#64748b', textAlign: 'center', paddingHorizontal: 20 },
  footer: { padding: 20, paddingBottom: 40 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#3b82f6', width: 16 },
  button: { backgroundColor: '#3b82f6', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
