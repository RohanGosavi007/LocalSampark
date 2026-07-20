import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ModifierDrawer({ isOpen, onClose, product, onConfirm }) {
  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-center items-end bg-black/50" onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-background rounded-t-3xl p-6 shadow-2xl relative"
          onClick={e => e.stopPropagation()}
        >
          <button className="absolute top-4 right-4 p-2 bg-background-alt rounded-full text-text-muted" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-bold text-text mb-2">Customize {product.name}</h2>
          <p className="text-sm text-text-muted mb-6">Choose your preferred options</p>

          {/* Example static modifier list - dynamic in real world */}
          <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto no-scrollbar">
            <div>
              <h3 className="font-bold text-text mb-2">Size</h3>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-xl border-2 border-orange-500 bg-orange-500/10 text-orange-600 font-bold">Regular</button>
                <button className="px-4 py-2 rounded-xl border border-border text-text-muted">Large (+₹50)</button>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-text mb-2">Add-ons</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-orange-500" />
                  <span className="flex-1 text-sm font-bold text-text">Extra Cheese</span>
                  <span className="text-sm text-text-muted">+₹30</span>
                </label>
              </div>
            </div>
          </div>

          <button 
            className="w-full py-4 rounded-xl bg-orange-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30"
            onClick={() => {
              onConfirm?.(product, 1, { size: 'Regular' });
              onClose();
            }}
          >
            Add to Cart - ₹{product.price}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
