'use client';

/**
 * Online payment (Razorpay) for the web app.
 *
 * The server decides what is being paid for and how much; this file only
 * carries the customer to Razorpay Checkout and brings the result back.
 *
 *   1. place the order the usual way — it is created unpaid
 *   2. startPayment({ purpose, referenceId })     POST /payments/razorpay/order
 *   3. Razorpay Checkout opens with the key id, order id and amount returned
 *   4. the three values Checkout hands back go to  POST /payments/razorpay/verify
 *
 * Nothing here holds a key. The key id comes from the API with each payment,
 * so the site needs no NEXT_PUBLIC_RAZORPAY_* variable and cannot be built
 * with the wrong one. When the API has no keys configured it says so
 * (enabled: false / 503 PAYMENTS_UNAVAILABLE) and the UI offers the other
 * payment methods instead.
 */

import { API_BASE, getAuthHeaders } from './api';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** An error with the API's `code`, so callers can tell "unavailable" from "declined". */
export class PaymentFlowError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PaymentFlowError';
    this.code = code || 'PAYMENT_ERROR';
  }
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
  } catch {
    throw new PaymentFlowError('Could not reach the server. Check your connection and try again.', 'NETWORK');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new PaymentFlowError(data.error || data.message || `Request failed (${res.status})`, data.code || `HTTP_${res.status}`);
  }
  return data;
}

/** { enabled, keyId } — whether online payment can be offered at all. Never throws. */
export async function getPaymentConfig() {
  try {
    const res = await fetch(`${API_BASE}/payments/razorpay/config`);
    const data = await res.json();
    return { enabled: Boolean(data && data.enabled), keyId: (data && data.keyId) || null };
  } catch {
    return { enabled: false, keyId: null };
  }
}

/** Loads Razorpay's Checkout script once. Resolves false if it cannot be loaded. */
export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => resolve(Boolean(window.Razorpay)));
    script.addEventListener('error', () => resolve(false));
    if (!existing) {
      script.src = CHECKOUT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

/**
 * Asks the API to open a payment.
 * purpose: 'shop_order' | 'order' | 'universal_order' (with referenceId), or
 * 'wallet_topup' (with amount, in rupees).
 */
export function startPayment({ purpose, referenceId, amount }) {
  return post('/payments/razorpay/order', { purpose, referenceId, amount });
}

/**
 * Opens Razorpay Checkout for a payment the API has opened, and resolves once
 * the API has verified the result.
 *
 * Rejects with code 'DISMISSED' if the customer closes the window, 'DECLINED'
 * if Razorpay reports a failure, and with the API's code if verification is
 * refused. In every one of those cases the order still exists, unpaid, and
 * calling startPayment again for it reopens the same Razorpay order.
 */
export async function openCheckout(payment, { name, description, prefill } = {}) {
  if (!payment || !payment.razorpayOrderId || !payment.keyId) {
    throw new PaymentFlowError('Online payment could not be started.', 'PAYMENTS_UNAVAILABLE');
  }
  const loaded = await loadRazorpayCheckout();
  if (!loaded) {
    throw new PaymentFlowError('The payment window could not be loaded. Check your connection and try again.', 'CHECKOUT_UNAVAILABLE');
  }

  return new Promise((resolve, reject) => {
    let finished = false;
    const done = (fn, value) => { if (!finished) { finished = true; fn(value); } };

    const rzp = new window.Razorpay({
      key: payment.keyId,
      order_id: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      name: name || 'LocalSampark',
      description: description || '',
      prefill: prefill || {},
      theme: { color: '#f97316' },
      handler: (response) => {
        post('/payments/razorpay/verify', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }).then((result) => done(resolve, result), (err) => done(reject, err));
      },
      modal: {
        ondismiss: () => done(reject, new PaymentFlowError('Payment was not completed.', 'DISMISSED')),
      },
    });
    rzp.on('payment.failed', (response) => {
      const reason = response && response.error && response.error.description;
      done(reject, new PaymentFlowError(reason || 'The payment was declined.', 'DECLINED'));
    });
    rzp.open();
  });
}

/** startPayment + openCheckout, for the common case. */
export async function payFor({ purpose, referenceId, amount }, display) {
  const payment = await startPayment({ purpose, referenceId, amount });
  return openCheckout(payment, display);
}
