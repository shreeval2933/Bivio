import { z } from 'zod';

// OQ-4 — single fullName field, no firstName/lastName split.
export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
  role: z.enum(['CANDIDATE', 'RECRUITER']),
  // recruiter-only, optional at the schema level — service layer decides
  // whether they're required based on role
  jobTitle: z.string().max(120).optional(),
  companyName: z.string().max(160).optional(),
  contactNumber: z.string().max(20).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
