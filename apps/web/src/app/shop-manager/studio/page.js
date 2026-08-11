'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { Video, Upload, Plus, Tag, Play, CheckCircle, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreatorStudioPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const mockInventory = [
    { id: 'P1', name: 'Fresh Chocolate Croissant (Pack of 2)', price: 180 },
    { id: 'P2', name: 'Artisan Sourdough Bread', price: 150 },
    { id: 'P3', name: 'Blueberry Cheesecake Slice', price: 220 }
  ];

  const handlePublish = () => {
    setStep(4);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
      <Header />
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-pink-600 text-white pt-16 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Video size={200} />
        </div>
        <div className="max-w-4xl mx-auto relative z-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3">
              <Video className="text-pink-300" /> Creator Studio
            </h1>
            <p className="text-purple-100 max-w-lg">Upload short videos of your products, tag them, and get discovered on the Local Reels feed.</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-20">
        
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden min-h-[60vh] flex flex-col md:flex-row">
          
          {/* Left Panel: Preview Phone */}
          <div className="w-full md:w-1/2 bg-slate-900 p-8 flex flex-col items-center justify-center border-r border-slate-200/10">
            <div className="w-[280px] h-[580px] bg-black rounded-[3rem] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
              
              {/* Notch */}
              <div className="absolute top-0 w-32 h-6 bg-slate-800 rounded-b-3xl z-30"></div>
              
              {!videoLoaded ? (
                <div className="text-center text-slate-500 flex flex-col items-center">
                  <Smartphone size={48} className="mb-4 opacity-50" />
                  <p className="text-sm font-bold">Preview Area</p>
                  <p className="text-xs">Upload a video to see how it looks on the resident's feed.</p>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <video src="https://www.w3schools.com/html/mov_bbb.mp4" autoPlay loop muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  
                  {/* Shoppable Tag Preview */}
                  {selectedProduct && (
                    <div className="absolute bottom-6 left-4 right-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2 flex items-center gap-2">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-white text-xs font-bold line-clamp-1">{selectedProduct.name}</p>
                        <p className="text-white font-black text-sm">₹{selectedProduct.price}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Controls */}
          <div className="w-full md:w-1/2 p-8 bg-white flex flex-col">
            
            {step === 1 && (
              <div className="flex-1 flex flex-col justify-center animate-fade-in">
                <h2 className="text-2xl font-black mb-2">Upload Video</h2>
                <p className="text-slate-500 text-sm mb-8">Select a short vertical video (9:16) up to 30 seconds long.</p>
                
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors mb-8"
                  onClick={() => {
                    setVideoLoaded(true);
                    setStep(2);
                  }}
                >
                  <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                    <Upload size={24} />
                  </div>
                  <h3 className="font-bold text-lg mb-1">Click to Upload</h3>
                  <p className="text-xs text-slate-400">MP4, MOV (Max 50MB)</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex-1 flex flex-col animate-fade-in">
                <h2 className="text-2xl font-black mb-2 flex items-center gap-2"><Tag className="text-purple-600" /> Tag a Product</h2>
                <p className="text-slate-500 text-sm mb-6">Make your video shoppable by linking it to an item from your inventory.</p>
                
                <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                  {mockInventory.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedProduct(item)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                        selectedProduct?.id === item.id ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-purple-600 font-bold text-sm">₹{item.price}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedProduct?.id === item.id ? 'border-purple-600 bg-purple-600' : 'border-slate-300'
                      }`}>
                        {selectedProduct?.id === item.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-6 mt-auto">
                  <button 
                    onClick={() => setStep(3)}
                    disabled={!selectedProduct}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-600/20"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex-1 flex flex-col animate-fade-in">
                <h2 className="text-2xl font-black mb-2">Add Details</h2>
                <p className="text-slate-500 text-sm mb-6">Write a catchy caption to engage residents.</p>
                
                <div className="space-y-6 flex-1">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Caption</label>
                    <textarea 
                      placeholder="e.g. Fresh out of the oven! 🥐 Grab yours now." 
                      rows={4}
                      className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    ></textarea>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Tagged Product</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                      <div>
                        <p className="font-bold text-sm">{selectedProduct.name}</p>
                        <p className="text-purple-600 font-bold text-sm">₹{selectedProduct.price}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-auto">
                  <button 
                    onClick={handlePublish}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2"
                  >
                    <Play size={18} /> Publish to Local Reels
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 border border-emerald-200">
                  <CheckCircle size={40} className="text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black mb-2">Video Published!</h2>
                <p className="text-slate-500 text-sm mb-8 max-w-xs">
                  Your shoppable video is now live on the Local Reels feed. Residents within a 2km radius will see it.
                </p>
                <button 
                  onClick={() => router.push('/shop-manager')}
                  className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
