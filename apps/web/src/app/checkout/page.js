'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, CreditCard, MapPin, Truck, CheckCircle2, AlertCircle, Store, Wallet, Clock } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuth } from '../../context/AuthContext';
import { API_BASE, getAuthHeaders } from '../../lib/api';
import { openCheckout, payFor } from '../../lib/payments';
import { fetchQuote, currentPosition, billLines, etaText } from '../../lib/deliveryQuote';

/**
 * The cart checkout.
 *
 * What this page did before: it showed a total made of a "distance fee", a
 * "high demand surge" that was hard-coded on and a "small order fee" — none of
 * which the server charges — and its Pay button opened a "UPI simulator" which,
 * after a five-second animation, invented an order number, emptied the cart and
 * showed "Order Confirmed!". No request was sent. The shop never heard of it.
 *
 * What it does now:
  *   - the bill comes from POST /checkout/quote, the same pricing the order uses.
 *     Delivery is charged by distance, so it needs to know where the order is
 *     going: a saved address, or the customer's current location;
 *   - Pay places the order with POST /checkout;
 *   - cash on delivery and wallet are complete at that point (the wallet is
 *     debited by the server as part of placing the order);
 *   - online payment opens Razorpay Checkout for the payment the server opened
 *     and the order is confirmed as paid only once the server has verified it.
 *     If the customer closes the window the order exists, unpaid, and the same
 *     button retries the payment instead of ordering again.
 *
 * Online payment is offered only when the API reports it is configured.
 */
