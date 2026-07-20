import React, { useState, useEffect } from 'react';

export default function AudioNotifier({ playSound, soundUrl = '/sounds/new-order.mp3' }) {
  useEffect(() => {
    if (playSound) {
      try {
        const audio = new Audio(soundUrl);
        // Attempt to play, noting that browsers may block autoplay until user interaction
        audio.play().catch(e => console.warn('Audio play blocked by browser interaction policies', e));
      } catch (err) {
        console.error("AudioNotifier error", err);
      }
    }
  }, [playSound, soundUrl]);

  return null; // Hidden component
}
