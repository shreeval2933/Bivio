'use client';

import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Stack,
} from '@mui/material';
import LockClockIcon from '@mui/icons-material/LockClock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeIcon from '@mui/icons-material/Home';

export default function SessionExpiredPage() {
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        py: 4,
      }}
    >
      {/* Background Accent Blurs */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          right: '10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              p: 2,
              borderRadius: '50%',
              bgcolor: 'rgba(37, 99, 235, 0.08)',
              color: 'primary.main',
              mb: 3,
            }}
          >
            <LockClockIcon sx={{ fontSize: 48 }} />
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mb: 2,
              fontFamily: 'Outfit, Inter, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            Session Expired
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, px: { xs: 0, sm: 2 }, lineHeight: 1.6 }}
          >
            For your security and protection, your session has timed out due to inactivity or token expiration. Please log in again to continue managing your recruitment and escrow pipelines.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 3 }} justifyContent="center">
            <Button
              component={Link}
              href="/login"
              variant="contained"
              color="primary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 4, py: 1.5, borderRadius: 2.5, order: { xs: 1, sm: 2 } }}
            >
              Log In Again
            </Button>
            <Button
              component={Link}
              href="/"
              variant="outlined"
              color="inherit"
              size="large"
              startIcon={<HomeIcon />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2.5,
                borderColor: 'divider',
                color: 'text.secondary',
                order: { xs: 2, sm: 1 },
                '&:hover': {
                  borderColor: 'text.secondary',
                  bgcolor: 'rgba(0, 0, 0, 0.02)',
                },
              }}
            >
              Go Home
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
