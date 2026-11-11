'use client';

import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { hideNotification } from '@/store/slices/notificationSlice';

export function GlobalSnackbar() {
  const dispatch = useDispatch();
  const { open, message, severity } = useSelector((state: RootState) => state.notification);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(hideNotification());
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ zIndex: 1400 }} // Ensure it displays above modals
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        elevation={6}
        sx={{
          width: '100%',
          borderRadius: 2.5,
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
