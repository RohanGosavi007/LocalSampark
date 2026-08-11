'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { Gift, Copy, Check, Users, Coins, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReferralPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const inviteCode = 'FLATA402';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = \`Join LocalSampark using my invite code \${inviteCode} and we both get 500 LocalCoins! 🚀\`;
    if (navigator.share) {
      await navigator.share({ title: 'Join LocalSampark', text });
    } else {
      window.open(\`https://wa.me/?text=\${encodeURIComponent(text)}\`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:bg-slate-900">
      <div className="hidden md:block"><Header /></div>
      
      {/* Mobile Frame Container */}
      <div className="flex-1 max-w-md w-full mx-auto bg-slate-950 md:mt-24 md:mb-12 md:rounded-[2rem] md:border-[8px] md:border-slate-800 md:shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* App Bar */}
        <div className="bg-slate-900 p-6 border-b border-slate-800 z-10 flex justify-between items-center">
          <button onClick={() => router.back()} className="text-blue-500 font-bold">← Back</button>
          <h1 className="text-lg font-bold text-white">Invite & Earn</h1>
          <Gift className="text-pink-500" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-tr from-pink-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(219,39,119,0.3)]">
              <Gift size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Get 500 Coins</h2>
            <p className="text-slate-400">For every neighbor who signs up with your code, you both get <strong className="text-yellow-500">500 LocalCoins</strong>.</p>
          </div>

          {/* Invite Code Box */}
          <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl p-6 mb-8 text-center relative">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Your Invite Code</p>
            <h3 className="text-4xl font-black text-white tracking-widest mb-6">{inviteCode}</h3>
            
            <div className="flex gap-2">
              <button 
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button 
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors"
              >
                <Share2 size={18} />
                Share
              </button>
            </div>
          </div>

          {/* Stats */}
          <h3 className="text-white font-bold mb-4">Your Referral Stats</h3>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <Users size={20} className="text-blue-500 mb-2" />
              <h4 className="text-2xl font-black text-white">4</h4>
              <p className="text-slate-500 text-xs font-bold mt-1">Friends Joined</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <Coins size={20} className="text-yellow-500 mb-2" />
              <h4 className="text-2xl font-black text-white">2000</h4>
              <p className="text-slate-500 text-xs font-bold mt-1">Coins Earned</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
