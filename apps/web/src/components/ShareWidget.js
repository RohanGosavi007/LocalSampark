'use client';
import React from 'react';
import { Share2, MessageCircle } from 'lucide-react';

export default function ShareWidget({ shopName, shopSlug, offerText }) {
  
  const handleWhatsAppShare = (e) => {
    e.stopPropagation();
    const url = `https://localsampark.com/shop/${shopSlug}`;
    const message = `Hey! Check out ${shopName} on LocalSampark. ${offerText || 'Order directly to our society in 15 mins!'}\n\n${url}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleNativeShare = async (e) => {
    e.stopPropagation();
    const url = `https://localsampark.com/shop/${shopSlug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shopName,
          text: `Check out ${shopName} on LocalSampark!`,
          url: url
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handleWhatsAppShare}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
        title="Share on WhatsApp"
      >
        <MessageCircle size={16} />
      </button>
      <button 
        onClick={handleNativeShare}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-card-bg text-text-muted hover:bg-slate-700 hover:text-white transition-colors"
        title="Share Link"
      >
        <Share2 size={16} />
      </button>
    </div>
  );
}
