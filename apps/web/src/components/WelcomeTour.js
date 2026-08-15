'use client';
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, MapPin, MessageSquare, ShoppingBag } from 'lucide-react';

export default function WelcomeTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Show only once per user
    const hasSeenTour = localStorage.getItem('localsampark_tour_seen');
    if (!hasSeenTour) {
      setIsVisible(true);
    }
  }, []);

  const completeTour = () => {
    localStorage.setItem('localsampark_tour_seen', 'true');
    setIsVisible(false);
  };

  const nextStep = () => {
    if (step === 2) {
      completeTour();
    } else {
      setStep(step + 1);
    }
  };

  if (!isVisible) return null;

  const tourContent = [
    {
      title: "Welcome to LocalSampark! 👋",
      desc: "Your entire neighborhood is now in your pocket. Let's take a quick 3-step tour of your new Super App.",
      icon: MapPin,
      color: "text-blue-500",
      bg: "bg-blue-500/20"
    },
    {
      title: "Shop from Local Kiranas",
      desc: "Order groceries, medicines, and services directly from shops right outside your society gate. Delivery in 15 minutes!",
      icon: ShoppingBag,
      color: "text-green-500",
      bg: "bg-green-500/20"
    },
    {
      title: "The Society Townsquare",
      desc: "Connect with neighbors, buy/sell used items, and view intercom requests from the Gatekeeper instantly.",
      icon: MessageSquare,
      color: "text-purple-500",
      bg: "bg-purple-500/20"
    }
  ];

  const current = tourContent[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      
      <div className="w-full max-w-sm bg-background border-2 border-border rounded-3xl shadow-2xl relative overflow-hidden">
        
        {/* Skip Button */}
        <button 
          onClick={completeTour}
          className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-8 text-center flex flex-col items-center">
          
          <div className={`w-20 h-20 rounded-full ${current.bg} flex items-center justify-center mb-6`}>
            <current.icon className={current.color} size={40} />
          </div>

          <h2 className="text-2xl font-black text-text mb-3">{current.title}</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-8">
            {current.desc}
          </p>

          {/* Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {[0, 1, 2].map(i => (
              <div 
                key={i} 
                className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-blue-500' : 'w-2 bg-border'}`}
              ></div>
            ))}
          </div>

          <button 
            onClick={nextStep}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
          >
            {step === 2 ? 'Get Started' : 'Next'}
            {step < 2 && <ChevronRight size={18} />}
          </button>
          
        </div>
      </div>
    </div>
  );
}
