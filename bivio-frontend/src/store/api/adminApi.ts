import { baseApi } from './baseApi';
import type { Dispute, User, Paginated, RevenueSummary, PlatformSetting, ModerationType } from '@/types';

export interface VerificationRequest {
  id: string;
  recruiterId: string;
  kycType: 'INDIVIDUAL' | 'BUSINESS';
  nameMatch: boolean;
  nameMatchNotes?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  isSecondSubmission: boolean;
  rejectionReason?: string | null;
  clarificationRequested?: string | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  documents: { name: string; url: string }[];
  recruiter?: {
    id: string;
    designation?: string | null;
    isSolo?: boolean;
    user?: {
      id: string;
      fullName: string;
      email: string;
    } | null;
    company?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface AdminUserDetail extends User {
  candidateProfile?: {
    id: string;
    headline?: string | null;
    summary?: string | null;
    location?: string | null;
    skills?: { skill: { name: string } }[];
    portfolio?: { projects: any[] } | null;
  } | null;
  recruiterProfile?: {
    id: string;
    isSolo?: boolean;
    postingFeePaid: boolean;
    kycStatus: string;
    designation?: string | null;
    company?: { id: string; name: string; website?: string } | null;
    kycSubmissions?: { id: string; status: string }[];
  } | null;
  wallet?: {
    id: string;
    availableBalance: string;
    pendingBalance: string;
    currency: string;
  } | null;
  moderationsRecvd?: {
    id: string;
    action: ModerationType;
    reason: string;
    expiresAt?: string | null;
    createdAt: string;
    admin?: { user?: { fullName: string } | null } | null;
  }[];
  disputesRaised?: any[];
  activity?: {
    applications?: number;
    proposals?: number;
    contracts?: number;
    jobsPosted?: number;
  };
  _count?: {
    moderationsRecvd: number;
    disputesRaised: number;
  };
}

export interface AdminDashboardData {
  actionItems: {
    openDisputes: number;
    staleDisputes: number;
    pendingKyc: number;
    failedPayouts: number;
    reportedUsers: number;
    reportedReviews: number;
  };
  kpis: {
    activeUsers: {
      total: number;
      candidates: number;
      recruiters: number;
    };
    openJobs: {
      total: number;
      fullTime: number;
      freelance: number;
    };
    activeContracts: {
      total: number;
      escrowLockedInr: number;
    };
    monthlyRevenue: {
      amountInr: number;
    };
    openDisputes: {
      total: number;
      unassigned: number;
      underReview: number;
    };
    avgResolutionHours: number;
  };
  recentActivities: Array<{
    id: string;
    text: string;
    details: string;
    timestamp: string;
    type: 'dispute' | 'kyc' | 'payout' | 'user';
  }>;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<AdminDashboardData, void>({
      query: () => '/admin/dashboard/stats',
      providesTags: [{ type: 'Settings', id: 'DASHBOARD' }],
    }),

    getDisputes: builder.query<Dispute[], { status?: string } | void>({
      query: (filters) => ({ url: '/admin/disputes', params: (filters ?? {}) as Record<string, unknown> }),
      providesTags: [{ type: 'Dispute', id: 'LIST' }],
    }),

    getDisputeDetail: builder.query<any, string>({
      query: (id) => `/admin/disputes/${id}`,
      providesTags: (result, error, id) => [{ type: 'Dispute', id }],
    }),

    assignDispute: builder.mutation<Dispute, string>({
      query: (id) => ({ url: `/admin/disputes/${id}/assign`, method: 'PATCH' }),
      invalidatesTags: (result, error, id) => [{ type: 'Dispute', id }, { type: 'Dispute', id: 'LIST' }],
    }),

    resolveDispute: builder.mutation<Dispute, { id: string; resolutionNote: string; amountToFreelancer: number; amountToClient: number }>({
      query: ({ id, ...body }) => ({ url: `/admin/disputes/${id}/resolve`, method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Dispute', id }, { type: 'Dispute', id: 'LIST' }],
    }),

    escalateDispute: builder.mutation<any, { id: string; escalationReason: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/disputes/${id}/escalate`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Dispute', id }, { type: 'Dispute', id: 'LIST' }],
    }),

    getPlatformUsers: builder.query<Paginated<AdminUserDetail>, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: '/admin/users', params: (params ?? {}) as Record<string, unknown> }),
      providesTags: [{ type: 'User', id: 'LIST' }],
    }),

    getUserDetail: builder.query<AdminUserDetail, string>({
      query: (id) => `/admin/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    moderateUser: builder.mutation<{ ok: boolean }, { id: string; action: ModerationType; reason: string; expiresAt?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}/moderate`, method: 'POST', body }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    resetUserPassword: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/admin/users/${id}/reset-password`, method: 'POST' }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    impersonateUser: builder.mutation<{ accessToken: string; expiresIn: string; impersonatingUser: any }, { id: string; reason: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}/impersonate`, method: 'POST', body }),
    }),

    getFinancials: builder.query<RevenueSummary, void>({
      query: () => '/admin/financials',
      providesTags: [{ type: 'Settings', id: 'FINANCIALS' }],
    }),

    getSettings: builder.query<PlatformSetting[], void>({
      query: () => '/admin/settings',
      providesTags: [{ type: 'Settings', id: 'LIST' }],
    }),

    getSettingsAuditLogs: builder.query<any[], void>({
      query: () => '/admin/settings/audit-logs',
      providesTags: [{ type: 'Settings', id: 'AUDIT' }],
    }),

    updateSetting: builder.mutation<PlatformSetting, { key: string; value: string }>({
      query: ({ key, ...body }) => ({ url: `/admin/settings/${key}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Settings', id: 'LIST' }, { type: 'Settings', id: 'AUDIT' }],
    }),

    getVerifications: builder.query<VerificationRequest[], { status?: string } | void>({
      query: (filters) => ({ url: '/admin/verifications', params: (filters ?? {}) as Record<string, unknown> }),
      providesTags: [{ type: 'Profile', id: 'LIST' }],
    }),

    approveVerification: builder.mutation<any, { id: string; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/verifications/${id}/approve`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Profile', id: 'LIST' }, { type: 'Profile', id: 'ME' }],
    }),

    rejectVerification: builder.mutation<any, { id: string; reason: string; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/verifications/${id}/reject`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Profile', id: 'LIST' }, { type: 'Profile', id: 'ME' }],
    }),

    requestVerificationInfo: builder.mutation<any, { id: string; message: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/verifications/${id}/request-info`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Profile', id: 'LIST' }, { type: 'Profile', id: 'ME' }],
    }),

    getAdminTickets: builder.query<any[], { status?: string } | void>({
      query: (filters) => ({ url: '/admin/support/tickets', params: (filters ?? {}) as Record<string, unknown> }),
      providesTags: [{ type: 'Settings', id: 'ADMIN_TICKETS' }],
    }),

    replySupportTicket: builder.mutation<any, { id: string; reply: string; status?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/support/tickets/${id}/reply`, method: 'POST', body }),
      invalidatesTags: [
        { type: 'Settings', id: 'ADMIN_TICKETS' },
        { type: 'Settings', id: 'MY_TICKETS' },
        { type: 'Settings', id: 'DASHBOARD' },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetDashboardStatsQuery,
  useGetDisputesQuery,
  useGetDisputeDetailQuery,
  useAssignDisputeMutation,
  useResolveDisputeMutation,
  useEscalateDisputeMutation,
  useGetPlatformUsersQuery,
  useGetUserDetailQuery,
  useModerateUserMutation,
  useResetUserPasswordMutation,
  useImpersonateUserMutation,
  useGetFinancialsQuery,
  useGetSettingsQuery,
  useGetSettingsAuditLogsQuery,
  useUpdateSettingMutation,
  useGetVerificationsQuery,
  useApproveVerificationMutation,
  useRejectVerificationMutation,
  useRequestVerificationInfoMutation,
  useGetAdminTicketsQuery,
  useReplySupportTicketMutation,
} = adminApi;
