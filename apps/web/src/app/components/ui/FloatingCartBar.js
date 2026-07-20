'use client';
import React from 'react';
import { useCartStore } from '../../../store/cartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react';

/**
 * FloatingCartBar — Sticky bottom cart summary bar
 * Shows item count, total, and expands to mini-cart view
 */
export default function FloatingCartBar({ shopName, onCheckout }) {
  const { items, getCartTotal, getItemCount, updateQuantity, removeItem, isOpen, toggleCart, closeCart } = useCartStore();
  const itemCount = getItemCount();
  const total = getCartTotal();

  if (itemCount === 0) return null;

  return (
    <>
      {/* Mini Cart Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] bg-card-bg backdrop-blur-xl border-t border-border rounded-t-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cat-primary-light flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-cat-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-text">Your Cart</h3>
                  <p className="text-xs text-text-muted">{shopName} · {itemCount} items</p>
                </div>
              </div>
              <button onClick={closeCart} className="p-2 rounded-full hover:bg-background-alt transition-colors">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            {/* Items */}
            <div className="overflow-y-auto max-h-[45vh] p-4 space-y-3">
              {items.map((item) => (
                <div key={`${item.id}-${JSON.stringify(item.options || {})}`} className="flex items-center gap-4 p-3 rounded-2xl bg-background border border-border hover:border-cat-primary/30 transition-all group">
                  {/* Item Image */}
                  <div className="w-14 h-14 rounded-xl bg-background-alt flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-text-muted/40" />
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-text truncate">{item.name}</h4>
                    {item.options && Object.keys(item.options).length > 0 && (
                      <p className="text-xs text-text-muted truncate">
                        {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </p>
                    )}
                    <p className="text-sm font-bold text-cat-primary mt-0.5">₹{item.price}</p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 bg-background-alt rounded-xl border border-border p-1">
                    <button
                      onClick={() => item.quantity <= 1 ? removeItem(item.id) : updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors"
                    >
                      {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="w-7 text-center text-sm font-bold text-text">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-cat-primary-light text-text-muted hover:text-cat-primary transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right flex-shrink-0 w-16">
                    <p className="font-bold text-sm text-text">₹{(item.price * item.quantity).toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with Total & Checkout */}
            <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-text-muted font-medium">Subtotal</span>
                <span className="text-xl font-heading font-black text-text">₹{total.toFixed(0)}</span>
              </div>
              <button
                onClick={() => { closeCart(); onCheckout?.(); }}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all duration-300 cat-gradient hover:shadow-lg hover:shadow-cat-primary/20 active:scale-[0.98]"
                style={{ background: 'var(--cat-gradient, var(--primary))' }}
              >
                Proceed to Checkout · ₹{total.toFixed(0)}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bar (collapsed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-6 md:w-96"
          >
            <button
              onClick={toggleCart}
              className="w-full flex items-center justify-between p-4 rounded-2xl text-white shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--cat-gradient, linear-gradient(135deg, var(--primary), var(--secondary)))' }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-xs font-bold rounded-full flex items-center justify-center"
                    style={{ color: 'var(--cat-primary, var(--primary))' }}>
                    {itemCount}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{itemCount} item{itemCount > 1 ? 's' : ''}</p>
                  <p className="text-xs opacity-80">{shopName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-heading font-black">₹{total.toFixed(0)}</span>
                <ChevronUp className="w-5 h-5 animate-bounce" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
