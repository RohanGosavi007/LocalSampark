'use client';
import React, { useState, useEffect } from 'react';
import { Play, Heart, MessageCircle, Share2, CheckCircle2 } from 'lucide-react';
import { apiGet } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';

export default function TrustFeed() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    // In a real app we'd fetch actual videos, using mock for UI demonstration
    setTimeout(() => {
      setFeed([
        {
          id: 1,
          shop_name: 'Gupta Provisions',
          user_name: 'Anjali Sharma',
          rating: 5,
          review_text: 'Best quality dal and rice in this area. Delivery was under 15 mins!',
          is_verified_buyer: true,
          video_url: 'https://example.com/video1.mp4',
          likes: 42
        },
        {
          id: 2,
          shop_name: 'Sparkle Cleaning Services',
          user_name: 'Rahul Verma',
          rating: 4,
          review_text: 'Deep cleaning was good, they brought all their own equipment.',
          is_verified_buyer: true,
          video_url: 'https://example.com/video2.mp4',
          likes: 18
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
      <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {feed.map((review) => (
        <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Video Placeholder (would use next/video or raw video tag) */}
          <div className="relative h-96 bg-gray-900 flex items-center justify-center">
             <div className="absolute inset-0 opacity-50 bg-gradient-to-t from-black to-transparent" />
             <Play className="w-16 h-16 text-white opacity-80" />
             <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-bold text-lg shadow-sm">{review.shop_name}</h3>
                <div className="flex items-center space-x-2 text-sm mt-1">
                  <span>{review.user_name}</span>
                  {review.is_verified_buyer && (
                    <span className="flex items-center text-green-400 text-xs bg-black/30 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Verified Buyer
                    </span>
                  )}
                </div>
             </div>
          </div>
          
          <div className="p-4">
            <div className="flex space-x-1 mb-2 text-yellow-400">
               {[...Array(review.rating)].map((_, i) => (
                 <span key={i}>★</span>
               ))}
            </div>
            <p className="text-gray-700">{review.review_text}</p>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 text-gray-500">
               <button className="flex items-center hover:text-red-500 transition">
                 <Heart className="w-5 h-5 mr-1" />
                 <span>{review.likes}</span>
               </button>
               <button className="flex items-center hover:text-blue-500 transition">
                 <MessageCircle className="w-5 h-5 mr-1" />
                 <span>Comment</span>
               </button>
               <button className="flex items-center hover:text-green-500 transition">
                 <Share2 className="w-5 h-5 mr-1" />
                 <span>Share</span>
               </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
