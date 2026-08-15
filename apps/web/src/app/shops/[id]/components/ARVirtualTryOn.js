'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, CheckCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ARVirtualTryOn({ item, onClose }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Camera access denied or unavailable. Please enable permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    
    // Simulate processing delay for "AR Fitting"
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      setSnapshot(canvas.toDataURL('image/jpeg'));
      setIsCapturing(false);
    }, 800);
  };

  const retake = () => {
    setSnapshot(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-lg bg-card-bg rounded-2xl overflow-hidden border border-border shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-black/50">
          <div>
            <h3 className="text-lg font-bold text-text flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              AR Virtual Try-On
            </h3>
            <p className="text-xs text-text-muted">Trying on: {item?.name || 'Aviator Glasses'}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-card-bg rounded-full hover:bg-gray-700 text-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera/Canvas Area */}
        <div className="relative aspect-[3/4] sm:aspect-square bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-400 font-medium">{error}</p>
              <button onClick={startCamera} className="mt-4 px-4 py-2 bg-card-bg text-text rounded-lg hover:bg-gray-700">
                Try Again
              </button>
            </div>
          ) : (
            <>
              {snapshot ? (
                <img src={snapshot} alt="AR Snapshot" className="w-full h-full object-cover" />
              ) : (
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}

              {/* AR Overlay (Simulated) */}
              {!error && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Mock Glasses Overlay Frame */}
                  <div className="w-48 h-16 border-4 border-primary/50 rounded-xl flex items-center justify-between px-2 shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                    <div className="w-20 h-12 border-2 border-primary rounded-lg bg-primary/10 backdrop-blur-[1px]"></div>
                    <div className="w-4 h-1 bg-primary"></div>
                    <div className="w-20 h-12 border-2 border-primary rounded-lg bg-primary/10 backdrop-blur-[1px]"></div>
                  </div>
                </div>
              )}

              {/* Face Guide UI */}
              {!snapshot && !error && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-80 border-2 border-dashed border-white/30 rounded-[100px] flex items-center justify-center">
                    <p className="absolute -bottom-8 text-white/70 text-sm font-medium">Align face here</p>
                  </div>
                </div>
              )}

              {/* Flash Effect */}
              <AnimatePresence>
                {isCapturing && (
                  <motion.div 
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-white z-10"
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Controls */}
        {!error && (
          <div className="p-6 bg-card-bg border-t border-border">
            {snapshot ? (
              <div className="flex gap-3">
                <button
                  onClick={retake}
                  className="flex-1 py-3 bg-card-bg text-text rounded-xl font-medium hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCcw className="w-5 h-5" /> Retake
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all"
                >
                  <CheckCircle className="w-5 h-5" /> Looks Good!
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <button 
                  onClick={takeSnapshot}
                  disabled={isCapturing}
                  className="w-16 h-16 rounded-full border-4 border-gray-400 flex items-center justify-center hover:border-primary transition-colors disabled:opacity-50 group"
                >
                  <div className="w-12 h-12 bg-white rounded-full group-hover:bg-primary transition-colors"></div>
                </button>
                <p className="text-text-muted text-sm mt-3 font-medium">Tap to capture</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
