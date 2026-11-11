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
import SecurityIcon from '@mui/icons-material/Security';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function UnauthorizedPage() {
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
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.06) 0%, rgba(255, 255, 255, 0) 70%)',
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
              bgcolor: 'rgba(239, 68, 68, 0.08)',
              color: 'error.main',
              mb: 3,
            }}
          >
            <SecurityIcon sx={{ fontSize: 48 }} />
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
            Access Denied
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, px: { xs: 0, sm: 2 }, lineHeight: 1.6 }}
          >
            You do not have the required permissions to view this resource. This page might require an administrator, recruiter, or candidate account with higher clearance level.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              onClick={() => window.history.back()}
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<ArrowBackIcon />}
              sx={{ px: 4, py: 1.5, borderRadius: 2.5 }}
            >
              Go Back
            </Button>
            <Button
              component={Link}
              href="/"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<HomeIcon />}
              sx={{ px: 4, py: 1.5, borderRadius: 2.5 }}
            >
              Return Home
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
