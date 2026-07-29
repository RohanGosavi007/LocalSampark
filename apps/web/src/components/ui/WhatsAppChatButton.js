'use client';
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * 10x Direct Merchant WhatsApp Integration
 * High-contrast floating button that builds immense trust in Indian hyperlocal markets.
 */
export const WhatsAppChatButton = ({ phoneNumber, shopName }) => {
  const handleWhatsApp = () => {
    // Format phone number to standard 91 format
    const cleanPhone = phoneNumber?.replace(/\D/g, '');
    const finalPhone = cleanPhone?.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const message = encodeURIComponent(`Hi ${shopName}, I have a query regarding a product on LocalSampark.`);
    const url = `https://wa.me/${finalPhone}?text=${message}`;
    
    window.open(url, '_blank');
  };

  if (!phoneNumber) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleWhatsApp}
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl shadow-[#25D366]/40 flex items-center gap-3 border border-white/20"
      aria-label="Chat with Shopkeeper on WhatsApp"
    >
      <MessageCircle size={28} fill="white" />
      <span className="font-bold pr-2 hidden md:inline">Chat with Shopkeeper</span>
    </motion.button>
  );
};
