// Mock implementation of audio and vibration since actual expo-av requires native linking
import { Vibration } from 'react-native';

class OrderAlertService {
  constructor() {
    this.isPlaying = false;
    this.vibratePattern = [0, 500, 200, 500]; // wait, vibrate, wait, vibrate
    this.vibrateInterval = null;
  }

  async startRing(type = 'order') {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    console.log(`[OrderAlertService] Started ringing for ${type}...`);
    
    // Simulate loud sound playback
    // In production: await Audio.Sound.createAsync(require('../../assets/sounds/order_alert.mp3'))
    
    // Start repeating vibration
    this.vibrateInterval = setInterval(() => {
      Vibration.vibrate(this.vibratePattern);
    }, 1500);
  }

  stopRing() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    
    console.log('[OrderAlertService] Stopped ringing.');
    
    if (this.vibrateInterval) {
      clearInterval(this.vibrateInterval);
      this.vibrateInterval = null;
    }
    Vibration.cancel();
  }
}

export default new OrderAlertService();
