import { baseApi } from './baseApi';
import type { Wallet, WalletTransaction, Paginated, Payout } from '@/types';

export interface RequestPayoutInput {
  amount: number;
  payoutMethod: string;
  payoutDetails?: Record<string, unknown>;
}

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWallet: builder.query<Wallet, void>({
      query: () => '/wallet',
      providesTags: ['Wallet'],
    }),

    getTransactions: builder.query<Paginated<WalletTransaction>, void>({
      query: () => '/wallet/transactions',
      providesTags: ['Wallet'],
    }),

    getPayouts: builder.query<Payout[], void>({
      query: () => '/payouts',
      providesTags: ['Wallet'],
    }),

    fundMilestone: builder.mutation<{ paymentIntentUrl: string }, { milestoneId: string; contractId: string }>({
      query: ({ milestoneId }) => ({ url: `/milestones/${milestoneId}/fund`, method: 'POST' }),
      invalidatesTags: (_r, _e, { contractId }) => [{ type: 'Contract', id: contractId }],
    }),

    requestPayout: builder.mutation<Payout, RequestPayoutInput>({
      query: (body) => ({ url: '/payouts', method: 'POST', body }),
      invalidatesTags: ['Wallet'],
    }),

    retryPayout: builder.mutation<Payout, string>({
      query: (id) => ({ url: `/payouts/${id}/retry`, method: 'POST' }),
      invalidatesTags: ['Wallet'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetWalletQuery,
  useGetTransactionsQuery,
  useGetPayoutsQuery,
  useFundMilestoneMutation,
  useRequestPayoutMutation,
  useRetryPayoutMutation,
} = paymentsApi;

