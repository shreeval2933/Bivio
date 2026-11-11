import { baseApi } from './baseApi';
import type {
  Job, Paginated, MatchScore, HiringStage, AIWeightage,
  JobType, BudgetType, EmploymentType, ExperienceLevel, EducationLevel,
  NoticePeriod, FreelanceExperienceLevel, StageType,
} from '@/types';

export interface JobFilters {
  jobType?: JobType;
  location?: string;
  isRemote?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

interface CreateJobBase {
  title: string;
  description: string;
  location?: string;
  isRemote?: boolean;
  skillIds: string[];
  mandatorySkillIds?: string[];
  currency?: string;
  deadline?: string;
}

export interface CreateFullTimeJobInput extends CreateJobBase {
  jobType: 'FULL_TIME';
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  department?: string;
  responsibilities?: string;
  salaryMin: number;
  salaryMax: number;
  salaryVisible?: boolean;
  minExperienceYears: number;
  maxExperienceYears?: number;
  minEducationLevel: EducationLevel;
  noticePeriodPreference?: NoticePeriod;
  vacancies?: number;
  benefits?: string[];
  internalJobCode?: string;
}

export interface CreateFreelanceJobInput extends CreateJobBase {
  jobType: 'FREELANCE';
  deliverables: string[];
  attachments?: string[];
  budgetType: BudgetType;
  budget: number;
  freelanceExperienceLevel: FreelanceExperienceLevel;
  projectLengthEstimate: 'UNDER_1_WEEK' | 'W1_4' | 'M1_3' | 'M3_PLUS';
  proposalDeadline?: string;
}

export type CreateJobInput = CreateFullTimeJobInput | CreateFreelanceJobInput;

export interface HiringStageInput {
  name: string;
  stageType: Extract<StageType, 'OA' | 'INTERVIEW' | 'CUSTOM'>;
  automationLink?: string;
  emailSubject?: string;
  emailBodyTemplate?: string;
  prerequisite?: string;
  requirementDocUrl?: string;
  requirementDocFileName?: string;
}

// One shape covers both job types — unused factors sent as 0.
export interface WeightageInput {
  skillWeight: number;
  experienceWeight?: number;
  educationWeight?: number;
  domainWeight?: number;
  practicalFitWeight?: number;
  portfolioWeight?: number;
  rateFitWeight?: number;
  trackRecordWeight?: number;
  availabilityWeight?: number;
}

export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<Paginated<Job>, JobFilters | void>({
      query: (filters) => ({ url: '/jobs', params: (filters ?? {}) as Record<string, unknown> }),
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: 'Job' as const, id })), { type: 'Job' as const, id: 'LIST' }]
          : [{ type: 'Job' as const, id: 'LIST' }],
    }),

    getJobById: builder.query<Job, string>({
      query: (id) => `/jobs/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Job', id }],
    }),

    getRecruiterJobs: builder.query<Paginated<Job>, void>({
      query: () => '/recruiter/jobs',
      providesTags: [{ type: 'Job', id: 'RECRUITER_LIST' }],
    }),

    // Step 1 of the wizard. OQ-1: no payment step in this call at all — the
    // one-time fee is checked at publish time, not job creation time.
    createJob: builder.mutation<Job, CreateJobInput>({
      query: (body) => ({ url: '/jobs', method: 'POST', body }),
      invalidatesTags: [{ type: 'Job', id: 'LIST' }, { type: 'Job', id: 'RECRUITER_LIST' }],
    }),

    // Section-level edits (job detail page) — each section saves independently.
    updateJobBasics: builder.mutation<Job, {
      id: string;
      title?: string;
      description?: string;
      responsibilities?: string;
      location?: string;
      isRemote?: boolean;
      skillIds?: string[];
      mandatorySkillIds?: string[];
      currency?: string;
      deadline?: string;
      department?: string;
      employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT_TO_HIRE';
      experienceLevel?: 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE';
    }>({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}/basics`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }],
    }),
    updateJobRequirements: builder.mutation<Job, { id: string } & Partial<Pick<CreateFullTimeJobInput,
      'minExperienceYears' | 'maxExperienceYears' | 'minEducationLevel' | 'noticePeriodPreference'>>>({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}/requirements`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }],
    }),
    updateJobCompensation: builder.mutation<Job, { id: string } & Partial<Pick<CreateFullTimeJobInput,
      'salaryMin' | 'salaryMax' | 'salaryVisible' | 'vacancies' | 'internalJobCode'> & { currency?: string } & { budget?: number; budgetType?: 'FIXED' | 'HOURLY'; deliverables?: string[]; attachments?: string[]; freelanceExperienceLevel?: 'ENTRY' | 'INTERMEDIATE' | 'EXPERT'; projectLengthEstimate?: 'UNDER_1_WEEK' | 'W1_4' | 'M1_3' | 'M3_PLUS'; proposalDeadline?: string }>>({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}/compensation`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }],
    }),
    updateJobBenefits: builder.mutation<Job, { id: string; benefits: string[] }>({
      query: ({ id, benefits }) => ({ url: `/jobs/${id}/benefits`, method: 'PATCH', body: { benefits } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }],
    }),
    extendJobDeadline: builder.mutation<Job, { id: string; deadline: string }>({
      query: ({ id, deadline }) => ({ url: `/jobs/${id}/deadline`, method: 'PATCH', body: { deadline } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }],
    }),

    // Step 3 — hiring stages (full-time only). Screening/Offer anchors are
    // managed server-side; only the configurable stages in between are sent.
    setHiringStages: builder.mutation<HiringStage[], { id: string; stages: HiringStageInput[] }>({
      query: ({ id, stages }) => ({ url: `/jobs/${id}/stages`, method: 'POST', body: { stages } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }],
    }),

    // Step 4 — AI weightage, both job types.
    setWeightage: builder.mutation<AIWeightage, { id: string } & WeightageInput>({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}/weightage`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }],
    }),

    // Step 5 — publish. May reject with 402 PAYMENT_REQUIRED if the
    // recruiter's one-time posting fee isn't paid yet — the frontend should
    // catch that status specifically and trigger the fee modal.
    publishJob: builder.mutation<Job, string>({
      query: (id) => ({ url: `/jobs/${id}/publish`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Job', id }, { type: 'Job', id: 'LIST' }, { type: 'Job', id: 'RECRUITER_LIST' }],
    }),

    closeJob: builder.mutation<Job, string>({
      query: (id) => ({ url: `/jobs/${id}/close`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Job', id }, { type: 'Job', id: 'RECRUITER_LIST' }],
    }),
    reopenJob: builder.mutation<Job, string>({
      query: (id) => ({ url: `/jobs/${id}/reopen`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Job', id }, { type: 'Job', id: 'RECRUITER_LIST' }],
    }),
    cancelJob: builder.mutation<Job, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/jobs/${id}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }, { type: 'Job', id: 'RECRUITER_LIST' }],
    }),
    duplicateJob: builder.mutation<Job, string>({
      query: (id) => ({ url: `/jobs/${id}/duplicate`, method: 'POST' }),
      invalidatesTags: [{ type: 'Job', id: 'RECRUITER_LIST' }],
    }),

    getShortlist: builder.query<MatchScore[], string>({
      query: (jobId) => `/jobs/${jobId}/candidates`,
      providesTags: (_r, _e, jobId) => [{ type: 'MatchScore', id: jobId }],
    }),

    // OQ-1 — one-time posting fee confirmation. Checked once per recruiter
    // account, never per job. See backend profiles.routes.ts for the mock
    // gateway-success flow this hits today.
    confirmPostingFee: builder.mutation<{ postingFeePaid: boolean; alreadyPaid: boolean; checkoutUrl?: string }, { sessionId?: string; jobId?: string } | void>({
      query: (body) => ({ url: '/recruiters/me/posting-fee/confirm', method: 'POST', body }),
      invalidatesTags: [{ type: 'Job', id: 'RECRUITER_LIST' }],
    }),
    uploadJobFile: builder.mutation<{ fileUrl: string }, { fileName: string; base64Data: string }>({
      query: (body) => ({ url: '/jobs/upload-file', method: 'POST', body }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetJobsQuery,
  useGetJobByIdQuery,
  useGetRecruiterJobsQuery,
  useCreateJobMutation,
  useUpdateJobBasicsMutation,
  useUpdateJobRequirementsMutation,
  useUpdateJobCompensationMutation,
  useUpdateJobBenefitsMutation,
  useExtendJobDeadlineMutation,
  useSetHiringStagesMutation,
  useSetWeightageMutation,
  usePublishJobMutation,
  useCloseJobMutation,
  useReopenJobMutation,
  useCancelJobMutation,
  useDuplicateJobMutation,
  useGetShortlistQuery,
  useConfirmPostingFeeMutation,
  useUploadJobFileMutation,
} = jobsApi;
