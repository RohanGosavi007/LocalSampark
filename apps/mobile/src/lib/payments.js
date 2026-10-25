/**
 * Online payment (Razorpay) for the mobile app.
 *
 * The server decides what is being paid for and how much; this file carries the
 * customer to Razorpay Checkout and brings the result back to be verified.
 *
 *   1. place the order — it is created unpaid, and the response includes the
 *      payment the server opened for it (or call startPayment)
 *   2. openCheckout(payment)            Razorpay's native checkout sheet
 *   3. POST /payments/razorpay/verify   with the three values it returns
 *
 * No key is stored in the app. The key id arrives with each payment, so a
 * build cannot ship with the wrong one, and when the server has no keys
 * configured it says so (enabled: false / 503 PAYMENTS_UNAVAILABLE) and the
 * screens offer cash on delivery and wallet instead.
 *
 * react-native-razorpay is a native module. It is present in a development or
 * release build and absent in Expo Go, where openCheckout reports
 * CHECKOUT_UNAVAILABLE instead of crashing.
 */

import { NativeModules } from 'react-native';
import { apiGet, apiPost } from './api';

/** An error with a `code`, so a screen can tell "closed" from "declined" from "unavailable". */
export class PaymentFlowError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PaymentFlowError';
    this.code = code || 'PAYMENT_ERROR';
  }
}

const fromApi = (error) =>
  new PaymentFlowError(error?.message || 'Payment request failed.', error?.data?.code || `HTTP_${error?.status || 0}`);

/** { enabled, keyId } — whether online payment can be offered at all. Never throws. */
export async function getPaymentConfig() {
  try {
    const data = await apiGet('/payments/razorpay/config');
    return { enabled: Boolean(data?.enabled) && Boolean(NativeModules.RNRazorpayCheckout), keyId: data?.keyId || null };
  } catch {
    return { enabled: false, keyId: null };
  }
}

/**
 * Asks the API to open a payment.
 * purpose: 'order' | 'shop_order' | 'universal_order' (with referenceId), or
 * 'wallet_topup' (with amount, in rupees).
 */
export async function startPayment({ purpose, referenceId, amount }) {
  try {
    return await apiPost('/payments/razorpay/order', { purpose, referenceId, amount });
  } catch (error) {
    throw fromApi(error);
  }
}

/**
 * Opens Razorpay Checkout for a payment the API has opened, and resolves once
 * the API has verified the result.
 *
 * Rejects with code 'DISMISSED' if the customer backs out, 'DECLINED' if
 * Razorpay reports a failure, and with the API's code if verification is
 * refused. In each case whatever was being paid for still exists, unpaid;
 * startPayment for it again reopens the same Razorpay order.
 */
export async function openCheckout(payment, { name, description, prefill } = {}) {
  if (!payment || !payment.razorpayOrderId || !payment.keyId) {
    throw new PaymentFlowError('Online payment could not be started.', 'PAYMENTS_UNAVAILABLE');
  }
  if (!NativeModules.RNRazorpayCheckout) {
    throw new PaymentFlowError('Online payment is not available in this build of the app.', 'CHECKOUT_UNAVAILABLE');
  }

  // Required here, not at the top of the file: the package reads its native
  // module as it loads, which must not happen where that module is absent.
  const RazorpayCheckout = require('react-native-razorpay').default;

  let result;
  try {
    result = await RazorpayCheckout.open({
      key: payment.keyId,
      order_id: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      name: name || 'LocalSampark',
      description: description || '',
      prefill: prefill || {},
      theme: { color: '#f97316' },
    });
  } catch (error) {
    // Android reports a cancelled checkout as code 0, iOS as code 2.
    const cancelled = error?.code === 0 || error?.code === 2 || /cancel/i.test(String(error?.description || ''));
    if (cancelled) throw new PaymentFlowError('Payment was not completed.', 'DISMISSED');
    throw new PaymentFlowError(error?.error?.description || error?.description || 'The payment was declined.', 'DECLINED');
  }

  try {
    return await apiPost('/payments/razorpay/verify', {
      razorpay_order_id: result.razorpay_order_id,
      razorpay_payment_id: result.razorpay_payment_id,
      razorpay_signature: result.razorpay_signature,
    });
  } catch (error) {
    throw fromApi(error);
  }
}

/** startPayment + openCheckout, for the common case. */
export async function payFor({ purpose, referenceId, amount }, display) {
  const payment = await startPayment({ purpose, referenceId, amount });
  return openCheckout(payment, display);
}

/** Adds money to the signed-in user's wallet. Resolves once the wallet has been credited. */
export function topUpWallet(amount, display) {
  return payFor({ purpose: 'wallet_topup', amount }, { description: 'Wallet top-up', ...display });
}
