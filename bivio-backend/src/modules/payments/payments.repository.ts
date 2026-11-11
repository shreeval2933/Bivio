import { prisma } from '../../shared/prisma';
import { Prisma } from '@prisma/client';

function maskPayoutDetails(method: string, details: Record<string, string>): string {
  if (method === 'UPI' && details.upiId) {
    const [name, domain] = details.upiId.split('@');
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 0))}@${domain ?? ''}`;
  }
  if (method === 'BANK_TRANSFER' && details.accountNumber) {
    const last4 = details.accountNumber.slice(-4);
    return `${'*'.repeat(Math.max(details.accountNumber.length - 4, 0))}${last4}`;
  }
  return '••••';
}

export const paymentsRepository = {
  findWalletByUserId(userId: string) {
    return prisma.wallet.findUnique({ where: { userId } });
  },

  findTransactions(walletId: string, limit = 50) {
    return prisma.transaction.findMany({ where: { walletId }, orderBy: { createdAt: 'desc' }, take: limit });
  },

  findPayouts(walletId: string) {
    return prisma.payout.findMany({ where: { walletId }, orderBy: { requestedAt: 'desc' } });
  },

  findPayoutById(id: string) {
    return prisma.payout.findUnique({ where: { id } });
  },

  /**
   * The row-locked debit. CHECK(available_balance >= 0) alone does not
   * prevent two concurrent withdrawal requests from both reading a stale
   * balance and both committing — this lock does. See BIVIO_DEV_SPEC.md §8.2.
   * Returns the created Payout row, or throws 'INSUFFICIENT_BALANCE' for the
   * service to translate into a clean error.
   */
  async debitAndCreatePayout(userId: string, amount: number, payoutMethod: 'UPI' | 'BANK_TRANSFER', payoutDetails: Record<string, string>) {
    return prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRaw<Array<{ id: string; available_balance: Prisma.Decimal }>>`
        SELECT * FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE
      `;
      if (!wallet) throw new Error('NO_WALLET');
      if (new Prisma.Decimal(wallet.available_balance).lt(amount)) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const newBalance = new Prisma.Decimal(wallet.available_balance).sub(amount);
      await tx.wallet.update({ where: { id: wallet.id }, data: { availableBalance: newBalance } });

      const payout = await tx.payout.create({
        data: {
          walletId: wallet.id, amount, payoutMethod, payoutDetails,
          payoutDetailsMasked: maskPayoutDetails(payoutMethod, payoutDetails),
          status: 'REQUESTED',
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id, direction: 'DEBIT', amount, balanceAfter: newBalance,
          referenceType: 'PAYOUT', referenceId: payout.id, description: 'Withdrawal requested',
        },
      });

      return payout;
    });
  },

  /** Same row-locked debit, reused for a retry — a failed payout's earlier
   * debit was already reversed, so retrying re-debits from scratch against
   * the current balance rather than assuming the old debit is still valid. */
  async redebitForRetry(payoutId: string, userId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRaw<Array<{ id: string; available_balance: Prisma.Decimal }>>`
        SELECT * FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE
      `;
      if (!wallet) throw new Error('NO_WALLET');
      if (new Prisma.Decimal(wallet.available_balance).lt(amount)) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const newBalance = new Prisma.Decimal(wallet.available_balance).sub(amount);
      await tx.wallet.update({ where: { id: wallet.id }, data: { availableBalance: newBalance } });

      await tx.transaction.create({
        data: {
          walletId: wallet.id, direction: 'DEBIT', amount, balanceAfter: newBalance,
          referenceType: 'PAYOUT', referenceId: payoutId, description: 'Withdrawal retried',
        },
      });

      return tx.payout.update({ where: { id: payoutId }, data: { status: 'REQUESTED' } });
    });
  },

  markProcessing(payoutId: string) {
    return prisma.payout.update({ where: { id: payoutId }, data: { status: 'PROCESSING' } });
  },

  markPaid(payoutId: string, estimatedArrival: Date) {
    return prisma.payout.update({
      where: { id: payoutId }, data: { status: 'PAID', processedAt: new Date(), estimatedArrival },
    });
  },

  /** On failure, the debit must be reversed — credit the wallet back and
   * write the reversing ledger entry, inside the same transaction as the
   * status flip so the two never disagree. */
  async markFailedAndReverse(payoutId: string, walletId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRaw<Array<{ id: string; available_balance: Prisma.Decimal }>>`
        SELECT * FROM wallets WHERE id = ${walletId}::uuid FOR UPDATE
      `;
      const newBalance = new Prisma.Decimal(wallet.available_balance).add(amount);
      await tx.wallet.update({ where: { id: walletId }, data: { availableBalance: newBalance } });
      await tx.transaction.create({
        data: {
          walletId, direction: 'CREDIT', amount, balanceAfter: newBalance,
          referenceType: 'PAYOUT', referenceId: payoutId, description: 'Payout failed — reversed',
        },
      });
      return tx.payout.update({ where: { id: payoutId }, data: { status: 'FAILED' } });
    });
  },

  // ── Webhook ───────────────────────────────────────────────────────────
  findPaymentByGatewayRef(gatewayRef: string) {
    return prisma.payment.findUnique({ where: { gatewayRef } });
  },

  updatePaymentStatus(id: string, status: 'SUCCESS' | 'FAILED') {
    return prisma.payment.update({
      where: { id }, data: { status, paidAt: status === 'SUCCESS' ? new Date() : undefined },
    });
  },
};