export default function CheckoutPage() {
  const [step, setStep] = useState(1); // 1: Cart, 2: Address/Fulfillment, 3: Payment, 4: Success
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState('DELIVERY'); // 'DELIVERY' | 'SELF_PICKUP'
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'RAZORPAY' | 'WALLET' | 'COD'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // The server's bill for this cart, and why there is none if there is none.
  const [quote, setQuote] = useState(null);
    const [quoteError, setQuoteError] = useState(null);
  // Where a delivery is going, as a point. A saved address may carry its own.
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  // An order that has been placed for online payment and not paid yet.
  const [pendingOrder, setPendingOrder] = useState(null);
  // The order shown on the confirmation step: { id, paid, method }.
  const [confirmed, setConfirmed] = useState(null);

  const { items: cartItems, getCartTotal, clearCart, currentShopName, currentShopId } = useCartStore();
  const total = getCartTotal();

  const [allowedFulfillments, setAllowedFulfillments] = useState(['DELIVERY', 'SELF_PICKUP']);
  const [shopPayments, setShopPayments] = useState(['RAZORPAY', 'WALLET', 'COD']);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const { token } = useAuth();

  const onlineAvailable = Boolean(quote && quote.paymentMethods && quote.paymentMethods.razorpay);
    const codAvailable = !quote || quote.paymentMethods.cod;
  const allowedPayments = ['RAZORPAY', 'WALLET', 'COD'].filter(
    (m) => (m === 'WALLET' || shopPayments.includes(m)) && (m !== 'RAZORPAY' || onlineAvailable) && (m !== 'COD' || codAvailable)
  );
  const delivering = fulfillmentMethod === 'DELIVERY';

  /** A saved address chosen: its text, and its location if it has one. */
  const chooseAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setAddress(addr.street_address + ', ' + addr.city);
    setPincode(addr.postal_code);
    const lat = Number(addr.latitude);
    const lng = Number(addr.longitude);
    setLocation(addr.latitude !== null && addr.latitude !== undefined && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null);
  };

  const useMyLocation = async () => {
    setError('');
    setLocating(true);
    try {
      setLocation(await currentPosition());
    } catch (e) {
      setError(e.message);
    }
    setLocating(false);
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/users/addresses`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setSavedAddresses(data.data);
                    const defaultAddr = data.data.find(a => a.is_default === 1 || a.is_default === true) || data.data[0];
          chooseAddress(defaultAddr);
        }
      })
      .catch(err => console.error('Failed to fetch addresses', err));
  }, [token]);

  useEffect(() => {
    if (!currentShopId) return;
    fetch(`${API_BASE}/shops/${currentShopId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.category_details) {
          const payments = (data.category_details.allowed_payment_methods || 'RAZORPAY,COD').split(',').map(s => s.trim());
          const fulfillments = (data.category_details.allowed_fulfillment_methods || 'DELIVERY,SELF_PICKUP').split(',').map(s => s.trim());
          setShopPayments(payments);
          setAllowedFulfillments(fulfillments);
          if (fulfillments.length > 0 && !fulfillments.includes(fulfillmentMethod)) {
            setFulfillmentMethod(fulfillments[0]);
          }
        }
      })
      .catch(err => console.error('Failed to fetch shop rules:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShopId]);

  // Ask the server what this cart costs whenever it, or how it is fulfilled, changes.
  const cartKey = cartItems.map(i => `${i.id}:${i.quantity}`).join(',');
  useEffect(() => {
    if (!currentShopId || cartItems.length === 0 || pendingOrder) {
      if (cartItems.length === 0) setQuote(null);
      return undefined;
    }
        let cancelled = false;
    fetchQuote({
      shopId: currentShopId,
      fulfillmentMethod,
      items: cartItems.map(item => ({ productId: item.id, quantity: item.quantity })),
      ...(fulfillmentMethod === 'DELIVERY'
        ? { addressId: selectedAddressId || undefined, deliveryCoordinate: location || undefined }
        : {}),
    })
      .then((data) => { if (!cancelled) { setQuote(data); setQuoteError(null); } })
      .catch((e) => { if (!cancelled) { setQuote(null); setQuoteError(e); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShopId, cartKey, fulfillmentMethod, pendingOrder, selectedAddressId, location ? `${location.lat},${location.lng}` : '']);

  // Until the delivery location is known, the cart is priced but the delivery is not.
  const needsLocation = Boolean(quoteError && quoteError.code === 'LOCATION_REQUIRED');

  // Keep the selected method one that is actually on offer.
  useEffect(() => {
    if (allowedPayments.length > 0 && !allowedPayments.includes(paymentMethod)) {
      setPaymentMethod(allowedPayments[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedPayments.join(','), paymentMethod]);

  const bill = pendingOrder ? pendingOrder.bill : quote ? quote.bill : null;
  const finalTotal = bill ? bill.total : null;
  const money = (value) => (value === null || value === undefined ? '—' : `₹${Number(value).toFixed(2)}`);

  const finish = (order, paid, method) => {
    setConfirmed({ id: order.id, paid, method });
    setPendingOrder(null);
    setStep(4);
    clearCart();
  };

  const payOnline = async (order, payment) => {
    const display = { name: currentShopName || 'LocalSampark', description: `Order ${String(order.id).slice(0, 8)}` };
    try {
      if (payment) await openCheckout(payment, display);
      else await payFor({ purpose: 'order', referenceId: order.id }, display);
      finish(order, true, 'RAZORPAY');
    } catch (e) {
      // The order stands, unpaid. Say so, and let the same button try again.
      setError(
        e.code === 'DISMISSED'
          ? 'Payment was not completed. Your order is saved — press Pay to try again.'
          : `${e.message} Your order is saved — press Pay to try again.`
      );
    }
  };

  const handlePlaceOrder = async () => {
    setError('');

    if (!token) {
      setError('Please sign in to place your order.');
      return;
    }

    // An order is already waiting for its payment: pay for that one.
    if (pendingOrder) {
      setLoading(true);
      await payOnline(pendingOrder.order, null);
      setLoading(false);
      return;
    }

        if (delivering && (!address || !pincode)) {
      setError('Please provide complete delivery details.');
      return;
    }
    if (delivering && !location && !selectedAddressId) {
      setError('Share your delivery location so the delivery charge can be worked out.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/checkout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          shopId: currentShopId,
          fulfillmentMethod,
          paymentMethod: paymentMethod.toLowerCase(),
                    deliveryAddress: delivering ? `${address}, ${pincode}` : null,
          addressId: delivering && selectedAddressId ? selectedAddressId : undefined,
          deliveryCoordinate: delivering && location ? location : undefined,
          items: cartItems.map(item => ({ productId: item.id, quantity: item.quantity })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Order failed (${res.status})`);
      }

      if (paymentMethod === 'RAZORPAY') {
        setPendingOrder({ order: data.order, bill: data.bill });
        if (data.paymentData) {
          await payOnline(data.order, data.paymentData);
        } else {
          setError(`${data.paymentError || 'Online payment could not be started.'} Your order is saved — press Pay to try again.`);
        }
      } else {
        // Cash on delivery, or a wallet order the server has already debited.
        finish(data.order, paymentMethod === 'WALLET', paymentMethod);
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
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
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary shadow-emerald-glow -z-10 rounded-full"
                animate={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />

              {[
                { s: 1, label: 'Cart', icon: ShoppingBag },
                { s: 2, label: 'Fulfillment', icon: MapPin },
                { s: 3, label: 'Payment', icon: CreditCard }
              ].map(indicator => (
                <div key={indicator.s} className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-colors border-4 border-background ${step >= indicator.s ? 'bg-primary text-white' : 'bg-background-alt text-text-muted'}`}>
                    <indicator.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-sm font-semibold ${step >= indicator.s ? 'text-primary' : 'text-text-muted'}`}>{indicator.label}</span>
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
                  <motion.div key="cart" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card-bg border border-border rounded-3xl p-6 md:p-8 shadow-glass-glow backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-text mb-2 border-b border-border pb-4">Review Your Cart</h2>
                    {currentShopName && <p className="text-primary font-bold mb-6">Ordering from: {currentShopName}</p>}

                    {cartItems.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBag className="w-16 h-16 text-text-muted/50 mx-auto mb-4" />
                        <h3 className="text-xl text-text-muted font-bold mb-4">Your cart is empty</h3>
                        <button className="px-6 py-2 bg-primary text-white rounded-xl font-bold" onClick={() => window.location.href = '/'}>Start Shopping</button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {cartItems.map((item, i) => (
                          <div key={i} className="flex justify-between items-center p-4 bg-background-alt/50 rounded-2xl border border-border/50">
                            <div>
                              <h4 className="text-text font-bold">{item.name}</h4>
                              <p className="text-primary font-bold mt-1">₹{item.price} x {item.quantity}</p>
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
                  <motion.div key="address" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card-bg border border-border rounded-3xl p-6 md:p-8 shadow-glass-glow backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">How would you like to receive your order?</h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {allowedFulfillments.includes('DELIVERY') && (
                        <button onClick={() => setFulfillmentMethod('DELIVERY')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${fulfillmentMethod === 'DELIVERY' ? 'bg-primary-glass border-primary text-primary' : 'bg-background-alt/50 border-border text-text-muted'}`}>
                          <Truck className="w-8 h-8" />
                          <span className="font-bold">Delivery</span>
                        </button>
                      )}
                      {allowedFulfillments.includes('SELF_PICKUP') && (
                        <button onClick={() => setFulfillmentMethod('SELF_PICKUP')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${fulfillmentMethod === 'SELF_PICKUP' ? 'bg-primary-glass border-primary text-primary' : 'bg-background-alt/50 border-border text-text-muted'}`}>
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
                                                                    onClick={() => chooseAddress(addr)}
                                  className={`shrink-0 text-left p-4 rounded-xl border transition-colors w-64 ${selectedAddressId === addr.id ? 'bg-primary-glass border-primary' : 'bg-card-bg border-border hover:border-primary/50'}`}
                                >
                                  <div className="font-bold text-text mb-1">{addr.address_type.toUpperCase()}</div>
                                  <div className="text-sm text-text-muted truncate">{addr.street_address}</div>
                                  <div className="text-sm text-text-muted truncate">{addr.city}, {addr.postal_code}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                                                <button
                          type="button"
                          onClick={useMyLocation}
                          disabled={locating}
                          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border text-text font-bold hover:border-primary transition disabled:opacity-50"
                        >
                          <MapPin className="w-5 h-5" />
                          {locating ? 'Finding your location…' : location ? 'Location shared — update it' : 'Use my current location'}
                        </button>
                        <p className="text-text-muted text-xs">Delivery is charged by distance from the shop.</p>

                        <div>
                          <label className="text-text-muted text-sm font-medium mb-1 block">{savedAddresses.length > 0 ? 'Or enter new address' : 'Full Delivery Address'}</label>
                          <textarea
                            value={address}
                                                        onChange={(e) => {
                              if (selectedAddressId) setLocation(null);
                              setAddress(e.target.value);
                              setSelectedAddressId(null);
                            }}
                            placeholder="Apt, Building, Street..."
                            className="w-full bg-background-alt text-text rounded-xl p-4 border border-border focus:border-primary outline-none resize-none h-32"
                          />
                        </div>
                        <div>
                          <label className="text-text-muted text-sm font-medium mb-1 block">Pincode</label>
                          <input
                            type="text"
                            value={pincode}
                            onChange={(e) => { setPincode(e.target.value); setSelectedAddressId(null); }}
                            placeholder="e.g. 411014"
                            className="w-full bg-background-alt text-text rounded-xl p-4 border border-border focus:border-primary outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {fulfillmentMethod === 'SELF_PICKUP' && (
                      <div className="bg-primary-glass border border-primary/20 rounded-xl p-4 flex gap-3 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-emerald-200">You can pick up your order directly from <strong>{currentShopName}</strong> once it is marked as ready. No delivery fee will be charged.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Payment */}
                {step === 3 && (
                  <motion.div key="payment" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card-bg border border-border rounded-3xl p-6 md:p-8 shadow-glass-glow backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Payment Method</h2>
                    <div className="space-y-4">

                      {quote && !onlineAvailable && (
                        <p className="text-text-muted text-sm flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          Online payment (UPI, cards, netbanking) is not available right now.
                        </p>
                      )}

                      {allowedPayments.includes('RAZORPAY') && (
                        <label className={`block p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === 'RAZORPAY' ? 'bg-primary/10 border-primary shadow-glow' : 'bg-background-alt/50 border-border hover:border-primary/50'}`}>
                          <input type="radio" name="payment" value="RAZORPAY" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} disabled={Boolean(pendingOrder)} className="w-5 h-5 accent-primary" />
                          <div>
                            <p className="text-text font-bold flex items-center gap-2">Razorpay <span className="px-2 py-0.5 bg-primary-glass text-primary rounded-full text-xs">Recommended in India</span></p>
                            <p className="text-text-muted text-sm">UPI, Cards, NetBanking</p>
                          </div>
                        </label>
                      )}

                      {allowedPayments.includes('WALLET') && (
                        <label className={`block p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === 'WALLET' ? 'bg-primary/10 border-primary shadow-glow' : 'bg-background-alt/50 border-border hover:border-primary/50'}`}>
                          <input type="radio" name="payment" value="WALLET" checked={paymentMethod === 'WALLET'} onChange={() => setPaymentMethod('WALLET')} disabled={Boolean(pendingOrder)} className="w-5 h-5 accent-primary" />
                          <div>
                            <p className="text-text font-bold flex items-center gap-2"><Wallet className="w-4 h-4" /> LocalSampark Wallet</p>
                            <p className="text-text-muted text-sm">Paid from your wallet balance when you place the order</p>
                          </div>
                        </label>
                      )}

                      {allowedPayments.includes('COD') && (
                        <label className={`block p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === 'COD' ? 'bg-primary/10 border-primary shadow-glow' : 'bg-background-alt/50 border-border hover:border-primary/50'}`}>
                          <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} disabled={Boolean(pendingOrder)} className="w-5 h-5 accent-primary" />
                          <div>
                            <p className="text-text font-bold">{fulfillmentMethod === 'SELF_PICKUP' ? 'Pay at Store (Cash/UPI)' : 'Cash on Delivery (COD)'}</p>
                            <p className="text-text-muted text-sm">Pay when you receive the order</p>
                          </div>
                        </label>
                      )}

                    </div>
                  </motion.div>
                )}
                
                {/* Step 4: Success */}
                {step === 4 && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card-bg border border-border rounded-3xl p-10 shadow-glass-glow backdrop-blur-xl text-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                      className="w-24 h-24 bg-primary-glass rounded-full flex items-center justify-center mx-auto mb-6 shadow-emerald-glow"
                    >
                      <CheckCircle2 className="w-12 h-12 text-primary" />
                    </motion.div>
                    <h2 className="text-3xl font-black text-text mb-2">Order Confirmed!</h2>
                    <p className="text-text-muted text-lg mb-8">Thank you for supporting a local business.</p>

                    <div className="bg-background-alt rounded-2xl p-6 inline-block text-left mb-8 border border-border min-w-[300px]">
                      <p className="text-text-muted text-sm mb-1">Order Tracking ID</p>
                      <p className="text-text font-bold text-xl mb-4 break-all">{confirmed?.id}</p>
                      <p className="text-text-muted text-sm mb-1">Payment</p>
                      <p className="text-text font-bold mb-4">
                        {confirmed?.paid
                          ? (confirmed.method === 'WALLET' ? 'Paid from wallet' : 'Paid online')
                          : (fulfillmentMethod === 'SELF_PICKUP' ? 'Pay at the store' : 'Pay on delivery')}
                      </p>
                      <p className="text-text-muted text-sm mb-1">Status</p>
                      <p className="text-primary font-bold flex items-center gap-2">
                        {fulfillmentMethod === 'SELF_PICKUP' ? <Store className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                        Waiting for shop confirmation
                      </p>
                    </div>

                    <div className="flex gap-4 justify-center">
                      <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-background-alt text-text font-bold rounded-xl hover:bg-card-bg transition">
                        Back to Home
                      </button>
                      <button onClick={() => window.location.href = `/order-tracking?id=${confirmed?.id}`} className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary transition shadow-emerald-glow">
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
                <div className="bg-card-bg border border-border rounded-3xl p-6 shadow-glass-glow backdrop-blur-xl sticky top-28">
                  <h3 className="text-xl font-bold text-text mb-6">Order Summary</h3>

                  <div className="space-y-4 mb-6 text-sm">
                                        {bill ? billLines(bill, { pickup: !delivering }).map((line) => (
                      <div key={line.label} className="flex justify-between text-text-muted">
                        <span>{line.label}{line.note && <span className="block text-xs">{line.note}</span>}</span>
                        <span>{line.value}</span>
                      </div>
                    )) : (
                      <div className="flex justify-between text-text-muted">
                        <span>Item Total ({cartItems.length} items)</span>
                        <span>{money(total)}</span>
                      </div>
                    )}
                    {needsLocation && !pendingOrder && (
                      <p className="text-text-muted text-xs">The delivery charge appears once you share where the order is going.</p>
                    )}
                    {etaText(bill, { pickup: !delivering }) && (
                      <p className="flex items-center gap-2 text-text-muted"><Clock className="w-4 h-4" /> {etaText(bill, { pickup: !delivering })}</p>
                    )}

                    <div className="border-t border-border pt-4 flex justify-between items-end">
                      <span className="text-text-muted">Total to Pay</span>
                      <span className="text-3xl font-black text-white">{money(finalTotal)}</span>
                    </div>
                  </div>

                                    {quoteError && !needsLocation && !pendingOrder && (
                    <p className="text-red-400 text-sm mb-4 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {quoteError.message}
                    </p>
                  )}
                  {error && (
                    <p className="text-red-400 text-sm mb-4 flex items-start gap-2" role="alert">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                    </p>
                  )}

                  {step === 1 && (
                                        <button onClick={() => setStep(2)} disabled={cartItems.length === 0 || (!quote && !needsLocation)} className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary transition shadow-emerald-glow disabled:opacity-50">
                      Proceed to Fulfillment
                    </button>
                  )}
                  {step === 2 && (
                                        <button onClick={() => setStep(3)} disabled={!quote || (delivering && (!address || !pincode))} className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary transition shadow-emerald-glow disabled:opacity-50">
                      Proceed to Payment
                    </button>
                  )}
                  {step === 3 && (
                    <button onClick={handlePlaceOrder} disabled={loading || !bill || allowedPayments.length === 0} className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition shadow-emerald-glow flex justify-center items-center gap-2 disabled:opacity-50">
                      {loading
                        ? <span className="animate-pulse">Processing...</span>
                        : pendingOrder
                          ? <>Pay {money(finalTotal)}</>
                          : paymentMethod === 'COD' ? <>Place Order · {money(finalTotal)}</> : <>Pay {money(finalTotal)}</>}
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
