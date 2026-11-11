import { baseApi } from './baseApi';
import type { CandidateProfile, Resume, Skill } from '@/types';

export const profilesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Fetch public platform settings
    getPublicSettings: builder.query<Record<string, any>, void>({
      query: () => '/settings/public',
    }),

    // Fetch candidate profile details
    getCandidateProfile: builder.query<CandidateProfile, void>({
      query: () => '/candidates/me',
      providesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    updateCandidateProfile: builder.mutation<CandidateProfile, any>({
      query: (body) => ({
        url: '/candidates/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }, { type: 'Profile', id: 'LIST' }],
    }),

    uploadResume: builder.mutation<Resume, { fileUrl: string; fileName: string; mimeType: string; sizeBytes: number }>({
      query: (body) => ({
        url: '/candidates/me/resumes',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    uploadResumeFile: builder.mutation<{ fileUrl: string }, { fileName: string; base64Data: string }>({
      query: (body) => ({
        url: '/candidates/me/resumes/upload-file',
        method: 'POST',
        body,
      }),
    }),

    uploadOfferFile: builder.mutation<{ fileUrl: string }, { fileName: string; base64Data: string }>({
      query: (body) => ({
        url: '/recruiters/me/offers/upload-file',
        method: 'POST',
        body,
      }),
    }),

    setPrimaryResume: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `/candidates/me/resumes/${id}/primary`,
        method: 'PATCH',
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    saveCandidateSkills: builder.mutation<CandidateProfile, { skills: Array<{ skillId: string; proficiency?: number; yearsOfExperience?: number }> }>({
      query: (body) => ({
        url: '/candidates/me/skills',
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    saveWorkExperience: builder.mutation<CandidateProfile, { entries: any[] }>({
      query: (body) => ({
        url: '/candidates/me/work-experience',
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    saveEducation: builder.mutation<CandidateProfile, { entries: any[] }>({
      query: (body) => ({
        url: '/candidates/me/education',
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    saveCertifications: builder.mutation<CandidateProfile, { entries: any[] }>({
      query: (body) => ({
        url: '/candidates/me/certifications',
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    saveLanguages: builder.mutation<CandidateProfile, { entries: any[] }>({
      query: (body) => ({
        url: '/candidates/me/languages',
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    savePortfolio: builder.mutation<any, any>({
      query: (body) => ({
        url: '/candidates/me/portfolio',
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    getFreelancePortfolio: builder.query<any, void>({
      query: () => '/candidates/me/portfolio',
      providesTags: [{ type: 'Profile', id: 'PORTFOLIO' }],
    }),

    addPortfolioProject: builder.mutation<any, any>({
      query: (body) => ({
        url: '/candidates/me/portfolio/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }, { type: 'Profile', id: 'PORTFOLIO' }],
    }),

    updatePortfolioProject: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/candidates/me/portfolio/projects/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }, { type: 'Profile', id: 'PORTFOLIO' }],
    }),

    deletePortfolioProject: builder.mutation<any, string>({
      query: (id) => ({
        url: `/candidates/me/portfolio/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }, { type: 'Profile', id: 'PORTFOLIO' }],
    }),

    addFreelanceService: builder.mutation<any, any>({
      query: (body) => ({
        url: '/candidates/me/portfolio/services',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }, { type: 'Profile', id: 'PORTFOLIO' }],
    }),

    updateFreelanceService: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/candidates/me/portfolio/services/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }, { type: 'Profile', id: 'PORTFOLIO' }],
    }),

    deleteFreelanceService: builder.mutation<any, string>({
      query: (id) => ({
        url: `/candidates/me/portfolio/services/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }, { type: 'Profile', id: 'PORTFOLIO' }],
    }),

    getSkills: builder.query<Skill[], string | void | undefined>({
      query: (q) => q ? `/skills?q=${q}` : '/skills',
    }),

    getPortfolioReviews: builder.query<any[], void>({
      query: () => '/candidates/me/portfolio/reviews',
      providesTags: [{ type: 'Profile', id: 'REVIEWS' }],
    }),

    getRecruiterProfile: builder.query<any, void>({
      query: () => '/recruiters/me',
      providesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    updateRecruiterProfile: builder.mutation<any, any>({
      query: (body) => ({
        url: '/recruiters/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    updateCompany: builder.mutation<any, any>({
      query: (body) => ({
        url: '/recruiters/me/company',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    verifyPaymentMethod: builder.mutation<any, { paymentMethodToken: string; email?: string; cardHolder?: string }>({
      query: (body) => ({
        url: '/recruiters/me/payment-method/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    verifyCheckoutSession: builder.mutation<any, { sessionId: string }>({
      query: (body) => ({
        url: '/recruiters/me/payment-method/verify-session',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    submitKyc: builder.mutation<any, { kycType: 'INDIVIDUAL' | 'BUSINESS'; documents: Array<{ fileUrl: string; fileName: string; mimeType: string; sizeBytes: number }> }>({
      query: (body) => ({
        url: '/recruiters/me/kyc',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    confirmProfileFee: builder.mutation<{ fullTimeFeePaid: boolean; checkoutUrl?: string; alreadyPaid?: boolean }, { sessionId?: string; jobId?: string }>({
      query: (body) => ({
        url: '/candidates/me/profile-fee/confirm',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Profile', id: 'ME' }],
    }),

    getRecruiterTeam: builder.query<any[], void>({
      query: () => '/recruiters/me/team',
      providesTags: [{ type: 'Profile', id: 'LIST' }],
    }),

    searchFreelancers: builder.query<CandidateProfile[], any>({
      query: (params) => ({ url: '/candidates', params }),
      providesTags: [{ type: 'Profile', id: 'LIST' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetPublicSettingsQuery,
  useGetCandidateProfileQuery,
  useUpdateCandidateProfileMutation,
  useUploadResumeMutation,
  useUploadResumeFileMutation,
  useUploadOfferFileMutation,
  useSetPrimaryResumeMutation,
  useSaveCandidateSkillsMutation,
  useSaveWorkExperienceMutation,
  useSaveEducationMutation,
  useSaveCertificationsMutation,
  useSaveLanguagesMutation,
  useSavePortfolioMutation,
  useGetFreelancePortfolioQuery,
  useAddPortfolioProjectMutation,
  useUpdatePortfolioProjectMutation,
  useDeletePortfolioProjectMutation,
  useAddFreelanceServiceMutation,
  useUpdateFreelanceServiceMutation,
  useDeleteFreelanceServiceMutation,
  useGetPortfolioReviewsQuery,
  useGetSkillsQuery,
  useGetRecruiterProfileQuery,
  useUpdateRecruiterProfileMutation,
  useUpdateCompanyMutation,
  useVerifyPaymentMethodMutation,
  useSubmitKycMutation,
  useVerifyCheckoutSessionMutation,
  useConfirmProfileFeeMutation,
  useGetRecruiterTeamQuery,
  useSearchFreelancersQuery,
} = profilesApi;
