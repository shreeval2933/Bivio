import { z } from 'zod';

export const updateCandidateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  profileImage: z.string().url().optional(),
  headline: z.string().max(160).optional(),
  summary: z.string().max(2000).optional(),
  location: z.string().max(160).optional(),
  experienceYears: z.number().min(0).max(60).optional(),
  highestEducation: z.string().max(160).optional(),
  currentStatus: z.enum(['EMPLOYED', 'FREELANCING', 'OPEN_TO_WORK', 'STUDENT']).optional(),
  noticePeriod: z.enum(['IMMEDIATE', 'DAYS_15', 'DAYS_30', 'DAYS_60', 'DAYS_90', 'ANY']).optional(),
  openToFullTime: z.boolean().optional(),
  openToFreelance: z.boolean().optional(),
});
export type UpdateCandidateProfileInput = z.infer<typeof updateCandidateProfileSchema>;

// ── Resumes ───────────────────────────────────────────────────────────────
// The actual binary upload (to S3/R2) is out of scope for this module — this
// endpoint registers the resume record once the file is already uploaded via
// a presigned URL, matching BIVIO_DEV_SPEC.md's upload pattern.
export const uploadResumeSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type UploadResumeInput = z.infer<typeof uploadResumeSchema>;

// ── Skills ────────────────────────────────────────────────────────────────
export const saveSkillsSchema = z.object({
  skills: z.array(z.object({
    skillId: z.string().uuid(),
    proficiency: z.number().int().min(1).max(5).optional(),
    yearsOfExperience: z.number().min(0).max(60).optional(),
  })),
});
export type SaveSkillsInput = z.infer<typeof saveSkillsSchema>;

// ── Work experience ───────────────────────────────────────────────────────
const workExperienceEntry = z.object({
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  employmentType: z.enum(['FULL_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(1000).optional(),
}).refine((d) => !d.isCurrent || !d.endDate, {
  message: 'A current role cannot have an end date', path: ['endDate'],
});
export const saveWorkExperienceSchema = z.object({ entries: z.array(workExperienceEntry) });
export type SaveWorkExperienceInput = z.infer<typeof saveWorkExperienceSchema>;

// ── Education ─────────────────────────────────────────────────────────────
const educationEntry = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  fieldOfStudy: z.string().min(1).max(200),
  startYear: z.number().int().min(1950).max(2100),
  endYear: z.number().int().min(1950).max(2100),
  grade: z.string().max(50).optional(),
}).refine((d) => d.startYear <= d.endYear, {
  message: 'startYear must be <= endYear', path: ['endYear'],
});
export const saveEducationSchema = z.object({ entries: z.array(educationEntry) });
export type SaveEducationInput = z.infer<typeof saveEducationSchema>;

// ── Certifications ────────────────────────────────────────────────────────
const certificationEntry = z.object({
  name: z.string().min(1).max(200),
  issuingOrg: z.string().min(1).max(200),
  issueDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  credentialUrl: z.string().url().optional(),
});
export const saveCertificationsSchema = z.object({ entries: z.array(certificationEntry) });
export type SaveCertificationsInput = z.infer<typeof saveCertificationsSchema>;

// ── Languages ──────────────────────────────────────────────────────────────
const languageEntry = z.object({
  language: z.string().min(1).max(100),
  fluency: z.enum(['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE']),
});
export const saveLanguagesSchema = z.object({ entries: z.array(languageEntry) });
export type SaveLanguagesInput = z.infer<typeof saveLanguagesSchema>;

// ── Freelance portfolio ────────────────────────────────────────────────────
export const savePortfolioSchema = z.object({
  bio: z.string().max(1500).optional(),
  hourlyRate: z.number().positive().optional(),
  currency: z.string().length(3).default('INR'),
  preferredEngagement: z.array(z.enum(['FIXED', 'HOURLY', 'RETAINER'])).optional(),
  availableFrom: z.string().datetime().optional(),
  weeklyCapacity: z.enum(['UNDER_10', 'H10_20', 'H20_40', 'FULL_TIME']).optional(),
  portfolioUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
  hideEarnings: z.boolean().optional(),
});
export type SavePortfolioInput = z.infer<typeof savePortfolioSchema>;

export const portfolioProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1500).optional().nullable(),
  role: z.string().max(160).optional().nullable(),
  repositoryUrl: z.string().url().optional().nullable(),
  liveUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  clientName: z.string().max(160).optional().nullable(),
  clientNamePrivate: z.boolean().default(false),
  startedOn: z.string().datetime().optional().nullable(),
  completedOn: z.string().datetime().optional().nullable(),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().optional().default(0),
  skillIds: z.array(z.string().uuid()).default([]),
});
export type PortfolioProjectInput = z.infer<typeof portfolioProjectSchema>;

export const portfolioServiceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startingPrice: z.number().positive(),
  deliveryTime: z.string().min(1).max(100),
  skillIds: z.array(z.string().uuid()).default([]),
});
export type PortfolioServiceInput = z.infer<typeof portfolioServiceSchema>;

// ── Recruiter profile ─────────────────────────────────────────────────────
export const updateRecruiterProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  designation: z.string().max(160).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  profileImage: z.string().optional().nullable(),
  isSolo: z.boolean().optional(),
});
export type UpdateRecruiterProfileInput = z.infer<typeof updateRecruiterProfileSchema>;

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(160),
  website: z.string().url().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ── Verification (recruiter side) ─────────────────────────────────────────
// Payment-method verification never touches raw card data server-side — in
// a real integration this would be a token/nonce returned by a hosted field
// (Stripe Elements-equivalent), not a card number. The mock accepts a
// provider-agnostic token here for exactly that reason.
export const verifyPaymentMethodSchema = z.object({
  paymentMethodToken: z.string().min(1),
  email: z.string().email().optional().nullable(),
  cardHolder: z.string().optional().nullable(),
});
export type VerifyPaymentMethodInput = z.infer<typeof verifyPaymentMethodSchema>;

const kycDocumentSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export const submitKycSchema = z.object({
  kycType: z.enum(['INDIVIDUAL', 'BUSINESS']),
  documents: z.array(kycDocumentSchema).min(1),
});
export type SubmitKycInput = z.infer<typeof submitKycSchema>;
