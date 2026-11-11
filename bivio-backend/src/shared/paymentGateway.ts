import { createHmac, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';
import { env } from '../config/env';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
  : null;

/**
 * Every "pay this fee" or "fund this escrow" flow in the codebase routes
 * through this one module instead of inlining its own mock-success logic.
 * When real gateway integration lands (Razorpay, Stripe, etc.), this file
 * is the only thing that changes — every call site (posting fee
 * confirmation, escrow funding, payouts) stays exactly the same, since they
 * only ever call `createOrder` / `verifyWebhookSignature`, never a specific
 * provider's SDK directly.
 */

export interface CreateOrderResult {
  orderId: string;
  /** null in mock mode — a real gateway would return a hosted checkout URL. */
  checkoutUrl: string | null;
}

export const paymentGateway = {
  /**
   * Mock implementation with Stripe integration: always "succeeds" by returning a mock order id
   * immediately if Stripe is disabled, otherwise creates a real Stripe checkout session in test mode.
   */
  async createOrder(params: { amount: number; currency: string; purpose: string; referenceId?: string; email?: string; cardHolder?: string; successUrl?: string; cancelUrl?: string }): Promise<CreateOrderResult> {
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          customer_email: params.email,
          line_items: [{
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: {
                name: `Verification hold - ${params.purpose}`,
              },
              unit_amount: Math.round(Math.max(params.currency.toLowerCase() === 'inr' ? 10 : 0.5, params.amount) * 100), // Stripe INR requires minimum ₹10, USD requires $0.50
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: params.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recruiter/verification?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: params.cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recruiter/verification?cancel=true`,
        });
        return { orderId: session.id, checkoutUrl: session.url };
      } catch (err) {
        console.error('Stripe Checkout Session creation failed, falling back to mock:', err);
      }
    }

    const orderId = `mock_${params.purpose}_${params.referenceId ?? Date.now()}`;
    return { orderId, checkoutUrl: null };
  },

  async retrieveSession(sessionId: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
    }
    return stripe.checkout.sessions.retrieve(sessionId);
  },

  /**
   * Real HMAC-SHA256 signature verification — the actual shape a webhook
   * signature check takes with most providers (Razorpay, Stripe included),
   * even though the "gateway" producing the signature is currently our own
   * mock. Swapping in a real provider means using their documented header
   * name and payload-signing convention here; the constant-time comparison
   * below (timingSafeEqual, not ===) is correct regardless of provider and
   * should be kept as-is.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
    if (!env.PAYMENT_WEBHOOK_SECRET) return true; // no secret configured yet in dev — allow through
    if (!signatureHeader) return false;

    const expected = createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(signatureHeader, 'hex');

    // timingSafeEqual throws if lengths differ rather than returning false —
    // guard that explicitly so a malformed signature header doesn't 500.
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  },

  /** Signs a payload the same way a webhook sender would — used only by the
   * mock flows in this codebase to produce a signature that verifyWebhookSignature
   * will accept, so local dev/testing can exercise the real verification path. */
  signPayloadForTesting(rawBody: string): string {
    if (!env.PAYMENT_WEBHOOK_SECRET) return '';
    return createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(rawBody).digest('hex');
  },
};
