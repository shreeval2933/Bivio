'use client';

import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import ForkRightIcon from '@mui/icons-material/ForkRight';

interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({ message = 'Loading Bivio...' }: FullPageLoaderProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          p: 4,
          borderRadius: 4,
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          textAlign: 'center',
        }}
      >
        {/* Animated Brand Logo Icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'rgba(37, 99, 235, 0.08)',
            color: 'primary.main',
            position: 'relative',
            animation: 'pulseLogo 2s infinite ease-in-out',
            '@keyframes pulseLogo': {
              '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.2)' },
              '70%': { transform: 'scale(1)', boxShadow: '0 0 0 10px rgba(37, 99, 235, 0)' },
              '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(37, 99, 235, 0)' },
            },
          }}
        >
          <ForkRightIcon sx={{ fontSize: 36 }} />
        </Box>

        {/* Text and Loader */}
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            size={48}
            thickness={4}
            sx={{
              color: 'primary.main',
              animationDuration: '1s',
            }}
          />
        </Box>

        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: 'slate.800',
            animation: 'pulseText 1.5s infinite ease-in-out',
            '@keyframes pulseText': {
              '0%, 100%': { opacity: 0.6 },
              '50%': { opacity: 1 },
            },
          }}
        >
          {message}
        </Typography>
      </Box>
    </Box>
  );
}
