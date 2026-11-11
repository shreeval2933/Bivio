import { baseApi } from './baseApi';
import type { Interview } from '@/types';

export interface InterviewsFilter {
  view?: 'upcoming' | 'needs-feedback' | 'past';
}

export interface RescheduleInterviewInput {
  id: string;
  scheduledAt: string;
  durationMinutes?: number;
  mode?: 'ONLINE' | 'PHONE' | 'ONSITE';
  meetingLink?: string;
  location?: string;
  agendaNotes?: string;
}

export interface InterviewFeedbackInput {
  id: string;
  rating: number;
  feedback: string;
  recommendation: 'PROCEED' | 'HOLD' | 'REJECT';
}

export const interviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInterviews: builder.query<Interview[], InterviewsFilter | void>({
      query: (filters) => ({
        url: '/interviews',
        params: (filters ?? {}) as Record<string, unknown>,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Interview' as const, id })),
              { type: 'Interview' as const, id: 'LIST' },
            ]
          : [{ type: 'Interview' as const, id: 'LIST' }],
    }),

    getInterviewById: builder.query<Interview, string>({
      query: (id) => `/interviews/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Interview' as const, id }],
    }),

    rescheduleInterview: builder.mutation<Interview, RescheduleInterviewInput>({
      query: ({ id, ...body }) => ({
        url: `/interviews/${id}/reschedule`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Interview', id },
        { type: 'Interview', id: 'LIST' },
        { type: 'Application' },
      ],
    }),

    submitInterviewFeedback: builder.mutation<Interview, InterviewFeedbackInput>({
      query: ({ id, ...body }) => ({
        url: `/interviews/${id}/feedback`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Interview', id },
        { type: 'Interview', id: 'LIST' },
        { type: 'Application' },
      ],
    }),

    cancelInterview: builder.mutation<Interview, string>({
      query: (id) => ({
        url: `/interviews/${id}/cancel`,
        method: 'PATCH',
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Interview', id },
        { type: 'Interview', id: 'LIST' },
        { type: 'Application' },
      ],
    }),

    getCompanyInterviews: builder.query<Interview[], void>({
      query: () => '/interviews/recruiter/all',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Interview' as const, id })),
              { type: 'Interview' as const, id: 'LIST' },
            ]
          : [{ type: 'Interview' as const, id: 'LIST' }],
    }),

    getCalendarInterviews: builder.query<Interview[], { startDate: string; endDate: string }>({
      query: (params) => ({
        url: '/interviews/calendar',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Interview' as const, id })),
              { type: 'Interview' as const, id: 'LIST' },
            ]
          : [{ type: 'Interview' as const, id: 'LIST' }],
    }),

    candidateRespondInterview: builder.mutation<Interview, { id: string; status: 'ACCEPTED' | 'DECLINED'; rescheduleReason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/interviews/${id}/candidate-respond`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Interview', id },
        { type: 'Interview', id: 'LIST' },
        { type: 'Application' },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetInterviewsQuery,
  useGetInterviewByIdQuery,
  useRescheduleInterviewMutation,
  useSubmitInterviewFeedbackMutation,
  useCancelInterviewMutation,
  useGetCompanyInterviewsQuery,
  useGetCalendarInterviewsQuery,
  useCandidateRespondInterviewMutation,
} = interviewsApi;
