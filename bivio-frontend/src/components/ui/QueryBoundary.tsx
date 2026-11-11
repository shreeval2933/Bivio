'use client';

import { Alert, Box, CircularProgress, Skeleton, Stack } from '@mui/material';
import type { ReactNode } from 'react';
import EmptyState from './EmptyState';

interface QueryBoundaryProps<T> {
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  data: T | undefined;
  /** Rendered when the query succeeds but returns nothing */
  emptyTitle?: string;
  emptyDescription?: string;
  isEmpty?: (data: T) => boolean;
  skeleton?: 'list' | 'card' | 'spinner';
  children: (data: T) => ReactNode;
}

function LoadingView({ variant }: { variant: 'list' | 'card' | 'spinner' }) {
  if (variant === 'spinner') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Stack spacing={2}>
      {Array.from({ length: variant === 'card' ? 3 : 5 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={variant === 'card' ? 140 : 64} />
      ))}
    </Stack>
  );
}

/**
 * Standardises the loading / error / empty / success branches so every page
 * handles them the same way. Because pages go through this, switching from
 * mock data to a real API surfaces genuine loading and error states without
 * any page needing to change.
 */
export default function QueryBoundary<T>({
  isLoading,
  isError,
  error,
  data,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  isEmpty,
  skeleton = 'list',
  children,
}: QueryBoundaryProps<T>) {
  if (isLoading) return <LoadingView variant={skeleton} />;

  if (isError || !data) {
    const message =
      (error as { data?: { message?: string } })?.data?.message ??
      'Could not load this data. Please try again.';
    return <Alert severity="error">{message}</Alert>;
  }

  if (isEmpty?.(data)) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <>{children(data)}</>;
}
