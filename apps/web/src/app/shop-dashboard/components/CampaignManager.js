'use client';
import { useState } from 'react';
import { Play, Clock, Tag, MapPin, Zap } from 'lucide-react';

export default function CampaignManager() {
  const [title, setTitle] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [fomoTimer, setFomoTimer] = useState(0);

  const handleCreate = async (e) => {
    e.preventDefault();
    alert(`Campaign "${title}" created and scheduled!`);
    setTitle('');
    setDiscountValue('');
    setIsFlashSale(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Campaign Engine</h2>
          <p className="text-slate-500 mt-1">Schedule promotions, flash sales, and push notifications.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg border border-blue-100 flex items-center gap-2">
          <Zap size={20} className="text-blue-500 fill-blue-500" />
          <span className="font-bold">Enterprise Tools</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Campaign Title</label>
            <input 
              type="text" 
              placeholder="e.g., Weekend Grocery Bonanza" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Discount Type</label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium">
                <option value="percentage">% Percentage</option>
                <option value="flat">₹ Flat Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Value</label>
              <input 
                type="number" 
                placeholder="20"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Start Date & Time</label>
              <input 
                type="datetime-local" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">End Date & Time</label>
              <input 
                type="datetime-local" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                required
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-amber-900 flex items-center gap-2">
                  <Zap size={16} /> Flash Sale Mode
                </h4>
                <p className="text-sm text-amber-700 mt-1">Activate FOMO timer on visitor screens</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isFlashSale} onChange={() => setIsFlashSale(!isFlashSale)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            
            {isFlashSale && (
              <div className="mt-4 pt-4 border-t border-amber-200/50">
                <label className="block text-sm font-bold text-amber-900 mb-1">FOMO Timer Duration (Minutes)</label>
                <input 
                  type="number" 
                  value={fomoTimer}
                  onChange={(e) => setFomoTimer(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20">
            <Play size={20} />
            Schedule Campaign
          </button>
        </form>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-8 -mt-8"></div>
          
          <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs mb-6">Live Preview</h3>
          
          {/* Mobile Preview Mockup */}
          <div className="w-[280px] mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 border-[6px] border-slate-100 overflow-hidden pb-4">
            <div className="h-4 bg-slate-100 w-full mb-4"></div>
            
            <div className="px-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-20">
                  <Tag size={48} />
                </div>
                <div className="flex gap-1 mb-2">
                  <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider backdrop-blur-sm">
                    {isFlashSale ? '⚡ FLASH SALE' : 'PROMO'}
                  </span>
                </div>
                <h4 className="font-black text-lg leading-tight mb-1">
                  {title || 'Your Campaign Title'}
                </h4>
                <p className="text-blue-100 text-xs mb-3">
                  Get {discountValue ? discountValue : 'X'}% OFF on all orders today!
                </p>
                
                {isFlashSale && (
                  <div className="bg-black/20 rounded p-2 flex items-center justify-between border border-white/10">
                    <span className="text-[10px] font-bold uppercase">Ends In</span>
                    <span className="font-mono font-bold text-amber-300">00:{fomoTimer || '30'}:00</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
