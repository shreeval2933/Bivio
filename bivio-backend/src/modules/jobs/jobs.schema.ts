import { z } from 'zod';

// ── Step 1 — basic info, forks by jobType ────────────────────────────────
const baseJobFields = {
  title: z.string().min(3).max(200),
  description: z.string().min(20),
  location: z.string().max(160).optional(),
  isRemote: z.boolean().default(false),
  skillIds: z.array(z.string().uuid()).min(1),
  mandatorySkillIds: z.array(z.string().uuid()).default([]),
  currency: z.string().length(3).default('INR'),
  deadline: z.string().datetime().optional(),
};

export const createFullTimeJobSchema = z.object({
  ...baseJobFields,
  jobType: z.literal('FULL_TIME'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT_TO_HIRE']),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']),
  department: z.string().max(120).optional(),
  responsibilities: z.string().optional(),
  salaryMin: z.number().positive(),
  salaryMax: z.number().positive(),
  salaryVisible: z.boolean().default(true),
  minExperienceYears: z.number().min(0).max(50),
  maxExperienceYears: z.number().min(0).max(50).optional(),
  minEducationLevel: z.enum(['ANY', 'BACHELORS', 'MASTERS', 'PHD']),
  noticePeriodPreference: z.enum(['IMMEDIATE', 'DAYS_15', 'DAYS_30', 'DAYS_60', 'DAYS_90', 'ANY']).optional(),
  vacancies: z.number().int().min(1).default(1),
  benefits: z.array(z.string()).default([]),
  internalJobCode: z.string().max(60).optional(),
});
// NOTE: salaryMin<=salaryMax used to be a `.refine()` applied directly here,
// which silently turns a ZodObject into a ZodEffects — z.discriminatedUnion
// requires every member to be a raw ZodObject (it reads `.shape` off each one
// to find the discriminator key), so that would fail both to type-check AND
// at runtime. The check is applied once below, AFTER the union is formed,
// instead.

export const createFreelanceJobSchema = z.object({
  ...baseJobFields,
  jobType: z.literal('FREELANCE'),
  deliverables: z.array(z.string()).min(1),
  attachments: z.array(z.string()).default([]),
  budgetType: z.enum(['FIXED', 'HOURLY']),
  budget: z.number().positive(),
  freelanceExperienceLevel: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']),
  projectLengthEstimate: z.enum(['UNDER_1_WEEK', 'W1_4', 'M1_3', 'M3_PLUS']),
  proposalDeadline: z.string().datetime().optional(),
});

export const createJobSchema = z.discriminatedUnion('jobType', [
  createFullTimeJobSchema, createFreelanceJobSchema,
]).refine(
  (d) => d.jobType !== 'FULL_TIME' || d.salaryMin <= d.salaryMax,
  { message: 'salaryMin must be <= salaryMax', path: ['salaryMax'] },
);
export type CreateJobInput = z.infer<typeof createJobSchema>;

// ── Section-level edits (job detail page's per-section save) ────────────
export const updateJobBasicsSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(20).optional(),
  responsibilities: z.string().optional(),
  location: z.string().max(160).optional(),
  isRemote: z.boolean().optional(),
  skillIds: z.array(z.string().uuid()).min(1).optional(),
  mandatorySkillIds: z.array(z.string().uuid()).optional(),
  currency: z.string().length(3).optional(),
  deadline: z.string().datetime().optional(),
  department: z.string().max(120).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT_TO_HIRE']).optional(),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']).optional(),
});

export const updateJobRequirementsSchema = z.object({
  minExperienceYears: z.number().min(0).max(50).optional(),
  maxExperienceYears: z.number().min(0).max(50).optional(),
  minEducationLevel: z.enum(['ANY', 'BACHELORS', 'MASTERS', 'PHD']).optional(),
  noticePeriodPreference: z.enum(['IMMEDIATE', 'DAYS_15', 'DAYS_30', 'DAYS_60', 'DAYS_90', 'ANY']).optional(),
});

export const updateJobCompensationSchema = z.object({
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  salaryVisible: z.boolean().optional(),
  vacancies: z.number().int().min(1).optional(),
  internalJobCode: z.string().max(60).optional(),
  budget: z.number().positive().optional(),
  budgetType: z.enum(['FIXED', 'HOURLY']).optional(),
  deliverables: z.array(z.string()).min(1).optional(),
  attachments: z.array(z.string()).optional(),
  freelanceExperienceLevel: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']).optional(),
  projectLengthEstimate: z.enum(['UNDER_1_WEEK', 'W1_4', 'M1_3', 'M3_PLUS']).optional(),
  proposalDeadline: z.string().datetime().optional(),
});

export const updateJobBenefitsSchema = z.object({
  benefits: z.array(z.string()),
});

export const extendDeadlineSchema = z.object({
  deadline: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

// ── Step 3 — hiring stages (full-time only) ──────────────────────────────
const hiringStageInput = z.object({
  name: z.string().min(2).max(80),
  stageType: z.enum(['OA', 'INTERVIEW', 'CUSTOM']), // SCREENING/OFFER are system-added, never client-supplied
  automationLink: z.string().url().or(z.literal('')).optional().nullable(),
  emailSubject: z.string().max(200).optional(),
  emailBodyTemplate: z.string().optional(),
  prerequisite: z.string().optional(),
  requirementDocUrl: z.string().url().optional(),
  requirementDocFileName: z.string().optional(),
}).refine(
  (s) => {
    if (s.stageType === 'CUSTOM') return true;
    if (s.stageType === 'OA') {
      return !!s.automationLink && !!s.emailSubject && !!s.emailBodyTemplate;
    }
    if (s.stageType === 'INTERVIEW') {
      return !!s.emailSubject && !!s.emailBodyTemplate;
    }
    return false;
  },
  { message: 'OA stages require automationLink, emailSubject, and emailBodyTemplate. INTERVIEW stages require emailSubject and emailBodyTemplate.' },
);

export const setHiringStagesSchema = z.object({
  stages: z.array(hiringStageInput).min(1),
});
export type SetHiringStagesInput = z.infer<typeof setHiringStagesSchema>;

// ── Step 4 — AI weightage, one schema covers both job types ──────────────
export const setWeightageSchema = z.object({
  skillWeight: z.number().int().min(0).max(100),
  experienceWeight: z.number().int().min(0).max(100).default(0),
  educationWeight: z.number().int().min(0).max(100).default(0),
  domainWeight: z.number().int().min(0).max(100).default(0),
  practicalFitWeight: z.number().int().min(0).max(100).default(0),
  portfolioWeight: z.number().int().min(0).max(100).default(0),
  rateFitWeight: z.number().int().min(0).max(100).default(0),
  trackRecordWeight: z.number().int().min(0).max(100).default(0),
  availabilityWeight: z.number().int().min(0).max(100).default(0),
}).refine(
  (w) =>
    w.skillWeight + w.experienceWeight + w.educationWeight + w.domainWeight +
    w.practicalFitWeight + w.portfolioWeight + w.rateFitWeight +
    w.trackRecordWeight + w.availabilityWeight === 100,
  { message: 'Weights must sum to exactly 100' },
);
export type SetWeightageInput = z.infer<typeof setWeightageSchema>;

export const jobListQuerySchema = z.object({
  jobType: z.enum(['FULL_TIME', 'FREELANCE']).optional(),
  location: z.string().optional(),
  isRemote: z.coerce.boolean().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type JobListQuery = z.infer<typeof jobListQuerySchema>;
