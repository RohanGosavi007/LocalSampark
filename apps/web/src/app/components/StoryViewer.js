'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from './ui/Avatar';

export default function StoryViewer({ visible, stories, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      return;
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            clearInterval(timer);
            onClose();
            return 100;
          }
        }
        return prev + 2; // 50 updates per second -> 5 seconds total
      });
    }, 100);

    return () => clearInterval(timer);
  }, [visible, currentIndex, stories.length, onClose]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
  }, [initialIndex, visible]);

  if (!visible || !stories || stories.length === 0) return null;

  const currentStory = stories[currentIndex];

  const handleNext = (e) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={onClose}
        >
          <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md h-[80vh] max-h-[800px] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Progress Bars */}
            <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-4 pt-6">
              {stories.map((_, i) => (
                <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{ 
                      width: i === currentIndex ? `${progress}%` : i < currentIndex ? '100%' : '0%' 
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-0 right-0 z-20 px-4 flex items-center gap-3">
              <img src={currentStory.userAvatar} alt="avatar" className="w-10 h-10 rounded-full border-2 border-white/50" />
              <div>
                <h3 className="text-white font-bold text-sm shadow-black drop-shadow-md">{currentStory.userName}</h3>
                <p className="text-white/80 text-xs drop-shadow-md">{currentStory.time}</p>
              </div>
            </div>

            {/* Image */}
            <div className="flex-1 relative bg-black flex items-center justify-center">
              <img src={currentStory.image} alt="Story" className="w-full h-full object-cover" />
              
              {/* Text Overlay */}
              {currentStory.text && (
                <div className="absolute bottom-20 left-4 right-4 text-center">
                  <p className="text-white text-2xl font-bold drop-shadow-lg shadow-black">{currentStory.text}</p>
                </div>
              )}
            </div>

            {/* Navigation Areas */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-2/3 z-10 cursor-pointer" onClick={handleNext} />

            {/* Desktop Nav Buttons */}
            <button onClick={handlePrev} className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full items-center justify-center text-white backdrop-blur-md transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={handleNext} className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full items-center justify-center text-white backdrop-blur-md transition-colors">
              <ChevronRight className="w-6 h-6" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
