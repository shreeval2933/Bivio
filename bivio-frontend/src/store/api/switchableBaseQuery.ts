import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { mockRouter } from '@/mocks/mockRouter';
import { setCredentials, logout } from '../slices/authSlice';

/**
 * ============================================================================
 * THE SEAM
 * ============================================================================
 * Every endpoint in this app is defined ONCE, with a normal `query:` block
 * describing the real HTTP call. Nothing in the endpoint definitions or in any
 * page knows whether the data came from a fixture or the network.
 *
 * This function is the only place that decides.
 *
 * TO GO LIVE WHEN THE BACKEND IS READY:
 *   1. set NEXT_PUBLIC_USE_MOCKS=false in .env.local
 *   2. delete the src/mocks/ folder
 *   3. delete this file's `mockRouter` import and the USE_MOCKS branch
 *      (or just delete this file and point baseApi at realBaseQuery)
 *
 * No page, component, hook or endpoint changes. That is the whole point.
 * ============================================================================
 */

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== 'false';

/** Simulated latency so loading states are actually exercised in development. */
const MOCK_LATENCY_MS = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY ?? 400);

export const realBaseQuery = fetchBaseQuery({
  baseUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normalises the two shapes RTK Query allows for `query:` return values. */
function normalise(args: string | FetchArgs): {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  body?: unknown;
} {
  if (typeof args === 'string') return { url: args, method: 'GET' };
  return {
    url: args.url,
    method: (args.method ?? 'GET').toUpperCase(),
    params: args.params as Record<string, unknown> | undefined,
    body: args.body,
  };
}

export const switchableBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  if (!USE_MOCKS) {
    let result = await realBaseQuery(args, api, extraOptions);
    const url = typeof args === 'string' ? args : args.url;
    const isAuthEndpoint = url.includes('/auth/');

    if (result.error && result.error.status === 401 && !isAuthEndpoint) {
      // Attempt to refresh the access token
      const refreshResult = await realBaseQuery(
        { url: '/auth/refresh', method: 'POST' },
        api,
        extraOptions
      );
      if (refreshResult.data) {
        const { accessToken } = refreshResult.data as { accessToken: string };
        const state = api.getState() as RootState;
        if (state.auth.user) {
          api.dispatch(setCredentials({ user: state.auth.user, accessToken }));
        }
        // Retry the original query with the new access token
        result = await realBaseQuery(args, api, extraOptions);
      } else {
        // Refresh failed (or expired session) - log out
        api.dispatch(logout());
      }
    }
    return result;
  }

  const { url, method, params, body } = normalise(args);
  await delay(MOCK_LATENCY_MS);

  try {
    const data = mockRouter({ url, method, params, body });
    if (data === undefined) {
      return {
        error: {
          status: 404,
          data: { error: 'NOT_FOUND', message: `No mock handler for ${method} ${url}` },
        } as FetchBaseQueryError,
      };
    }
    return { data };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Mock handler threw';
    return {
      error: { status: 500, data: { error: 'MOCK_ERROR', message } } as FetchBaseQueryError,
    };
  }
};
