import { z } from 'zod';

// ── Applications ──────────────────────────────────────────────────────────
export const applyToJobSchema = z.object({
  resumeId: z.string().uuid().optional(), // defaults to primary resume if omitted
  coverNote: z.string().max(1000).optional(),
});
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;

export const moveStageSchema = z.object({
  toStageId: z.string().uuid(),
  note: z.string().max(500).optional(),
});
export type MoveStageInput = z.infer<typeof moveStageSchema>;

export const bulkStageSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(1),
  toStageId: z.string().uuid(),
});
export type BulkStageInput = z.infer<typeof bulkStageSchema>;

export const bulkRejectSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(1),
  reason: z.string().max(500).optional(),
});
export type BulkRejectInput = z.infer<typeof bulkRejectSchema>;

export const rejectApplicationSchema = z.object({
  reason: z.enum(['SKILLS_MISMATCH', 'EXPERIENCE_MISMATCH', 'CULTURE_FIT', 'POSITION_FILLED', 'OTHER']).optional(),
  note: z.string().max(500).optional(),
});
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;

// ── Invitations ───────────────────────────────────────────────────────────
export const sendInvitationSchema = z.object({
  candidateId: z.string().uuid(),
  message: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});
export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;

export const respondInvitationSchema = z.object({
  accept: z.boolean(),
});
export type RespondInvitationInput = z.infer<typeof respondInvitationSchema>;

// ── Offers ────────────────────────────────────────────────────────────────
export const extendOfferSchema = z.object({
  compensation: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  joiningDate: z.string().datetime().optional(),
  offerLetterUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
});
export type ExtendOfferInput = z.infer<typeof extendOfferSchema>;

export const respondOfferSchema = z.object({
  accept: z.boolean(),
  rejectionReason: z.string().max(500).optional(),
});
export type RespondOfferInput = z.infer<typeof respondOfferSchema>;

// ── Interviews ────────────────────────────────────────────────────────────
export const scheduleInterviewSchema = z.object({
  hiringStageId: z.string().uuid().optional(),
  interviewerId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  mode: z.enum(['ONLINE', 'PHONE', 'ONSITE']),
  meetingLink: z.string().url().optional(),
  location: z.string().max(300).optional(),
  agendaNotes: z.string().max(1000).optional(),
}).refine((d) => d.mode !== 'ONLINE' || !!d.meetingLink, {
  message: 'meetingLink is required when mode is ONLINE', path: ['meetingLink'],
}).refine((d) => d.mode !== 'ONSITE' || !!d.location, {
  message: 'location is required when mode is ONSITE', path: ['location'],
});
export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;

export const rescheduleInterviewSchema = z.object({
  scheduledAt: z.string().datetime(),
  rescheduleReason: z.string().max(500).optional(),
});
export type RescheduleInterviewInput = z.infer<typeof rescheduleInterviewSchema>;

export const interviewFeedbackSchema = z.object({
  commRating: z.number().int().min(1).max(5).optional(),
  techRating: z.number().int().min(1).max(5).optional(),
  cultureRating: z.number().int().min(1).max(5).optional(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional(),
  recommendation: z.enum(['PROCEED', 'HOLD', 'REJECT']),
});
export type InterviewFeedbackInput = z.infer<typeof interviewFeedbackSchema>;

export const candidateRespondInterviewSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
  rescheduleReason: z.string().max(500).optional(),
});
export type CandidateRespondInterviewInput = z.infer<typeof candidateRespondInterviewSchema>;
