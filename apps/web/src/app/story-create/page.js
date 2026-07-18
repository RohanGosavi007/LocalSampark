'use client';
import React, { useState, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react';

export default function StoryCreatePage() {
  const [imagePreview, setImagePreview] = useState(null);
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handlePost = (e) => {
    e.preventDefault();
    if (!imagePreview && !text.trim()) return;

    setIsPosting(true);
    // Simulate API request
    setTimeout(() => {
      setIsPosting(false);
      window.location.href = '/dashboard';
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-lg mx-auto">
          
          <div className="glass-card rounded-3xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <h1 className="text-xl font-heading font-black text-text">Create Story</h1>
              <button onClick={() => window.location.href = '/dashboard'} className="p-2 bg-background-alt hover:bg-border rounded-full text-text-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePost} className="space-y-6">
              
              {!imagePreview ? (
                <div className="space-y-4">
                  <textarea 
                    placeholder="What's happening in your neighborhood?" 
                    className="w-full bg-transparent text-xl font-medium text-text placeholder:text-text-muted/60 resize-none outline-none min-h-[120px]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={200}
                  />

                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl bg-background-alt hover:border-primary/50 hover:bg-primary/5 transition-all text-text-muted group"
                    >
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform text-emerald-500">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm">Upload Photo</span>
                    </button>
                  </div>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                </div>
              ) : (
                <div className="relative w-full aspect-[9/16] max-h-[600px] bg-black rounded-2xl overflow-hidden mx-auto shadow-inner">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  
                  <button 
                    type="button" 
                    onClick={() => setImagePreview(null)}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-6 left-6 right-6">
                    <input 
                      type="text" 
                      placeholder="Add a caption..." 
                      className="w-full bg-black/60 text-white placeholder:text-white/70 px-6 py-4 rounded-xl border border-white/20 backdrop-blur-md outline-none focus:border-white/50 transition-colors"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <button 
                  type="submit" 
                  disabled={(!imagePreview && !text.trim()) || isPosting}
                  className="w-full bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center disabled:shadow-none"
                >
                  {isPosting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Posting...</> : 'Post Story'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
