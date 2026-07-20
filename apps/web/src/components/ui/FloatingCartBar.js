import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronRight } from 'lucide-react';

export default function FloatingCartBar({ itemCount, totalAmount, onClick }) {
  if (itemCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-green-500 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center relative">
          <ShoppingBag className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
            {itemCount}
          </span>
        </div>
        <div>
          <p className="font-bold">₹{totalAmount}</p>
          <p className="text-xs text-white/80">View Cart</p>
        </div>
      </div>
      <div className="flex items-center gap-1 font-bold text-sm">
        Checkout <ChevronRight className="w-4 h-4" />
      </div>
    </motion.div>
  );
}
