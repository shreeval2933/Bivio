import { createApi } from '@reduxjs/toolkit/query/react';
import { switchableBaseQuery } from './switchableBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: switchableBaseQuery,
  tagTypes: [
    'Job', 'Application', 'Proposal', 'Contract', 'Milestone',
    'Wallet', 'MatchScore', 'Dispute', 'Notification', 'User',
    'Settings', 'Chat', 'Profile', 'Interview',
  ],
  endpoints: () => ({}),
});
