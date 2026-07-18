import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [shopId, setShopId] = useState(null); // Ensure cart is only from one shop

  // Add item to cart
  const addToCart = (product, qty = 1, currentShopId) => {
    // If cart has items from a different shop, clear it or warn (simplified here: just clear)
    if (shopId && shopId !== currentShopId && cart.length > 0) {
      // In a real app, prompt the user. Here we'll just overwrite for simplicity.
      setCart([{ ...product, quantity: qty }]);
      setShopId(currentShopId);
      return;
    }

    setShopId(currentShopId);
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + qty } : item);
      }
      return [...prev, { ...product, quantity: qty }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    if (cart.length === 1) setShopId(null); // Clear shop if cart empty
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
  };

  const clearCart = () => {
    setCart([]);
    setShopId(null);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
  };

  return (
    <CartContext.Provider value={{ cart, shopId, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
