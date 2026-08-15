'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, CreditCard, MapPin, Truck, CheckCircle2, Navigation, AlertCircle, Store } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuth } from '../../context/AuthContext';
import { apiPost } from '../../lib/api';
import UpiGateway from '../../components/UpiGateway';
import Link from 'next/link';

export default function CheckoutPage() {
  const [step, setStep] = useState(1); // 1: Cart, 2: Address/Fulfillment, 3: Payment, 4: Success
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState('DELIVERY'); // 'DELIVERY' | 'SELF_PICKUP'
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY'); // 'RAZORPAY' | 'STRIPE' | 'CASHFREE' | 'COD'
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [showUpi, setShowUpi] = useState(false);

  // Use the cart store
  const { items: cartItems, getCartTotal, clearCart, currentShopName, currentShopId, sessionId } = useCartStore();
  const total = getCartTotal();
  
  // Dynamic Pricing Logic
  const hasPlusPass = false; // Mock state
  const isSurge = true; // High demand mock
  
  const smallOrderFee = total < 100 ? 15 : 0;
  const distanceFee = 20;
  const surgeFee = isSurge ? 20 : 0;
  
  const calculatedDeliveryFee = hasPlusPass ? 0 : (distanceFee + surgeFee);
  const platformFee = 10;
  
  const finalTotal = total + (fulfillmentMethod === 'SELF_PICKUP' ? 0 : calculatedDeliveryFee) + platformFee + smallOrderFee;

  const [allowedPayments, setAllowedPayments] = useState(['RAZORPAY', 'STRIPE', 'CASHFREE', 'COD']);
  const [allowedFulfillments, setAllowedFulfillments] = useState(['DELIVERY', 'SELF_PICKUP']);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      fetch(`${BACKEND_URL}/api/v1/users/addresses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.length > 0) {
          setSavedAddresses(data.data);
          const defaultAddr = data.data.find(a => a.is_default === 1) || data.data[0];
          setSelectedAddressId(defaultAddr.id);
          setAddress(defaultAddr.street_address + ', ' + defaultAddr.city);
          setPincode(defaultAddr.postal_code);
        }
      })
      .catch(err => console.error('Failed to fetch addresses', err));
    }
  }, [token]);

  useEffect(() => {
    if (!currentShopId) return;
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    fetch(`${BACKEND_URL}/api/v1/shops/${currentShopId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.category_details) {
          const payments = (data.category_details.allowed_payment_methods || 'RAZORPAY,STRIPE,CASHFREE,COD').split(',');
          const fulfillments = (data.category_details.allowed_fulfillment_methods || 'DELIVERY,SELF_PICKUP').split(',');
          setAllowedPayments(payments);
          setAllowedFulfillments(fulfillments);
          
          if (payments.length > 0 && !payments.includes(paymentMethod)) {
            setPaymentMethod(payments[0]);
          }
          if (fulfillments.length > 0 && !fulfillments.includes(fulfillmentMethod)) {
            setFulfillmentMethod(fulfillments[0]);
          }
        }
      })
      .catch(err => console.error('Failed to fetch shop rules:', err));
  }, [currentShopId]);

  // Load Razorpay Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePlaceOrder = async () => {
    if (fulfillmentMethod === 'DELIVERY' && (!address || !pincode)) {
      alert('Please provide complete delivery details');
      return;
    }

    setLoading(true);
    
    try {
      // Create Order on Backend via new Universal Orders API
      const orderType = cartItems.some(i => i.item_type && i.item_type !== 'physical_good') ? 'booking' : 'retail';
      
      const payload = {
        shopId: currentShopId,
        orderType,
        totalAmount: total + (fulfillmentMethod === 'DELIVERY' ? 60 : 10),
        deliveryAddress: fulfillmentMethod === 'DELIVERY' ? `${address}, ${pincode}` : 'Self Pickup',
        items: cartItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        notes: `Payment: ${paymentMethod}`
      };

      const data = await apiPost('/universal-orders', payload);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to place order');
      }

      const generatedOrderId = data.orderId;

      if (paymentMethod === 'RAZORPAY') {
        // Initialize Razorpay (Mocking key for universal orders)
        const options = {
          key: 'rzp_test_mock',
          amount: Math.round((total + (fulfillmentMethod === 'DELIVERY' ? 60 : 10)) * 100), // in paise
          currency: 'INR',
          name: 'LocalSampark',
          description: `Order from ${currentShopName}`,
          order_id: data.orderId, 
          handler: async function (response) {
            setOrderId(data.orderId);
            setStep(4);
            clearCart();
          },
          theme: { color: '#4f46e5' }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          alert(`Payment Failed: ${response.error.description}`);
        });
        rzp.open();
      } else if (paymentMethod === 'STRIPE' || paymentMethod === 'CASHFREE') {
        // For now, redirect or simulate success for Stripe/Cashfree
        alert(`${paymentMethod} initialized! (Simulating success)`);
        setOrderId(generatedOrderId);
        setStep(4);
        clearCart();
      } else {
        // COD
        setOrderId(generatedOrderId);
        setStep(4);
        clearCart();
      }
    } catch (e) {
      console.error(e);
      alert('Order failed: ' + e.message);
    }
    
    setLoading(false);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4">

          {/* Progress Bar */}
          {step < 4 && (
            <div className="flex justify-between items-center mb-12 relative max-w-2xl mx-auto">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-background-alt -z-10 rounded-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 -z-10 rounded-full transition-all" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} />

              {[
                { s: 1, label: 'Cart', icon: ShoppingBag },
                { s: 2, label: 'Fulfillment', icon: MapPin },
                { s: 3, label: 'Payment', icon: CreditCard }
              ].map(indicator => (
                <div key={indicator.s} className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-colors border-4 border-background ${step >= indicator.s ? 'bg-blue-600 text-white' : 'bg-background-alt text-text-muted'}`}>
                    <indicator.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-sm font-semibold ${step >= indicator.s ? 'text-blue-400' : 'text-text-muted'}`}>{indicator.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className={`lg:col-span-2 ${step === 4 ? 'lg:col-span-3 max-w-2xl mx-auto w-full' : ''}`}>
              <AnimatePresence mode="wait">
                
                {/* Step 1: Cart */}
                {step === 1 && (
                  <motion.div key="cart" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card-bg border border-border rounded-3xl p-6 md:p-8 shadow-xl">
                    <h2 className="text-2xl font-bold text-text mb-2 border-b border-border pb-4">Review Your Cart</h2>
                    {currentShopName && <p className="text-blue-400 font-bold mb-6">Ordering from: {currentShopName}</p>}

                    {cartItems.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBag className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl text-text-muted font-bold mb-4">Your cart is empty</h3>
                        <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold" onClick={() => window.location.href = '/'}>Start Shopping</button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {cartItems.map((item, i) => (
                          <div key={i} className="flex justify-between items-center p-4 bg-background-alt/50 rounded-2xl border border-border/50">
                            <div>
                              <h4 className="text-text font-bold">{item.name}</h4>
                              <p className="text-blue-400 font-bold mt-1">₹{item.price} x {item.quantity}</p>
                            </div>
                            <div className="text-xl font-black text-text">₹{item.price * item.quantity}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Address / Fulfillment */}
                {step === 2 && (
                  <motion.div key="address" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card-bg border border-border rounded-3xl p-6 md:p-8 shadow-xl">
                    <h2 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">How would you like to receive your order?</h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {allowedFulfillments.includes('DELIVERY') && (
                        <button onClick={() => setFulfillmentMethod('DELIVERY')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${fulfillmentMethod === 'DELIVERY' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-background-alt/50 border-border text-text-muted'}`}>
                          <Truck className="w-8 h-8" />
                          <span className="font-bold">Delivery</span>
                        </button>
                      )}
                      {allowedFulfillments.includes('SELF_PICKUP') && (
                        <button onClick={() => setFulfillmentMethod('SELF_PICKUP')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${fulfillmentMethod === 'SELF_PICKUP' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-background-alt/50 border-border text-text-muted'}`}>
                          <Store className="w-8 h-8" />
                          <span className="font-bold">Self Pickup</span>
                        </button>
                      )}
                    </div>

                    {fulfillmentMethod === 'DELIVERY' && (
                      <div className="space-y-4">
                        {savedAddresses.length > 0 && (
                          <div className="mb-4">
                            <label className="text-text-muted text-sm font-medium mb-2 block">Saved Addresses</label>
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                              {savedAddresses.map(addr => (
                                <button
                                  key={addr.id}
                                  onClick={() => {
                                    setSelectedAddressId(addr.id);
                                    setAddress(addr.street_address + ', ' + addr.city);
                                    setPincode(addr.postal_code);
                                  }}
                                  className={`shrink-0 text-left p-4 rounded-xl border transition-colors w-64 ${selectedAddressId === addr.id ? 'bg-blue-600/20 border-blue-500' : 'bg-card-bg border-border hover:border-slate-600'}`}
                                >
                                  <div className="font-bold text-text mb-1">{addr.address_type.toUpperCase()}</div>
                                  <div className="text-sm text-text-muted truncate">{addr.street_address}</div>
                                  <div className="text-sm text-text-muted truncate">{addr.city}, {addr.postal_code}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-text-muted text-sm font-medium mb-1 block">{savedAddresses.length > 0 ? 'Or enter new address' : 'Full Delivery Address'}</label>
                          <textarea
                            value={address}
                            onChange={(e) => { setAddress(e.target.value); setSelectedAddressId(null); }}
                            placeholder="Apt, Building, Street..."
                            className="w-full bg-background-alt text-text rounded-xl p-4 border border-border focus:border-blue-500 outline-none resize-none h-32"
                          />
                        </div>
                        <div>
                          <label className="text-text-muted text-sm font-medium mb-1 block">Pincode</label>
                          <input
                            type="text"
                            value={pincode}
                            onChange={(e) => { setPincode(e.target.value); setSelectedAddressId(null); }}
                            placeholder="e.g. 411014"
                            className="w-full bg-background-alt text-text rounded-xl p-4 border border-border focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {fulfillmentMethod === 'SELF_PICKUP' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-emerald-200">You can pick up your order directly from <strong>{currentShopName}</strong> once it is marked as ready. No delivery fee will be charged.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Payment */}
                {step === 3 && (
                  <motion.div key="payment" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card-bg border border-border rounded-3xl p-6 md:p-8 shadow-xl">
                    <h2 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Payment Method</h2>
                    <div className="space-y-4">

                      {allowedPayments.includes('RAZORPAY') && (
                        <label className={`block p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === 'RAZORPAY' ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-background-alt/50 border-border hover:border-slate-500'}`}>
                          <input type="radio" name="payment" value="RAZORPAY" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} className="w-5 h-5 accent-blue-500" />
                          <div>
                            <p className="text-text font-bold flex items-center gap-2">Razorpay <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">Recommended in India</span></p>
                            <p className="text-text-muted text-sm">UPI, Cards, NetBanking</p>
                          </div>
                        </label>
                      )}

                      {allowedPayments.includes('STRIPE') && (
                        <label className={`block p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === 'STRIPE' ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-background-alt/50 border-border hover:border-slate-500'}`}>
                          <input type="radio" name="payment" value="STRIPE" checked={paymentMethod === 'STRIPE'} onChange={() => setPaymentMethod('STRIPE')} className="w-5 h-5 accent-blue-500" />
                          <div>
                            <p className="text-text font-bold">Stripe</p>
                            <p className="text-text-muted text-sm">International Credit/Debit Cards</p>
                          </div>
                        </label>
                      )}

                      {allowedPayments.includes('CASHFREE') && (
                        <label className={`block p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === 'CASHFREE' ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-background-alt/50 border-border hover:border-slate-500'}`}>
                          <input type="radio" name="payment" value="CASHFREE" checked={paymentMethod === 'CASHFREE'} onChange={() => setPaymentMethod('CASHFREE')} className="w-5 h-5 accent-blue-500" />
                          <div>
                            <p className="text-text font-bold">Cashfree</p>
                            <p className="text-text-muted text-sm">Alternative India Payment Gateway</p>
                          </div>
                        </label>
                      )}

                      {allowedPayments.includes('COD') && (
                        <label className={`block p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === 'COD' ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-background-alt/50 border-border hover:border-slate-500'}`}>
                          <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="w-5 h-5 accent-blue-500" />
                          <div>
                            <p className="text-text font-bold">{fulfillmentMethod === 'SELF_PICKUP' ? 'Pay at Store (Cash/UPI)' : 'Cash on Delivery (COD)'}</p>
                            <p className="text-text-muted text-sm">Pay when you receive the order</p>
                          </div>
                        </label>
                      )}

                    </div>
                  </motion.div>
                )}
                
                {/* UPI Simulator Modal */}
                {showUpi && (
                  <UpiGateway 
                    amount={finalTotal} 
                    onClose={() => setShowUpi(false)} 
                    onSuccess={() => {
                      setShowUpi(false);
                      setOrderId('ORD-' + Math.floor(Math.random() * 1000000));
                      setStep(4);
                      clearCart();
                    }} 
                  />
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card-bg border border-border rounded-3xl p-10 shadow-xl text-center">
                    <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-black text-text mb-2">Order Confirmed!</h2>
                    <p className="text-text-muted text-lg mb-8">Thank you for supporting a local business.</p>

                    <div className="bg-background-alt rounded-2xl p-6 inline-block text-left mb-8 border border-border min-w-[300px]">
                      <p className="text-text-muted text-sm mb-1">Order Tracking ID</p>
                      <p className="text-text font-bold text-xl mb-4">{orderId}</p>
                      <p className="text-text-muted text-sm mb-1">Status</p>
                      <p className="text-blue-400 font-bold flex items-center gap-2">
                        {fulfillmentMethod === 'SELF_PICKUP' ? <Store className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                        Waiting for shop confirmation
                      </p>
                    </div>

                    <div className="flex gap-4 justify-center">
                      <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-background-alt text-text font-bold rounded-xl hover:bg-card-bg transition">
                        Back to Home
                      </button>
                      <button onClick={() => window.location.href = `/order-tracking?id=${orderId}`} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-500/20">
                        Track Order
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Order Summary Sidebar */}
            {step < 4 && (
              <div className="lg:col-span-1">
                <div className="bg-card-bg border border-border rounded-3xl p-6 shadow-xl sticky top-28">
                  <h3 className="text-xl font-bold text-text mb-6">Order Summary</h3>

                  <div className="space-y-4 mb-6 text-sm">
                    <div className="flex justify-between text-text-muted">
                      <span>Item Total ({cartItems.length} items)</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>

                    {smallOrderFee > 0 && (
                      <div className="flex justify-between text-orange-400">
                        <span>Small Order Fee</span>
                        <span>+₹{smallOrderFee.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-text-muted">
                      <span>Platform Fee</span>
                      <span>₹{platformFee.toFixed(2)}</span>
                    </div>

                    {fulfillmentMethod === 'DELIVERY' && (
                      <>
                        <div className="flex justify-between text-text-muted">
                          <span>Delivery Fee</span>
                          {hasPlusPass ? (
                            <span className="text-emerald-400 font-bold">FREE</span>
                          ) : (
                            <span>₹{distanceFee.toFixed(2)}</span>
                          )}
                        </div>
                        {isSurge && !hasPlusPass && (
                          <div className="flex justify-between text-purple-400 font-bold">
                            <span>High Demand Surge</span>
                            <span>+₹{surgeFee.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                    {fulfillmentMethod === 'SELF_PICKUP' && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Delivery Fee</span>
                        <span>FREE (Pickup)</span>
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-4 flex justify-between items-end">
                      <span className="text-slate-400">Total to Pay</span>
                      <span className="text-3xl font-black text-white">₹{finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {!hasPlusPass && fulfillmentMethod === 'DELIVERY' && (
                    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4 mb-6">
                      <h4 className="font-bold text-orange-500 text-sm mb-1">Save ₹{distanceFee + surgeFee} on this order!</h4>
                      <p className="text-slate-400 text-xs mb-3">Get unlimited free deliveries with LocalSampark Plus.</p>
                      <Link href="/resident/plus" className="text-xs font-bold text-white bg-orange-500 px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors inline-block">
                        Join Plus
                      </Link>
                    </div>
                  )}

                  {step === 1 && (
                    <button onClick={() => setStep(2)} disabled={cartItems.length === 0} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 disabled:opacity-50">
                      Proceed to Fulfillment
                    </button>
                  )}
                  {step === 2 && (
                    <button onClick={() => setStep(3)} disabled={fulfillmentMethod === 'DELIVERY' && (!address || !pincode)} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 disabled:opacity-50">
                      Proceed to Payment
                    </button>
                  )}
                  {step === 3 && (
                    <button onClick={() => setShowUpi(true)} disabled={loading} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2">
                      {loading ? <span className="animate-pulse">Processing...</span> : <>Pay ₹{finalTotal.toFixed(2)}</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
