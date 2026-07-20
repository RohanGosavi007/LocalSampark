'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Flame, Leaf, Plus, Minus } from 'lucide-react';

/**
 * ModifierDrawer — Slide-up customization panel for food/product modifiers
 * Supports: portion sizes, spice levels, veg/non-veg, extras, add-ons
 */
export default function ModifierDrawer({ isOpen, onClose, item, onConfirm }) {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  if (!item) return null;

  // Default modifier groups if item doesn't provide them
  const modifierGroups = item.modifierGroups || [
    {
      id: 'portion',
      title: 'Portion Size',
      required: true,
      type: 'single',
      options: [
        { id: 'half', label: 'Half', priceAdd: 0 },
        { id: 'full', label: 'Full', priceAdd: item.price * 0.5 },
        { id: 'family', label: 'Family Pack', priceAdd: item.price * 1.5 },
      ],
    },
    {
      id: 'spice',
      title: 'Spice Level',
      required: false,
      type: 'single',
      options: [
        { id: 'mild', label: '🌶️ Mild', priceAdd: 0 },
        { id: 'medium', label: '🌶️🌶️ Medium', priceAdd: 0 },
        { id: 'hot', label: '🌶️🌶️🌶️ Hot', priceAdd: 0 },
        { id: 'extra_hot', label: '🔥 Extra Hot', priceAdd: 0 },
      ],
    },
    {
      id: 'dietary',
      title: 'Dietary Preference',
      required: false,
      type: 'single',
      options: [
        { id: 'regular', label: 'Regular', priceAdd: 0 },
        { id: 'jain', label: '🟢 Jain (No Onion/Garlic)', priceAdd: 0 },
        { id: 'vegan', label: '🌱 Vegan', priceAdd: 20 },
      ],
    },
    {
      id: 'extras',
      title: 'Add Extras',
      required: false,
      type: 'multi',
      options: [
        { id: 'cheese', label: '🧀 Extra Cheese', priceAdd: 30 },
        { id: 'butter', label: '🧈 Extra Butter', priceAdd: 20 },
        { id: 'sauce', label: '🫙 Special Sauce', priceAdd: 15 },
      ],
    },
  ];

  const toggleOption = (groupId, optionId, type) => {
    setSelectedOptions(prev => {
      if (type === 'single') {
        return { ...prev, [groupId]: optionId };
      } else {
        const current = prev[groupId] || [];
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter(id => id !== optionId) };
        }
        return { ...prev, [groupId]: [...current, optionId] };
      }
    });
  };

  const isSelected = (groupId, optionId, type) => {
    if (type === 'single') return selectedOptions[groupId] === optionId;
    return (selectedOptions[groupId] || []).includes(optionId);
  };

  const calculateTotal = () => {
    let extra = 0;
    modifierGroups.forEach(group => {
      if (group.type === 'single' && selectedOptions[group.id]) {
        const opt = group.options.find(o => o.id === selectedOptions[group.id]);
        if (opt) extra += opt.priceAdd;
      } else if (group.type === 'multi' && selectedOptions[group.id]) {
        selectedOptions[group.id].forEach(optId => {
          const opt = group.options.find(o => o.id === optId);
          if (opt) extra += opt.priceAdd;
        });
      }
    });
    return (item.price + extra) * quantity;
  };

  const handleConfirm = () => {
    const options = {};
    modifierGroups.forEach(group => {
      if (selectedOptions[group.id]) {
        if (group.type === 'single') {
          const opt = group.options.find(o => o.id === selectedOptions[group.id]);
          options[group.title] = opt?.label || selectedOptions[group.id];
        } else {
          const labels = (selectedOptions[group.id] || []).map(id => {
            const opt = group.options.find(o => o.id === id);
            return opt?.label || id;
          });
          if (labels.length) options[group.title] = labels.join(', ');
        }
      }
    });
    if (specialInstructions) options['Special Instructions'] = specialInstructions;

    onConfirm?.({
      ...item,
      quantity,
      options,
      totalPrice: calculateTotal(),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] bg-card-bg rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Item Header */}
            <div className="px-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.is_veg !== undefined && (
                      <span className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${item.is_veg ? 'border-green-500' : 'border-red-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                      </span>
                    )}
                    <h2 className="text-xl font-heading font-bold text-text">{item.name}</h2>
                  </div>
                  <p className="text-sm text-text-muted mb-2">{item.description || 'Customize your order'}</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--cat-primary, var(--primary))' }}>₹{item.price}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-background-alt">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            </div>

            {/* Modifier Groups */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {modifierGroups.map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-heading font-bold text-text">{group.title}</h3>
                    {group.required && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">Required</span>
                    )}
                    {group.type === 'multi' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cat-primary-light text-cat-primary">Select multiple</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map(opt => {
                      const selected = isSelected(group.id, opt.id, group.type);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleOption(group.id, opt.id, group.type)}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                            selected
                              ? 'border-cat-primary bg-cat-primary-light shadow-sm'
                              : 'border-border bg-background hover:border-cat-primary/30'
                          }`}
                          style={selected ? { borderColor: 'var(--cat-primary)' } : {}}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selected ? 'border-cat-primary bg-cat-primary' : 'border-border'
                            }`} style={selected ? { borderColor: 'var(--cat-primary)', backgroundColor: 'var(--cat-primary)' } : {}}>
                              {selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-semibold ${selected ? 'text-text' : 'text-text-muted'}`}>{opt.label}</span>
                          </div>
                          {opt.priceAdd > 0 && (
                            <span className="text-xs font-bold text-text-muted">+₹{opt.priceAdd}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Special Instructions */}
              <div>
                <h3 className="font-heading font-bold text-text mb-3">Special Instructions</h3>
                <textarea
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  placeholder="e.g., Less oil, extra crispy, no cilantro..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cat-primary/50 resize-none h-20"
                />
              </div>
            </div>

            {/* Footer: Quantity + Add to Cart */}
            <div className="px-6 py-4 border-t border-border bg-background/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-background-alt rounded-xl border border-border p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-background text-text-muted hover:text-text transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-text">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-cat-primary-light text-text-muted hover:text-cat-primary transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleConfirm}
                  className="flex-1 ml-4 py-3 rounded-2xl font-bold text-white text-base transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                  style={{ background: 'var(--cat-gradient, var(--primary))' }}
                >
                  Add to Cart · ₹{calculateTotal().toFixed(0)}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
