import * as Speech from 'expo-speech';

// Voice Search/Command Utility
export class VoiceService {
  /**
   * Speak a string of text
   * @param {string} text - The text to speak
   */
  static speak(text) {
    Speech.speak(text, {
      language: 'en-IN',
      pitch: 1.0,
      rate: 0.9,
    });
  }

  /**
   * Stop any current speech
   */
  static stop() {
    Speech.stop();
  }

  /**
   * Simulate a Voice Search recognition flow
   * (In a real app, you would use @react-native-voice/voice for speech-to-text)
   */
  static async startListening() {
    console.log('Voice Recognition started (Simulated)');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("I want to order paneer tikka");
      }, 2000);
    });
  }
}
