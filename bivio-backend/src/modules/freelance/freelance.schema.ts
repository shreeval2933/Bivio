import { z } from 'zod';

// ── Proposals ─────────────────────────────────────────────────────────────
const proposedMilestoneSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  amount: z.number().positive(),
  sequence: z.number().int().min(1),
});

export const submitProposalSchema = z.object({
  bidAmount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  durationDays: z.number().int().min(1).optional(),
  estimatedHours: z.number().int().min(1).optional(),
  coverLetter: z.string().min(100), // matches the frontend's minimum-length rule
  milestones: z.array(proposedMilestoneSchema).min(1),
}).refine(
  (d) => {
    const total = d.milestones.reduce((sum, m) => sum + m.amount, 0);
    return Math.abs(total - d.bidAmount) < 0.01;
  },
  { message: 'Milestone amounts must sum to the bid amount', path: ['milestones'] },
);
export type SubmitProposalInput = z.infer<typeof submitProposalSchema>;

export const rejectProposalSchema = z.object({
  reason: z.enum(['BUDGET_MISMATCH', 'SKILLS_MISMATCH', 'CHOSE_ANOTHER', 'TIMELINE_MISMATCH', 'OTHER']).optional(),
  note: z.string().max(500).optional(),
});
export type RejectProposalInput = z.infer<typeof rejectProposalSchema>;

// No edit fields at all on accept — per the no-negotiation design, acceptance
// confirms the proposal's exact terms, it never lets the client change them.
export const acceptProposalSchema = z.object({}).strict();

// ── Milestones ────────────────────────────────────────────────────────────
export const fundMilestoneSchema = z.object({
  paymentMethod: z.string().optional(), // mock gateway for now, see service comment
});
export type FundMilestoneInput = z.infer<typeof fundMilestoneSchema>;

export const verifyFundingSchema = z.object({
  sessionId: z.string().min(1),
});
export type VerifyFundingInput = z.infer<typeof verifyFundingSchema>;

export const submitMilestoneSchema = z.object({
  note: z.string().max(1000).optional(),
  attachmentUrls: z.array(z.string().url()).default([]),
  fileBase64: z.string().optional(),
  fileName: z.string().optional(),
});
export type SubmitMilestoneInput = z.infer<typeof submitMilestoneSchema>;

export const requestRevisionSchema = z.object({
  feedback: z.string().min(10).max(1000),
});
export type RequestRevisionInput = z.infer<typeof requestRevisionSchema>;

export const raiseDisputeSchema = z.object({
  reason: z.string().min(20).max(1000),
});
export type RaiseDisputeInput = z.infer<typeof raiseDisputeSchema>;

// ── Reviews ───────────────────────────────────────────────────────────────
export const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  commRating: z.number().int().min(1).max(5).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
