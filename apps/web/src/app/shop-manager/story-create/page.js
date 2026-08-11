'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { Video, UploadCloud, Link as LinkIcon, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StoryCreator() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [form, setForm] = useState({
    description: '',
    productId: ''
  });

  const handleUpload = (e) => {
    e.preventDefault();
    setIsUploading(true);
    // Mock video upload processing
    setTimeout(() => {
      setIsUploading(false);
      setUploadComplete(true);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <Header />
      
      <div className="max-w-4xl mx-auto p-6 pt-24">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
            <Video className="text-pink-500" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Create Shop Story</h1>
            <p className="text-slate-400 mt-1 font-medium">Post a 15-second video to the Local Discover Feed and drive instant sales.</p>
          </div>
        </div>

        {uploadComplete ? (
          <div className="bg-slate-900 border-2 border-pink-500 rounded-3xl p-12 text-center shadow-[0_0_50px_rgba(236,72,153,0.15)] animate-fade-in">
            <CheckCircle size={64} className="text-pink-500 mx-auto mb-6" />
            <h2 className="text-3xl font-black text-white mb-2">Story Published! 🎉</h2>
            <p className="text-slate-400 mb-8">Your video is now live in the Discover Feed for all residents in a 2km radius.</p>
            <button 
              onClick={() => router.push('/shop-dashboard')}
              className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-8 rounded-xl transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Upload Area */}
            <div>
              <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-3xl h-[500px] relative overflow-hidden transition-colors flex flex-col items-center justify-center group cursor-pointer">
                <input 
                  type="file" 
                  accept="video/mp4,video/x-m4v,video/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${isUploading ? 'bg-pink-500/20 text-pink-500 animate-pulse' : 'bg-slate-800 text-slate-400 group-hover:bg-pink-500/10 group-hover:text-pink-500'}`}>
                  {isUploading ? <UploadCloud size={32} /> : <ImageIcon size={32} />}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 text-center px-4">
                  {isUploading ? 'Uploading Video...' : 'Select a Video Clip'}
                </h3>
                <p className="text-slate-400 text-sm text-center px-8">
                  {isUploading ? 'Compressing and optimizing for mobile...' : 'Max 15 seconds. MP4 or MOV. Vertical format (9:16) recommended.'}
                </p>
              </div>
            </div>

            {/* Details Form */}
            <form onSubmit={handleUpload} className="space-y-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Video size={18} className="text-slate-400" /> Story Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Caption</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="e.g. Fresh batch of cookies just came out of the oven! 🍪🔥"
                      value={form.description}
                      onChange={e => setForm({...form, description: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <LinkIcon size={18} className="text-slate-400" /> Link Product (Shoppable Video)
                </h3>
                <p className="text-sm text-slate-400 mb-4">Allow customers to buy directly while watching the video.</p>
                
                <div>
                  <select 
                    required
                    value={form.productId}
                    onChange={e => setForm({...form, productId: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white outline-none focus:border-pink-500 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a product from your catalog...</option>
                    <option value="P-101">Hot Jalebi 500g - ₹120</option>
                    <option value="P-102">Chocolate Cake 1kg - ₹600</option>
                    <option value="P-103">Organic Avocados - ₹350</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isUploading}
                className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                  isUploading 
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-pink-500/25'
                }`}
              >
                {isUploading ? 'Processing...' : 'Publish to Discover Feed'}
              </button>
            </form>

          </div>
        )}

      </div>
    </div>
  );
}
