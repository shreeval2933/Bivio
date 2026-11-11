import { prisma } from '../../shared/prisma';
import { paymentsRepository } from './payments.repository';
import { assertTransition, PAYOUT_TRANSITIONS } from '../../shared/stateMachines';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors';
import type { RequestPayoutInput, PaymentWebhookInput } from './payments.schema';

async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const setting = await prisma.platformSetting.findUnique({ where: { key } });
  const n = Number(setting?.value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Mock gateway outcome — succeeds unless the caller explicitly set
 * mockFail: true (a documented test-only flag, never set by the real
 * frontend). Swap this for a real gateway call once integration lands; the
 * transition logic around it (PROCESSING -> PAID/FAILED, reversal on
 * failure) stays exactly the same either way.
 */
function mockGatewayWillSucceed(input: RequestPayoutInput): boolean {
  return input.mockFail !== true;
}

export const paymentsService = {
  async getWallet(userId: string) {
    const wallet = await paymentsRepository.findWalletByUserId(userId);
    if (!wallet) throw new NotFoundError('Wallet');
    return wallet;
  },

  async getTransactions(userId: string) {
    const wallet = await paymentsRepository.findWalletByUserId(userId);
    if (!wallet) return { data: [], total: 0, page: 1, limit: 50 };
    const data = await paymentsRepository.findTransactions(wallet.id);
    return { data, total: data.length, page: 1, limit: 50 };
  },

  async listPayouts(userId: string) {
    const wallet = await paymentsRepository.findWalletByUserId(userId);
    if (!wallet) return [];
    return paymentsRepository.findPayouts(wallet.id);
  },

  async requestPayout(userId: string, input: RequestPayoutInput) {
    const minimum = await getSettingNumber('PAYOUT_MINIMUM', 500);
    if (input.amount < minimum) {
      throw new ConflictError(`Minimum payout amount is ${minimum}`);
    }

    let payout;
    try {
      payout = await paymentsRepository.debitAndCreatePayout(
        userId, input.amount, input.payoutMethod, input.payoutDetails,
      );
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_BALANCE') {
        throw new ConflictError('Insufficient balance for this payout');
      }
      throw err;
    }

    return this.processPayout(payout.id, userId, input.amount, mockGatewayWillSucceed(input));
  },

  async retryPayout(userId: string, payoutId: string) {
    const wallet = await paymentsRepository.findWalletByUserId(userId);
    if (!wallet) throw new NotFoundError('Wallet');
    const payout = await paymentsRepository.findPayoutById(payoutId);
    if (!payout) throw new NotFoundError('Payout');
    if (payout.walletId !== wallet.id) throw new ForbiddenError();

    assertTransition(PAYOUT_TRANSITIONS, payout.status, 'REQUESTED', 'payout');

    try {
      await paymentsRepository.redebitForRetry(payoutId, userId, Number(payout.amount));
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_BALANCE') {
        throw new ConflictError('Insufficient balance to retry this payout');
      }
      throw err;
    }

    // Retries always use corrected details, so the mock gateway succeeds here
    // regardless of the original attempt's outcome.
    return this.processPayout(payoutId, userId, Number(payout.amount), true);
  },

  /** REQUESTED -> PROCESSING -> PAID or FAILED (with reversal). Shared by
   * both the initial request and a retry, so the two paths can never
   * diverge in how a payout actually resolves. */
  async processPayout(payoutId: string, userId: string, amount: number, willSucceed: boolean) {
    assertTransition(PAYOUT_TRANSITIONS, 'REQUESTED', 'PROCESSING', 'payout');
    await paymentsRepository.markProcessing(payoutId);

    if (willSucceed) {
      assertTransition(PAYOUT_TRANSITIONS, 'PROCESSING', 'PAID', 'payout');
      const estimatedArrival = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // ~2 business days
      return paymentsRepository.markPaid(payoutId, estimatedArrival);
    }

    assertTransition(PAYOUT_TRANSITIONS, 'PROCESSING', 'FAILED', 'payout');
    const wallet = await paymentsRepository.findWalletByUserId(userId);
    if (!wallet) throw new NotFoundError('Wallet');
    return paymentsRepository.markFailedAndReverse(payoutId, wallet.id, amount);
  },

  // ── Webhook ───────────────────────────────────────────────────────────
  async handleWebhook(input: PaymentWebhookInput) {
    const payment = await paymentsRepository.findPaymentByGatewayRef(input.gatewayRef);
    if (!payment) throw new NotFoundError('Payment');

    // Idempotent: a replayed webhook for an already-resolved payment is a
    // no-op, not an error — gateways retry webhooks and this must tolerate it.
    if (payment.status !== 'INITIATED') {
      return { ok: true, alreadyProcessed: true };
    }

    await paymentsRepository.updatePaymentStatus(payment.id, input.status);
    return { ok: true, alreadyProcessed: false };
  },
};
