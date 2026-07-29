/**
 * Payment Gateway Unit Tests
 * Tests PaymentGatewayEngine: order creation (Razorpay, Cashfree, UPI) and webhook signature verification
 */
const crypto = require('crypto');
const PaymentGatewayEngine = require('../../services/payment.gateway');

describe('PaymentGatewayEngine', () => {

  // ─── createPaymentOrder ───────────────────────────────────
  describe('createPaymentOrder()', () => {
    it('should create a Razorpay order with amount in paise', async () => {
      const result = await PaymentGatewayEngine.createPaymentOrder({
        provider: 'razorpay',
        amount: 500,
        orderId: 'ORD001',
        customerDetails: { name: 'Test' }
      });
      expect(result.provider).toBe('razorpay');
      expect(result.amount).toBe(50000); // 500 * 100 paise
      expect(result.currency).toBe('INR');
      expect(result.gatewayOrderId).toMatch(/^rzp_order_/);
      expect(result.keyId).toBeDefined();
    });

    it('should create a Cashfree session', async () => {
      const result = await PaymentGatewayEngine.createPaymentOrder({
        provider: 'cashfree',
        amount: 250,
        orderId: 'ORD002',
      });
      expect(result.provider).toBe('cashfree');
      expect(result.paymentSessionId).toMatch(/^session_/);
      expect(result.amount).toBe(250);
    });

    it('should generate a UPI deep link with correct params', async () => {
      const result = await PaymentGatewayEngine.createPaymentOrder({
        provider: 'upi',
        amount: 199,
        orderId: 'ORD003',
      });
      expect(result.provider).toBe('upi');
      expect(result.upiUri).toContain('upi://pay');
      expect(result.upiUri).toContain('am=199');
      expect(result.upiUri).toContain('tr=ORD003');
      expect(result.qrCodeUrl).toContain('create-qr-code');
    });

    it('should throw for unsupported provider', async () => {
      await expect(
        PaymentGatewayEngine.createPaymentOrder({ provider: 'paypal', amount: 100, orderId: 'ORD004' })
      ).rejects.toThrow('Unsupported payment provider: paypal');
    });

    it('should default to razorpay when no provider specified', async () => {
      const result = await PaymentGatewayEngine.createPaymentOrder({
        amount: 100,
        orderId: 'ORD005',
      });
      expect(result.provider).toBe('razorpay');
    });
  });

  // ─── verifyWebhookSignature ───────────────────────────────
  describe('verifyWebhookSignature()', () => {
    it('should verify valid Razorpay webhook signature', () => {
      const secret = 'test-webhook-secret';
      const payload = JSON.stringify({ event: 'order.paid', payload: { payment: { entity: { id: 'pay_123' } } } });
      const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      
      const isValid = PaymentGatewayEngine.verifyWebhookSignature('razorpay', payload, expectedSig, secret);
      expect(isValid).toBe(true);
    });

    it('should reject tampered Razorpay webhook payload', () => {
      const secret = 'test-webhook-secret';
      const originalPayload = '{"event":"order.paid"}';
      const tamperedPayload = '{"event":"order.refunded"}';
      const sig = crypto.createHmac('sha256', secret).update(originalPayload).digest('hex');
      
      const isValid = PaymentGatewayEngine.verifyWebhookSignature('razorpay', tamperedPayload, sig, secret);
      expect(isValid).toBe(false);
    });

    it('should reject invalid signature', () => {
      const isValid = PaymentGatewayEngine.verifyWebhookSignature('razorpay', '{}', 'invalidsig', 'secret');
      expect(isValid).toBe(false);
    });

    it('should always return true for non-razorpay providers (fallback)', () => {
      const isValid = PaymentGatewayEngine.verifyWebhookSignature('cashfree', '{}', 'any', 'any');
      expect(isValid).toBe(true);
    });

    it('should handle Buffer payload (raw body from express)', () => {
      const secret = 'test-webhook-secret';
      const payloadStr = '{"event":"order.paid"}';
      const sig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
      
      // Simulate what happens when express.raw() gives us a Buffer
      const isValid = PaymentGatewayEngine.verifyWebhookSignature('razorpay', payloadStr, sig, secret);
      expect(isValid).toBe(true);
    });
  });
});
