'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, CreditCard } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../../../store/cartStore';
import { API_URL } from '@/lib/api';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutModal({
  showCheckout,
  setShowCheckout,
  shopCartItems,
  shop,
  baseCheckoutAmount
}) {
  const router = useRouter();
  const { removeItem } = useCartStore();
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [processing, setProcessing] = useState(false);
  const [useCoins, setUseCoins] = useState(false);

  const deliveryFee = deliveryType === 'delivery' ? 40 : 0;
  const totalCheckoutAmount = baseCheckoutAmount + deliveryFee;

  const handleCheckout = async () => {
    setProcessing(true);
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      alert("Please login first.");
      router.push('/login');
      return;
    }

    try {
      if (paymentMethod === 'RAZORPAY') {
        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
          alert("Razorpay SDK failed to load. Are you online?");
          setProcessing(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/v1/checkout/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: totalCheckoutAmount })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY || 'rzp_test_YourKeyId', // Use env in prod
          amount: data.amount,
          currency: data.currency,
          name: shop.name,
          description: "LocalSampark Order Checkout",
          order_id: data.id,
          handler: async function (response) {
            const verifyRes = await fetch(`${API_URL}/api/v1/checkout/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              alert("Payment Successful & Order Placed!");
              shopCartItems.forEach(item => removeItem(item.id));
              setShowCheckout(false);
              router.push('/order-tracking');
            } else {
              alert("Payment Verification Failed!");
            }
          },
          theme: { color: "#f97316" }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
          alert("Payment Failed: " + response.error.description);
        });
        rzp.open();
        setProcessing(false);
      } else {
        // COD or WALLET logic
        setTimeout(() => {
            setProcessing(false);
            alert("Booking / Order Placed Successfully!");
            shopCartItems.forEach(item => removeItem(item.id));
            setShowCheckout(false);
            router.push('/order-tracking');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during checkout.");
      setProcessing(false);
    }
  };

  if (!showCheckout) return null;

  return (
    <AnimatePresence>
      {showCheckout && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-card-bg w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-border flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-background">
                <h2 className="text-2xl font-heading font-black">Checkout</h2>
                <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-background-alt rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
                {shopCartItems.length > 0 && shop.delivery_available === 1 && (
                    <div className="mb-6">
                        <label className="block text-sm font-bold mb-3 text-text-muted uppercase tracking-wider">Delivery Method</label>
                        <div className="flex gap-3 mb-3">
                            {shop.pickup_available === 1 && (
                                <button onClick={() => setDeliveryType('pickup')} className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${deliveryType === 'pickup' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text hover:border-border/80'}`}>
                                    Pickup
                                </button>
                            )}
                            <button onClick={() => setDeliveryType('delivery')} className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${deliveryType === 'delivery' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text hover:border-border/80'}`}>
                                Delivery (+₹40)
                            </button>
                        </div>
                        <AnimatePresence>
                            {deliveryType === 'delivery' && (
                                <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="overflow-hidden">
                                    <textarea className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] text-sm" placeholder="Enter Full Delivery Address" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-sm"><Wallet className="w-5 h-5"/></div>
                        <div>
                            <div className="font-bold text-amber-700">Sampark Coins</div>
                            <div className="text-xs text-amber-600 font-medium">Use loyalty balance</div>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={useCoins} onChange={(e) => setUseCoins(e.target.checked)} />
                        <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                </div>

                <div className="mb-8">
                    <label className="block text-sm font-bold mb-3 text-text-muted uppercase tracking-wider">Payment Method</label>
                    <div className="space-y-3">
                        <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                            <input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="w-4 h-4 text-primary focus:ring-primary accent-primary" />
                            <span className="font-bold text-sm">Pay at Shop / Cash on Delivery</span>
                        </label>
                        <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'WALLET' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                            <input type="radio" checked={paymentMethod === 'WALLET'} onChange={() => setPaymentMethod('WALLET')} className="w-4 h-4 text-primary focus:ring-primary accent-primary" />
                            <span className="font-bold text-sm">LocalSampark Wallet</span>
                        </label>
                        <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'RAZORPAY' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                            <input type="radio" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} className="w-4 h-4 text-primary focus:ring-primary accent-primary" />
                            <span className="font-bold text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-text-muted"/> Online via Razorpay</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div className="p-6 bg-background border-t border-border">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-text-muted font-bold">Total Payable</span>
                    <span className="text-2xl font-black text-primary">₹{totalCheckoutAmount.toFixed(2)}</span>
                </div>
                <Button className="w-full shadow-lg shadow-primary/20" size="lg" onClick={handleCheckout} disabled={processing}>
                    {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Confirm & Pay'}
                </Button>
            </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
