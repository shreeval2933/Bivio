import { z } from 'zod';

// ── Disputes ──────────────────────────────────────────────────────────────
export const resolveDisputeSchema = z.object({
  amountToFreelancer: z.number().min(0),
  amountToClient: z.number().min(0),
  resolutionNote: z.string().min(10).max(2000),
});
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

export const escalateDisputeSchema = z.object({
  escalationReason: z.string().min(10).max(1000),
});
export type EscalateDisputeInput = z.infer<typeof escalateDisputeSchema>;

// ── Users ─────────────────────────────────────────────────────────────────
export const moderateUserSchema = z.object({
  action: z.enum(['WARN', 'SUSPEND', 'BAN', 'UNBAN']),
  reason: z.string().min(10).max(1000),
  expiresAt: z.string().datetime().optional(), // used for SUSPEND only
});
export type ModerateUserInput = z.infer<typeof moderateUserSchema>;

// ── Verifications (KYC) ──────────────────────────────────────────────────
export const approveKycSchema = z.object({
  note: z.string().max(500).optional(),
});
export type ApproveKycInput = z.infer<typeof approveKycSchema>;

export const rejectKycSchema = z.object({
  reason: z.enum(['DOCUMENT_UNCLEAR', 'NAME_MISMATCH', 'INVALID_DOCUMENT_TYPE', 'SUSPECTED_FRAUD', 'OTHER']),
  note: z.string().max(500).optional(),
});
export type RejectKycInput = z.infer<typeof rejectKycSchema>;

export const requestKycInfoSchema = z.object({
  message: z.string().min(10).max(1000),
});
export type RequestKycInfoInput = z.infer<typeof requestKycInfoSchema>;

// ── Password reset (admin-triggered) ────────────────────────────────────
export const resetPasswordSchema = z.object({}).strict(); // no body needed — target comes from the URL param

// ── Impersonation ────────────────────────────────────────────────────────
export const impersonateSchema = z.object({
  reason: z.string().min(10).max(500), // required, audit-logged — no silent impersonation
});
export type ImpersonateInput = z.infer<typeof impersonateSchema>;
