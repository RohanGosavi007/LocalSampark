'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, CreditCard, AlertCircle, MapPin, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../../../store/cartStore';
import { API_BASE, getAuthHeaders } from '@/lib/api';
import { getPaymentConfig, openCheckout, payFor } from '@/lib/payments';
import { fetchQuote, currentPosition, billLines, etaText } from '@/lib/deliveryQuote';

/**
 * Checkout for one shop's cart: POST /shops/:id/orders, then payment.
 *
 * The bill is the server's (POST /checkout/quote): items from the catalogue,
 * delivery charged by the distance to the customer, and the platform's fees.
 * This screen used to add a flat ₹40 delivery charge of its own and send the
 * total it had worked out; the server neither charged nor used it.
 *
 * Every method places the order first:
 *   COD       the order is placed; nothing is collected here. Offered only up
 *             to the cash limit the platform sets.
 *   WALLET    the server debits the wallet as it places the order, or refuses
 *             (insufficient balance) and places nothing.
 *   RAZORPAY  the order is placed unpaid and Razorpay Checkout opens for the
 *             payment the server opened for it. Closing the window leaves the
 *             order unpaid; the button then retries the payment, not the order.
 *
 * A service in the cart is booked with the order and paid for at the shop.
 */
export default function CheckoutModal({
  showCheckout,
  setShowCheckout,
  shopCartItems,
  shop,
  baseCheckoutAmount,
  service = null,
}) {
  const router = useRouter();
  const { removeItem } = useCartStore();
  const delivers = Number(shop.delivery_available) === 1 || shop.delivery_available === true;
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  // An order placed for online payment that has not been paid yet.
  const [pendingOrder, setPendingOrder] = useState(null);
  // One Idempotency-Key per attempt (C8): a retry after a network failure is
  // answered with the order already placed, not a second order.
  const attemptKey = useRef(null);
  const idempotencyKey = () => {
    if (!attemptKey.current) {
      attemptKey.current = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }
    return attemptKey.current;
  };

  const hasProducts = shopCartItems.length > 0;
  const productSubtotal = shopCartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);
  const serviceAmount = Math.max(0, Math.round((baseCheckoutAmount - productSubtotal) * 100) / 100);
  const pickup = deliveryType === 'pickup';
  const bill = pendingOrder ? pendingOrder.bill : quote ? quote.bill : null;
  const codAvailable = !quote || quote.paymentMethods.cod;
  const walletAvailable = !quote || !quote.paymentMethods || quote.paymentMethods.wallet !== false;

  useEffect(() => {
    if (!showCheckout) return;
    let cancelled = false;
    getPaymentConfig().then((config) => { if (!cancelled) setOnlineAvailable(config.enabled); });
    return () => { cancelled = true; };
  }, [showCheckout]);

  // The bill, whenever the cart, the way it is fulfilled or the location changes.
  const cartKey = shopCartItems.map((i) => `${i.id}:${i.quantity}`).join(',');
  const locationKey = location ? `${location.lat},${location.lng}` : '';
  useEffect(() => {
    if (!showCheckout || !hasProducts || pendingOrder) return undefined;
    if (!pickup && !location) {
      setQuote(null);
      setQuoteError(null);
      return undefined;
    }
    let cancelled = false;
    fetchQuote({
      shopId: shop.id,
      items: shopCartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
      deliveryMode: pickup ? 'pickup' : 'delivery',
      ...(pickup ? {} : { deliveryCoordinate: location }),
    })
      .then((data) => { if (!cancelled) { setQuote(data); setQuoteError(null); } })
      .catch((e) => { if (!cancelled) { setQuote(null); setQuoteError(e); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCheckout, shop.id, cartKey, deliveryType, locationKey, pendingOrder]);

  // Keep the selected method one that is on offer.
  useEffect(() => {
    if (pendingOrder) return;
    if (!hasProducts && paymentMethod !== 'COD') setPaymentMethod('COD');
    else if (paymentMethod === 'RAZORPAY' && !onlineAvailable) setPaymentMethod('COD');
    else if (paymentMethod === 'WALLET' && !walletAvailable) setPaymentMethod('COD');
    else if (paymentMethod === 'COD' && !codAvailable && hasProducts) setPaymentMethod(onlineAvailable ? 'RAZORPAY' : 'WALLET');
  }, [hasProducts, onlineAvailable, codAvailable, walletAvailable, paymentMethod, pendingOrder]);

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

  const finish = (orderId) => {
    attemptKey.current = null;
    shopCartItems.forEach((item) => removeItem(item.id));
    setPendingOrder(null);
    setShowCheckout(false);
    router.push(orderId ? `/order-tracking?id=${orderId}` : '/order-tracking');
  };

  const payOnline = async (order, payment) => {
    const display = { name: shop.name, description: 'LocalSampark order' };
    try {
      if (payment) await openCheckout(payment, display);
      else await payFor({ purpose: 'order', referenceId: order.id }, display);
      finish(order.id);
    } catch (e) {
      setError(
        e.code === 'DISMISSED'
          ? 'Payment was not completed. Your order is saved — press Pay to try again.'
          : `${e.message} Your order is saved — press Pay to try again.`
      );
    }
  };

  const handleCheckout = async () => {
    setError('');

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setShowCheckout(false);
      router.push('/login');
      return;
    }

    if (pendingOrder) {
      setProcessing(true);
      await payOnline(pendingOrder.order, null);
      setProcessing(false);
      return;
    }

    if (hasProducts && !pickup) {
      if (!location) { setError('Share your delivery location so the delivery charge can be worked out.'); return; }
      if (!deliveryAddress.trim()) { setError('Please enter your delivery address.'); return; }
    }
    if (hasProducts && !bill) {
      setError(quoteError ? quoteError.message : 'Your bill is still being worked out.');
      return;
    }
    if (service && (!service.staffId || !service.appointmentDate || !service.timeSlot)) {
      setError('Choose a staff member, date and time for the service before checking out.');
      return;
    }

    setProcessing(true);
    try {
      const items = shopCartItems.map((item) => ({ id: item.id, quantity: item.quantity }));
      if (service) items.push({ id: service.id, name: service.name, type: 'service' });

      const res = await fetch(`${API_BASE}/shops/${shop.id}/orders`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Idempotency-Key': idempotencyKey() },
        body: JSON.stringify({
          items,
          paymentMethod,
          deliveryType,
          deliveryAddress: pickup ? null : deliveryAddress.trim(),
          deliveryCoordinate: pickup ? undefined : location,
          appointmentDetails: service
            ? { staffId: service.staffId, appointmentDate: service.appointmentDate, timeSlot: service.timeSlot }
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (res.status !== 409) attemptKey.current = null;
        throw new Error(data.error || data.message || `Order failed (${res.status})`);
      }

      if (paymentMethod === 'RAZORPAY' && data.order) {
        setPendingOrder({ order: data.order, bill: data.bill });
        await payOnline(data.order, data.payment);
      } else {
        finish(data.order ? data.order.id : null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during checkout.');
    }
    setProcessing(false);
  };

  if (!showCheckout) return null;

  const optionClass = (selected, disabled) =>
    `flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${disabled ? 'opacity-50 cursor-not-allowed border-border' : `cursor-pointer ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}`;
  const locked = Boolean(pendingOrder);
  const eta = etaText(bill, { pickup });

  return (
    <AnimatePresence>
      {showCheckout && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-card-bg w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-border flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-background">
                <h2 className="text-2xl font-heading font-black">Checkout</h2>
                <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-background-alt rounded-full transition-colors" aria-label="Close checkout"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 overflow-y-auto">
                {hasProducts && delivers && (
                    <div className="mb-6">
                        <label className="block text-sm font-bold mb-3 text-text-muted uppercase tracking-wider">Delivery Method</label>
                        <div className="flex gap-3 mb-3">
                            <button disabled={locked} onClick={() => setDeliveryType('pickup')} className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${pickup ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text hover:border-border/80'}`}>
                                Pickup
                            </button>
                            <button disabled={locked} onClick={() => setDeliveryType('delivery')} className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${!pickup ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text hover:border-border/80'}`}>
                                Delivery
                            </button>
                        </div>
                        <AnimatePresence>
                            {!pickup && (
                                <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="overflow-hidden space-y-3">
                                    <button type="button" disabled={locked || locating} onClick={useMyLocation} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border font-bold text-sm hover:border-primary disabled:opacity-50">
                                        <MapPin className="w-4 h-4" />
                                        {locating ? 'Finding your location…' : location ? 'Location shared — update it' : 'Use my current location'}
                                    </button>
                                    <p className="text-xs text-text-muted">Delivery is charged by distance from the shop.</p>
                                    <textarea disabled={locked} className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] text-sm" placeholder="Flat, building, street, landmark" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-sm font-bold mb-3 text-text-muted uppercase tracking-wider">Payment Method</label>
                    <div className="space-y-3">
                        <label className={optionClass(paymentMethod === 'COD', locked || (hasProducts && !codAvailable))}>
                            <input type="radio" disabled={locked || (hasProducts && !codAvailable)} checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="w-4 h-4 text-primary focus:ring-primary accent-primary" />
                            <span className="font-bold text-sm">
                              {pickup ? 'Pay at Shop' : 'Cash on Delivery'}
                              {hasProducts && !codAvailable && quote && (
                                <span className="block font-medium text-text-muted">
                                  {quote.cod && quote.cod.maxOrderValue ? `Available up to ₹${quote.cod.maxOrderValue}` : 'Not available'}
                                </span>
                              )}
                            </span>
                        </label>
                        {/* The wallet only while the server offers it (Decision D10: off at launch). */}
                        {walletAvailable && (
                        <label className={optionClass(paymentMethod === 'WALLET', locked || !hasProducts)}>
                            <input type="radio" disabled={locked || !hasProducts} checked={paymentMethod === 'WALLET'} onChange={() => setPaymentMethod('WALLET')} className="w-4 h-4 text-primary focus:ring-primary accent-primary" />
                            <span className="font-bold text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-text-muted"/> LocalSampark Wallet</span>
                        </label>
                        )}
                        <label className={optionClass(paymentMethod === 'RAZORPAY', locked || !hasProducts || !onlineAvailable)}>
                            <input type="radio" disabled={locked || !hasProducts || !onlineAvailable} checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} className="w-4 h-4 text-primary focus:ring-primary accent-primary" />
                            <span className="font-bold text-sm flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-text-muted"/> Online — UPI, cards, netbanking
                              {!onlineAvailable && <span className="font-medium text-text-muted">(not available right now)</span>}
                            </span>
                        </label>
                    </div>
                </div>

                {hasProducts && bill && (
                    <div className="mb-4 space-y-2 text-sm">
                        {billLines(bill, { pickup }).map((line) => (
                            <div key={line.label} className="flex justify-between text-text-muted">
                                <span>{line.label}{line.note && <span className="block text-xs">{line.note}</span>}</span>
                                <span>{line.value}</span>
                            </div>
                        ))}
                        {eta && <p className="flex items-center gap-2 text-text-muted pt-1"><Clock className="w-4 h-4" /> {eta}</p>}
                    </div>
                )}

                {serviceAmount > 0 && (
                    <p className="text-sm text-text-muted mb-2">
                        Your service booking (₹{serviceAmount.toFixed(2)}) is paid at the shop.
                    </p>
                )}
            </div>

            <div className="p-6 bg-background border-t border-border">
                {(error || (quoteError && !pendingOrder)) && (
                    <p className="text-red-500 text-sm mb-4 flex items-start gap-2" role="alert">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error || quoteError.message}
                    </p>
                )}
                <div className="flex justify-between items-center mb-4">
                    <span className="text-text-muted font-bold">{paymentMethod === 'COD' ? 'Order Total' : 'Total Payable'}</span>
                    <span className="text-2xl font-black text-primary">
                      {!hasProducts ? '₹0.00' : bill ? `₹${Number(bill.total).toFixed(2)}` : '—'}
                    </span>
                </div>
                <Button className="w-full shadow-lg shadow-primary/20" size="lg" onClick={handleCheckout} disabled={processing || (hasProducts && !bill && !pendingOrder)}>
                    {processing
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      : pendingOrder ? 'Pay Now' : paymentMethod === 'COD' ? 'Place Order' : 'Confirm & Pay'}
                </Button>
            </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
