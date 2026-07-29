import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
// Note: In a real environment, you would run: `npx expo install lottie-react-native`
// import LottieView from 'lottie-react-native';

export default function AnimatedLoader({ message = "Loading...", type = "cart" }) {
  // Placeholder for the actual Lottie JSON paths
  const lottieSource = type === 'delivery' 
    ? require('../../assets/animations/scooter.json') 
    : require('../../assets/animations/cart.json');

  return (
    <View style={styles.container}>
      {/* 
        <LottieView
          autoPlay
          loop
          style={styles.lottie}
          source={lottieSource}
        />
      */}
      <View style={styles.placeholderBox}>
        <Text style={styles.placeholderText}>[Lottie: {type}]</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  lottie: {
    width: 200,
    height: 200,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A1D36',
    fontWeight: '600',
  },
  placeholderBox: {
    width: 150,
    height: 150,
    backgroundColor: '#E6F7F1',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00B074',
    borderStyle: 'dashed'
  },
  placeholderText: {
    color: '#00B074',
    fontWeight: 'bold'
  }
});
