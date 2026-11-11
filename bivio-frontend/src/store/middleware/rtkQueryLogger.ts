import { isRejectedWithValue, isFulfilled, Middleware } from '@reduxjs/toolkit';
import { showNotification } from '../slices/notificationSlice';

export const rtkQueryLogger: Middleware = (api) => (next) => (action: any) => {
  // 1. Capture rejected API calls (Errors)
  if (isRejectedWithValue(action)) {
    const payload = action.payload as any;
    const message =
      payload?.data?.message ||
      payload?.data?.error ||
      payload?.error ||
      'An unexpected error occurred. Please try again.';

    api.dispatch(
      showNotification({
        message,
        severity: 'error',
      })
    );
  }

  // 2. Capture successful mutations (Write Operations like POST/PUT/DELETE)
  if (isFulfilled(action)) {
    if (action.type?.endsWith('executeMutation/fulfilled')) {
      const endpointName = action.meta?.arg?.endpointName;
      if (endpointName !== 'sendMessage' && endpointName !== 'sendChatMessage') {
        const payload = action.payload as any;
        const message = payload?.message || 'Action completed successfully!';

        api.dispatch(
          showNotification({
            message,
            severity: 'success',
          })
        );
      }
    }
  }

  return next(action);
};
