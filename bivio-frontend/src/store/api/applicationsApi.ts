import { baseApi } from './baseApi';
import type { Application, Paginated, Invitation, Offer, Interview } from '@/types';

export interface ApplicationFilters {
  jobId?: string;
  mine?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}

export interface MoveStageInput {
  id: string;
  jobId: string;
  toStageId: string;
  note?: string;
}

export const applicationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApplications: builder.query<Paginated<Application>, ApplicationFilters | void>({
      query: (filters) => ({ url: '/applications', params: (filters ?? {}) as Record<string, unknown> }),
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: 'Application' as const, id })), { type: 'Application' as const, id: 'LIST' }]
          : [{ type: 'Application' as const, id: 'LIST' }],
    }),

    getApplicationById: builder.query<Application, string>({
      query: (id) => `/applications/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Application', id }],
    }),

    applyToJob: builder.mutation<Application, { jobId: string; resumeId?: string; coverNote?: string }>({
      query: ({ jobId, ...body }) => ({ url: `/jobs/${jobId}/apply`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Application', id: 'LIST' }],
    }),

    withdrawApplication: builder.mutation<Application, string>({
      query: (id) => ({ url: `/applications/${id}/withdraw`, method: 'PATCH' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Application', id }, { type: 'Application', id: 'LIST' }],
    }),

    moveStage: builder.mutation<Application, MoveStageInput>({
      query: ({ id, ...body }) => ({ url: `/applications/${id}/stage`, method: 'PATCH', body }),
      // Optimistic update: the pipeline board must feel instant on drag-drop.
      async onQueryStarted({ id, jobId, toStageId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          applicationsApi.util.updateQueryData('getApplications', { jobId }, (draft) => {
            const app = draft.data.find((a) => a.id === id);
            if (app) app.currentStageId = toStageId;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Application', id }],
    }),

    bulkMoveStage: builder.mutation<void, { applicationIds: string[]; toStageId: string }>({
      query: (body) => ({ url: `/applications/bulk-stage`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Application', id: 'LIST' }],
    }),

    bulkReject: builder.mutation<void, { applicationIds: string[]; reason?: string }>({
      query: (body) => ({ url: `/applications/bulk-reject`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Application', id: 'LIST' }],
    }),

    getInvitations: builder.query<Invitation[], void>({
      query: () => '/invitations',
      providesTags: [{ type: 'Application', id: 'INVITES' }],
    }),

    respondInvitation: builder.mutation<void, { id: string; accept: boolean }>({
      query: ({ id, accept }) => ({ url: `/invitations/${id}/respond`, method: 'PATCH', body: { accept } }),
      invalidatesTags: [{ type: 'Application', id: 'INVITES' }, { type: 'Application', id: 'LIST' }],
    }),

    getOffers: builder.query<Offer[], void>({
      query: () => '/offers',
      providesTags: [{ type: 'Application', id: 'OFFERS' }],
    }),

    withdrawOffer: builder.mutation<Offer, string>({
      query: (id) => ({ url: `/offers/${id}/withdraw`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'Application', id: 'OFFERS' }, { type: 'Application', id: 'LIST' }],
    }),

    respondOffer: builder.mutation<void, { id: string; accept: boolean; rejectionReason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/offers/${id}/respond`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Application', id: 'OFFERS' }, { type: 'Application', id: 'LIST' }],
    }),

    rejectApplication: builder.mutation<Application, { id: string; reason?: string; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/applications/${id}/reject`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Application', id }, { type: 'Application', id: 'LIST' }],
    }),

    scheduleInterview: builder.mutation<Interview, { id: string; roundNo: number; hiringStageId?: string; interviewerId: string; scheduledAt: string; durationMinutes: number; mode: 'ONLINE' | 'PHONE' | 'ONSITE'; meetingLink?: string; location?: string; agendaNotes?: string }>({
      query: ({ id, ...body }) => ({ url: `/applications/${id}/interviews`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Application', id }],
    }),

    extendOffer: builder.mutation<Offer, { id: string; compensation: number; currency?: string; joiningDate?: string; offerLetterUrl?: string; expiresAt?: string }>({
      query: ({ id, ...body }) => ({ url: `/applications/${id}/offer`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Application', id }, { type: 'Application', id: 'OFFERS' }],
    }),

    resendStageEmails: builder.mutation<{ count: number }, { jobId: string; stageId: string }>({
      query: ({ jobId, stageId }) => ({
        url: `/jobs/${jobId}/stages/${stageId}/resend-emails`,
        method: 'POST',
      }),
    }),

    sendInvitation: builder.mutation<void, { jobId: string; candidateId: string; message?: string }>({
      query: ({ jobId, ...body }) => ({ url: `/jobs/${jobId}/invitations`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Application', id: 'INVITES' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetApplicationsQuery,
  useGetApplicationByIdQuery,
  useApplyToJobMutation,
  useWithdrawApplicationMutation,
  useMoveStageMutation,
  useBulkMoveStageMutation,
  useBulkRejectMutation,
  useGetInvitationsQuery,
  useRespondInvitationMutation,
  useGetOffersQuery,
  useWithdrawOfferMutation,
  useRespondOfferMutation,
  useRejectApplicationMutation,
  useScheduleInterviewMutation,
  useExtendOfferMutation,
  useResendStageEmailsMutation,
  useSendInvitationMutation,
} = applicationsApi;
