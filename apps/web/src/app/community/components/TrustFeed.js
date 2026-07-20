'use client';
import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { Play, Star, BadgeCheck, ShieldCheck, Heart, MessageCircle, Share2 } from 'lucide-react';

export default function TrustFeed({ zoneId }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_URL}/api/v1/trust-reviews/feed?zoneId=${zoneId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setFeed(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch trust feed', err);
      }
      setLoading(false);
    };
    if (zoneId) fetchFeed();
  }, [zoneId]);

  if (loading) return <div className="text-center p-8">Loading Community Trust Feed...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black flex justify-center items-center gap-2">
          <ShieldCheck className="text-emerald-500" size={32} />
          Community Trust Feed
        </h2>
        <p className="text-slate-500 mt-2">Verified video reviews from real neighbors.</p>
      </div>

      {feed.length === 0 ? (
        <div className="bg-slate-50 p-12 text-center rounded-2xl border border-slate-200">
          <Star className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-xl font-bold text-slate-700">No reviews yet</h3>
          <p className="text-slate-500 mt-2">Be the first to review a shop in your area!</p>
        </div>
      ) : (
        feed.map(review => (
          <div key={review.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500">
                  {review.user_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1">
                    {review.user_name}
                    {review.is_verified_buyer && <BadgeCheck className="text-blue-500 w-4 h-4" />}
                  </h4>
                  <p className="text-xs text-slate-500">Reviewed <span className="font-bold text-slate-700">{review.shop_name}</span></p>
                </div>
              </div>
              <div className="flex bg-amber-50 px-2 py-1 rounded-lg">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-amber-200'} />
                ))}
              </div>
            </div>

            {/* Video Placeholder */}
            <div className="aspect-[9/16] bg-slate-900 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              
              {/* Fake Video Thumbnail / Player */}
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md cursor-pointer hover:scale-110 transition-transform z-20">
                <Play className="text-white fill-white ml-2 w-8 h-8" />
              </div>

              {/* Text Overlay */}
              <div className="absolute bottom-4 left-4 right-16 z-20">
                <p className="text-white font-medium text-sm leading-snug drop-shadow-md">"{review.review_text}"</p>
              </div>
            </div>

            {/* Interaction Bar */}
            <div className="p-4 flex justify-between items-center bg-slate-50 border-t border-slate-100">
              <div className="flex gap-6">
                <button className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors font-medium">
                  <Heart size={20} /> <span className="text-sm">Helpful</span>
                </button>
                <button className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors font-medium">
                  <MessageCircle size={20} /> <span className="text-sm">Comment</span>
                </button>
              </div>
              <button className="text-slate-500 hover:text-slate-900">
                <Share2 size={20} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
