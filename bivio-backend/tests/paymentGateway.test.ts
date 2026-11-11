import { describe, it, expect } from 'vitest';
import { paymentGateway } from '../src/shared/paymentGateway';

// PAYMENT_WEBHOOK_SECRET is set to 'test-webhook-secret' in tests/setup.ts.

describe('paymentGateway.verifyWebhookSignature', () => {
  it('accepts a correctly-signed payload', () => {
    const rawBody = JSON.stringify({ gatewayRef: 'mock_123', status: 'SUCCESS' });
    const signature = paymentGateway.signPayloadForTesting(rawBody);
    expect(paymentGateway.verifyWebhookSignature(rawBody, signature)).toBe(true);
  });

  it('rejects a signature computed over different bytes (tampered payload)', () => {
    const originalBody = JSON.stringify({ gatewayRef: 'mock_123', status: 'SUCCESS' });
    const signature = paymentGateway.signPayloadForTesting(originalBody);
    const tamperedBody = JSON.stringify({ gatewayRef: 'mock_123', status: 'FAILED' });
    expect(paymentGateway.verifyWebhookSignature(tamperedBody, signature)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    const rawBody = JSON.stringify({ gatewayRef: 'mock_123', status: 'SUCCESS' });
    expect(paymentGateway.verifyWebhookSignature(rawBody, undefined)).toBe(false);
  });

  it('rejects a garbage signature without throwing', () => {
    const rawBody = JSON.stringify({ gatewayRef: 'mock_123', status: 'SUCCESS' });
    // Different length than a real hex-encoded SHA-256 digest — this is the
    // exact case that would make Node's timingSafeEqual throw if not guarded.
    expect(() => paymentGateway.verifyWebhookSignature(rawBody, 'not-a-real-signature')).not.toThrow();
    expect(paymentGateway.verifyWebhookSignature(rawBody, 'not-a-real-signature')).toBe(false);
  });

  it('rejects a same-length but incorrect signature', () => {
    const rawBody = JSON.stringify({ gatewayRef: 'mock_123', status: 'SUCCESS' });
    const realSignature = paymentGateway.signPayloadForTesting(rawBody);
    const wrongButSameLength = realSignature.slice(0, -2) + (realSignature.slice(-2) === '00' ? '11' : '00');
    expect(paymentGateway.verifyWebhookSignature(rawBody, wrongButSameLength)).toBe(false);
  });
});

describe('paymentGateway.createOrder', () => {
  it('returns a stable-shaped mock order with no checkout URL', async () => {
    const order = await paymentGateway.createOrder({
      amount: 1, currency: 'INR', purpose: 'PAYMENT_METHOD_VERIFICATION', referenceId: 'rec_1',
    });
    expect(order.orderId).toContain('PAYMENT_METHOD_VERIFICATION');
    expect(order.orderId).toContain('rec_1');
    expect(order.checkoutUrl).toBeNull();
  });
});
