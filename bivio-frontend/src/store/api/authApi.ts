import { baseApi } from './baseApi';
import type { User } from '@/types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  role: 'CANDIDATE' | 'RECRUITER';
  jobTitle?: string;
  companyName?: string;
  contactNumber?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),

    register: builder.mutation<AuthResponse, RegisterInput>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),

    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),

    verifyEmail: builder.mutation<{ ok: boolean }, { token: string }>({
      query: (body) => ({ url: '/auth/verify-email', method: 'POST', body }),
    }),

    resendVerification: builder.mutation<{ ok: boolean }, { email: string }>({
      query: (body) => ({ url: '/auth/resend-verification', method: 'POST', body }),
    }),

    forgotPassword: builder.mutation<{ ok: boolean }, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),

    resetPassword: builder.mutation<{ ok: boolean }, { token: string; password: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),

    googleLogin: builder.mutation<AuthResponse, { credential: string; role?: 'CANDIDATE' | 'RECRUITER' }>({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
    }),

    getMe: builder.query<User, void>({
      query: () => '/me',
      providesTags: [{ type: 'Profile', id: 'ME' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGoogleLoginMutation,
  useGetMeQuery,
} = authApi;
