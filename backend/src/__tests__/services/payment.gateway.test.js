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

    it('should handle Buffer payload (raw body from express)', () => {
      const secret = 'test-webhook-secret';
      const payloadStr = '{"event":"order.paid"}';
      const sig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

      // express.raw() hands the route a Buffer, not a string.
      const isValid = PaymentGatewayEngine.verifyWebhookSignature(
        'razorpay', Buffer.from(payloadStr), sig, secret
      );
      expect(isValid).toBe(true);
    });

    // ─── fail-closed behaviour ──────────────────────────────
    // These replace an earlier test that asserted
    // "should always return true for non-razorpay providers (fallback)".
    // That fallback was a payment bypass: POST /payments/webhook/cashfree marks
    // orders paid, and it accepted any payload with any signature. The test
    // encoded the bug as intended behaviour, so it is inverted here.

    it('rejects a provider with no implemented verifier', () => {
      expect(
        PaymentGatewayEngine.verifyWebhookSignature('paypal', '{}', 'any', 'secret')
      ).toBe(false);
    });

    it('rejects a cashfree delivery that carries no timestamp', () => {
      expect(
        PaymentGatewayEngine.verifyWebhookSignature('cashfree', '{}', 'anysig', 'secret')
      ).toBe(false);
    });

    it('verifies a correctly signed cashfree delivery (base64 over timestamp + body)', () => {
      const secret = 'test-webhook-secret';
      const timestamp = '1725456000';
      const payload = '{"type":"PAYMENT_SUCCESS_WEBHOOK"}';
      const sig = crypto.createHmac('sha256', secret)
        .update(`${timestamp}${payload}`)
        .digest('base64');

      expect(
        PaymentGatewayEngine.verifyWebhookSignature('cashfree', payload, sig, secret, { timestamp })
      ).toBe(true);
    });

    it('rejects a cashfree delivery whose body was tampered with after signing', () => {
      const secret = 'test-webhook-secret';
      const timestamp = '1725456000';
      const sig = crypto.createHmac('sha256', secret)
        .update(`${timestamp}{"amount":10}`)
        .digest('base64');

      expect(
        PaymentGatewayEngine.verifyWebhookSignature(
          'cashfree', '{"amount":10000}', sig, secret, { timestamp }
        )
      ).toBe(false);
    });

    it('rejects when no secret is configured, rather than defaulting to a literal', () => {
      // The old code HMACed with the string 'mocksecret' when the secret was
      // absent — a key published in the source, so anyone could forge a
      // signature. PAYMENT_WEBHOOK_SECRET was in fact unset in deployment.
      const forged = crypto.createHmac('sha256', 'mocksecret').update('{}').digest('hex');
      expect(
        PaymentGatewayEngine.verifyWebhookSignature('razorpay', '{}', forged, undefined)
      ).toBe(false);
    });

    it('rejects a missing signature header', () => {
      expect(
        PaymentGatewayEngine.verifyWebhookSignature('razorpay', '{}', undefined, 'secret')
      ).toBe(false);
    });
  });
});
