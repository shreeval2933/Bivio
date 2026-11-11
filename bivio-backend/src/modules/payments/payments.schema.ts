import { z } from 'zod';

export const requestPayoutSchema = z.object({
  amount: z.number().positive(),
  payoutMethod: z.enum(['UPI', 'BANK_TRANSFER']),
  payoutDetails: z.record(z.string()), // e.g. { upiId: '...' } or { accountNumber: '...', ifsc: '...' }
  // Explicit, documented test-only flag — lets a developer exercise the
  // retry-a-failed-payout flow deliberately. Never set by the real frontend;
  // omitted entirely, the mock gateway always succeeds.
  mockFail: z.boolean().optional(),
});
export type RequestPayoutInput = z.infer<typeof requestPayoutSchema>;

export const paymentWebhookSchema = z.object({
  gatewayRef: z.string().min(1),
  status: z.enum(['SUCCESS', 'FAILED']),
});
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
