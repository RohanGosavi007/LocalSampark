'use client';
import React, { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { Video, Upload, Tag, Play, CheckCircle, Smartphone, AlertCircle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

export default function CreatorStudioPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [caption, setCaption] = useState('');
  const [loadingShop, setLoadingShop] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [shop, setShop] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  useEffect(() => {
    async function fetchShopAndProducts() {
      if (!token) {
        setLoadingShop(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/v1/shops/my-shop`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setShop(data.shop || null);
          setInventory(data.products || []);
        }
      } catch (err) {
        console.error('Error loading shop inventory:', err);
      } finally {
        setLoadingShop(false);
      }
    }
    fetchShopAndProducts();
  }, [token]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Video file is too large. Max size allowed is 50MB.');
      return;
    }

    setVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);
    setStep(2);
  };

  const handlePublish = async () => {
    if (!videoFile) {
      alert('Please upload a video first.');
      return;
    }
    if (!token) {
      alert('Please log in to publish reels.');
      return;
    }

    setPublishing(true);
    try {
      // 1. Upload video file
      const formData = new FormData();
      formData.append('file', videoFile, videoFile.name || 'story-video.mp4');
      formData.append('purpose', 'story');
      if (shop?.id) formData.append('reference_id', shop.id);

      const uploadRes = await fetch(`${API_URL}/api/v1/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload video file.');
      }

      const mediaUrl = uploadData.url || uploadData.fileUrl || (uploadData.files && uploadData.files[0]?.url);
      if (!mediaUrl) {
        throw new Error('No media URL returned by server.');
      }

      // 2. Publish story / reel
      const fullCaption = selectedProduct
        ? `${caption.trim()} [Tagged: ${selectedProduct.name} - ₹${selectedProduct.price || selectedProduct.offer_price || 0}]`
        : caption.trim();

      const storyRes = await fetch(`${API_URL}/api/v1/stories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mediaUrl,
          mediaType: 'video',
          caption: fullCaption,
          shop_id: shop?.id || null
        })
      });

      const storyData = await storyRes.json();
      if (!storyRes.ok) {
        throw new Error(storyData.error || 'Failed to publish story.');
      }

      setStep(4);
    } catch (err) {
      alert('Publishing error: ' + (err.message || 'Network error'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
      <Header />
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600 text-white pt-16 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Video size={200} />
        </div>
        <div className="max-w-4xl mx-auto relative z-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3">
              <Video className="text-pink-300" /> Creator Studio & Local Reels
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
              
              {!videoPreviewUrl ? (
                <div className="text-center text-slate-500 flex flex-col items-center px-4">
                  <Smartphone size={48} className="mb-4 opacity-50" />
                  <p className="text-sm font-bold text-slate-400">Live Phone Preview</p>
                  <p className="text-xs text-slate-500 mt-1">Upload a video to see how it looks on the resident's mobile feed.</p>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <video
                    src={videoPreviewUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                  
                  {/* Shoppable Tag Preview */}
                  {selectedProduct && (
                    <div className="absolute bottom-6 left-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2.5 flex items-center gap-2">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                        {selectedProduct.image_url ? (
                          <img src={selectedProduct.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Tag size={16} className="text-purple-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">{selectedProduct.name}</p>
                        <p className="text-pink-300 font-black text-xs">₹{selectedProduct.price || selectedProduct.offer_price || 0}</p>
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
                <p className="text-slate-500 text-sm mb-6">Select a short vertical video (9:16) up to 30 seconds long.</p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div 
                  className="border-2 border-dashed border-slate-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors mb-6"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                    <Upload size={24} />
                  </div>
                  <h3 className="font-bold text-lg mb-1">Click to Select Video</h3>
                  <p className="text-xs text-slate-400">MP4, WEBM, MOV (Max 50MB)</p>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700 flex items-center gap-2">
                  <Sparkles size={16} className="shrink-0 text-purple-600" />
                  <span>Videos with clear product close-ups get 3x higher engagement!</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex-1 flex flex-col animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <Tag className="text-purple-600" /> Tag a Product
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setStep(3);
                    }}
                    className="text-xs font-bold text-purple-600 hover:underline"
                  >
                    Skip Tagging
                  </button>
                </div>
                <p className="text-slate-500 text-sm mb-4">Make your video shoppable by linking it to an item from your store catalog.</p>
                
                {loadingShop ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading inventory...
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="p-6 border border-slate-200 rounded-2xl text-center my-auto">
                    <AlertCircle size={28} className="text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No Catalog Products Found</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">You can publish without tagging, or add products in Shop Manager first.</p>
                    <button
                      onClick={() => setStep(3)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Continue Without Tagging
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-2">
                    {inventory.map(item => {
                      const isSelected = selectedProduct?.id === item.id;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setSelectedProduct(isSelected ? null : item)}
                          className={`p-3.5 border-2 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                            isSelected ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                              {item.image_url ? (
                                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Tag size={16} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4>
                              <p className="text-purple-600 font-bold text-xs">₹{item.price || item.offer_price || 0}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-purple-600 bg-purple-600' : 'border-slate-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="pt-6 mt-auto flex gap-3">
                  <button 
                    onClick={() => setStep(1)}
                    className="px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-sm"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep(3)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-600/20 text-sm"
                  >
                    Continue to Details
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex-1 flex flex-col animate-fade-in">
                <h2 className="text-2xl font-black mb-2">Add Caption</h2>
                <p className="text-slate-500 text-sm mb-6">Write a catchy description to engage residents.</p>
                
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Video Caption</label>
                    <textarea 
                      placeholder="e.g. Fresh out of the oven! 🥐 Grab yours today before 2 PM." 
                      rows={4}
                      value={caption}
                      onChange={e => setCaption(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm"
                    ></textarea>
                  </div>
                  
                  {selectedProduct ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Tagged Shoppable Item</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {selectedProduct.image_url ? (
                            <img src={selectedProduct.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Tag size={16} className="text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{selectedProduct.name}</p>
                          <p className="text-purple-600 font-bold text-xs">₹{selectedProduct.price || selectedProduct.offer_price || 0}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      No product tagged. Video will appear as an announcement story.
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-auto flex gap-3">
                  <button 
                    onClick={() => setStep(2)}
                    disabled={publishing}
                    className="px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-sm disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading & Publishing...
                      </>
                    ) : (
                      <>
                        <Play size={16} /> Publish to Local Reels
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in py-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 border border-emerald-200">
                  <CheckCircle size={40} className="text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black mb-2">Video Published!</h2>
                <p className="text-slate-500 text-sm mb-8 max-w-xs">
                  Your shoppable video is now live on the Local Reels feed. Residents within your neighborhood will see it.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setStep(1);
                      setVideoFile(null);
                      setVideoPreviewUrl(null);
                      setSelectedProduct(null);
                      setCaption('');
                    }}
                    className="px-5 py-2.5 border border-slate-300 font-bold rounded-xl text-slate-700 hover:bg-slate-100 text-sm flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Create Another
                  </button>
                  <button 
                    onClick={() => router.push('/shop-dashboard')}
                    className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-slate-800 transition-colors text-sm"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
