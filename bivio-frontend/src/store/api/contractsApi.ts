import { baseApi } from './baseApi';
import type { Contract, Paginated, Proposal } from '@/types';

export interface ProposalFilters {
  jobId?: string;
  mine?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}

export const contractsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProposals: builder.query<Paginated<Proposal>, ProposalFilters | void>({
      query: (filters) => ({ url: '/proposals', params: (filters ?? {}) as Record<string, unknown> }),
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: 'Proposal' as const, id })), { type: 'Proposal' as const, id: 'LIST' }]
          : [{ type: 'Proposal' as const, id: 'LIST' }],
    }),

    submitProposal: builder.mutation<Proposal, { jobId: string; bidAmount: number; durationDays?: number; coverLetter: string }>({
      query: ({ jobId, ...body }) => ({ url: `/jobs/${jobId}/proposals`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Proposal', id: 'LIST' }],
    }),

    shortlistProposal: builder.mutation<Proposal, string>({
      query: (id) => ({ url: `/proposals/${id}/shortlist`, method: 'PATCH' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Proposal', id }, { type: 'Proposal', id: 'LIST' }],
    }),

    acceptProposal: builder.mutation<Contract, { id: string }>({
      query: ({ id }) => ({ url: `/proposals/${id}/accept`, method: 'POST', body: {} }),
      invalidatesTags: [{ type: 'Proposal', id: 'LIST' }, { type: 'Contract', id: 'LIST' }],
    }),

    rejectProposal: builder.mutation<Proposal, { id: string; reason?: string; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/proposals/${id}/reject`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Proposal', id }, { type: 'Proposal', id: 'LIST' }],
    }),

    withdrawProposal: builder.mutation<Proposal, string>({
      query: (id) => ({ url: `/proposals/${id}/withdraw`, method: 'PATCH' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Proposal', id }, { type: 'Proposal', id: 'LIST' }],
    }),

    getContracts: builder.query<Paginated<Contract>, void>({
      query: () => '/contracts',
      providesTags: [{ type: 'Contract', id: 'LIST' }],
    }),

    getContractById: builder.query<Contract, string>({
      query: (id) => `/contracts/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Contract', id }],
    }),

    submitMilestone: builder.mutation<{ ok: boolean }, { milestoneId: string; contractId: string; note?: string; attachmentUrls?: string[]; fileBase64?: string; fileName?: string }>({
      query: ({ milestoneId, ...body }) => ({ url: `/milestones/${milestoneId}/submit`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { contractId }) => [{ type: 'Contract', id: contractId }],
    }),

    sendMessage: builder.mutation<any, { roomId: string; text: string; contractId: string }>({
      query: ({ roomId, text }) => ({
        url: `/chat/rooms/${roomId}/messages`,
        method: 'POST',
        body: { body: text },
      }),
      invalidatesTags: (_r, _e, { contractId }) => [{ type: 'Contract', id: contractId }],
    }),

    approveMilestone: builder.mutation<{ ok: boolean }, { milestoneId: string; contractId: string }>({
      query: ({ milestoneId }) => ({ url: `/milestones/${milestoneId}/approve`, method: 'POST' }),
      invalidatesTags: (_r, _e, { contractId }) => [{ type: 'Contract', id: contractId }, 'Wallet'],
    }),

    requestRevision: builder.mutation<{ ok: boolean }, { milestoneId: string; contractId: string; feedback: string }>({
      query: ({ milestoneId, ...body }) => ({ url: `/milestones/${milestoneId}/request-revision`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { contractId }) => [{ type: 'Contract', id: contractId }],
    }),

    fundMilestone: builder.mutation<{ checkoutUrl: string | null; orderId: string }, { milestoneId: string; contractId: string; paymentMethod?: string }>({
      query: ({ milestoneId, ...body }) => ({ url: `/milestones/${milestoneId}/fund`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { contractId }) => [{ type: 'Contract', id: contractId }, 'Wallet'],
    }),

    verifyFunding: builder.mutation<{ ok: boolean }, { milestoneId: string; contractId: string; sessionId: string }>({
      query: ({ milestoneId, ...body }) => ({ url: `/milestones/${milestoneId}/verify-funding`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { contractId }) => [{ type: 'Contract', id: contractId }, 'Wallet'],
    }),

    raiseDispute: builder.mutation<{ ok: boolean }, { milestoneId: string; contractId: string; reason: string }>({
      query: ({ milestoneId, ...body }) => ({ url: `/milestones/${milestoneId}/dispute`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { contractId }) => [{ type: 'Contract', id: contractId }],
    }),

    submitReview: builder.mutation<{ ok: boolean }, { contractId: string; rating: number; commRating?: number; qualityRating?: number; comment?: string }>({
      query: ({ contractId, ...body }) => ({ url: `/contracts/${contractId}/reviews`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { contractId }) => [{ type: 'Contract', id: contractId }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetProposalsQuery,
  useSubmitProposalMutation,
  useShortlistProposalMutation,
  useAcceptProposalMutation,
  useRejectProposalMutation,
  useWithdrawProposalMutation,
  useGetContractsQuery,
  useGetContractByIdQuery,
  useSubmitMilestoneMutation,
  useApproveMilestoneMutation,
  useRequestRevisionMutation,
  useFundMilestoneMutation,
  useVerifyFundingMutation,
  useRaiseDisputeMutation,
  useSubmitReviewMutation,
  useSendMessageMutation,
} = contractsApi;
