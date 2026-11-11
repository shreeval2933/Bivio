import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { blockDuringImpersonation } from '../../middleware/blockDuringImpersonation';
import { validate } from '../../middleware/validate';
import { UnauthorizedError } from '../../shared/errors';
import { paymentGateway } from '../../shared/paymentGateway';
import { paymentsController } from './payments.controller';
import { requestPayoutSchema, paymentWebhookSchema } from './payments.schema';

const router = Router();

/**
 * The webhook is called by the payment gateway, never by a logged-in user —
 * it deliberately has no `authenticate` middleware. Verifies the request
 * against req.rawBody (captured in app.ts's express.json verify callback)
 * using the same HMAC check a real gateway integration would need — see
 * src/shared/paymentGateway.ts for what changes when a real provider is
 * wired in (this verification logic does not).
 */
function verifyWebhookSignature(req: Request, _res: Response, next: NextFunction) {
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? '';
  const signature = req.headers['x-webhook-signature'] as string | undefined;
  if (!paymentGateway.verifyWebhookSignature(rawBody, signature)) {
    return next(new UnauthorizedError('Invalid webhook signature'));
  }
  next();
}

router.post(
  '/webhooks/payment',
  verifyWebhookSignature,
  validate(paymentWebhookSchema),
  paymentsController.webhook,
);

// Everything below requires a logged-in user.
router.use(['/wallet', '/payouts'], authenticate);

router.get('/wallet', paymentsController.getWallet);
router.get('/wallet/transactions', paymentsController.getTransactions);
router.get('/payouts', paymentsController.listPayouts);
// Requesting a payout moves real money out — blocked entirely during an
// admin impersonation session (see blockDuringImpersonation's docblock).
router.post('/payouts', blockDuringImpersonation, validate(requestPayoutSchema), paymentsController.requestPayout);
router.post('/payouts/:id/retry', blockDuringImpersonation, paymentsController.retryPayout);

export const paymentsRoutes = router;
