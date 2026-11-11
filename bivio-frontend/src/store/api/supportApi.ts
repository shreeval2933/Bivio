import { baseApi } from './baseApi';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  issueType: string;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  adminReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  repliedByAdmin?: {
    fullName: string;
  } | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    profileImage?: string | null;
  } | null;
}

export interface SubmitTicketInput {
  issueType: string;
  description: string;
  subject?: string;
}

export const supportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyTickets: builder.query<SupportTicket[], void>({
      query: () => '/support/tickets/my',
      providesTags: [{ type: 'Settings', id: 'MY_TICKETS' }],
    }),

    submitSupportTicket: builder.mutation<SupportTicket, SubmitTicketInput>({
      query: (body) => ({
        url: '/support/tickets',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Settings', id: 'MY_TICKETS' },
        { type: 'Settings', id: 'ADMIN_TICKETS' },
        { type: 'Settings', id: 'DASHBOARD' },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetMyTicketsQuery,
  useSubmitSupportTicketMutation,
} = supportApi;
