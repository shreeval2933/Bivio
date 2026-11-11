'use client';

import { useEffect } from 'react';
import { useAppSelector } from './useAppSelector';
import { getSocket } from '@/lib/socket';

/**
 * Subscribes to a socket event for the lifetime of the component.
 * No-ops while unauthenticated, and while NEXT_PUBLIC_USE_MOCKS is on there is
 * no server to connect to — the guard below keeps development quiet.
 */
export const useSocket = (
  eventName?: string,
  handler?: (...args: unknown[]) => void,
) => {
  const token = useAppSelector((state) => state.auth.accessToken);
  const socketsEnabled = process.env.NEXT_PUBLIC_USE_MOCKS === 'false';

  useEffect(() => {
    if (!socketsEnabled || !token) return;

    const socket = getSocket(token);
    if (!socket.connected) socket.connect();

    if (eventName && handler) socket.on(eventName, handler);

    return () => {
      if (eventName && handler) socket.off(eventName, handler);
    };
  }, [socketsEnabled, token, eventName, handler]);

  return socketsEnabled && token ? getSocket(token) : null;
};
