'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useGetMeQuery } from '@/store/api/authApi';
import { updateUser, logout } from '@/store/slices/authSlice';
import type { Role } from '@/types';
import { FullPageLoader } from './FullPageLoader';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  // Call /me query to validate session and fetch latest user info
  const { data: meData, error, isLoading: isMeLoading } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [checking, setChecking] = useState(true);
  const [isNetworkError, setIsNetworkError] = useState(false);

  // Sync profile data from /me to Redux store
  useEffect(() => {
    if (meData) {
      dispatch(updateUser(meData));
    }
  }, [meData, dispatch]);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // If /me API returned an error (e.g. 401), trigger logout only on auth errors
    if (error) {
      const status = 'status' in error ? error.status : null;
      if (status === 401 || status === 403) {
        dispatch(logout());
        router.replace('/login');
      } else {
        setIsNetworkError(true);
      }
      return;
    }

    // Wait until /me query has loaded if authenticated
    if (isMeLoading) {
      return;
    }

    // Verify roles
    const activeUser = meData || user;
    if (activeUser && !allowedRoles.includes(activeUser.role)) {
      router.replace('/unauthorized');
    } else if (activeUser) {
      setIsNetworkError(false);
      setChecking(false);
    }
  }, [isAuthenticated, user, meData, allowedRoles, router, error, isMeLoading, dispatch]);

  if (isNetworkError) {
    return <FullPageLoader message="Database is waking up (Neon serverless compute). Please refresh this page in a few seconds..." />;
  }

  if (checking || isMeLoading) {
    return <FullPageLoader message="Verifying authentication credentials..." />;
  }

  return <>{children}</>;
}
