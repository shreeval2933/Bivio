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
import CallSplitIcon from '@mui/icons-material/CallSplit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';

export default function NotFound() {
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
          top: '15%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, rgba(255, 255, 255, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          left: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.06) 0%, rgba(255, 255, 255, 0) 70%)',
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
              p: 2.5,
              borderRadius: '50%',
              bgcolor: 'rgba(13, 148, 136, 0.08)',
              color: 'secondary.main',
              mb: 3,
              transform: 'rotate(90deg)', // Pointing the fork upwards/sideways
            }}
          >
            <CallSplitIcon sx={{ fontSize: 54 }} />
          </Box>

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '5rem', md: '6rem' },
              fontWeight: 900,
              lineHeight: 1,
              mb: 1,
              background: 'linear-gradient(to right, #2563eb, #0d9488)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'Outfit, Inter, sans-serif',
            }}
          >
            404
          </Typography>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mb: 2,
              fontFamily: 'Outfit, Inter, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            Lost at the Fork?
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, px: { xs: 0, sm: 2 }, lineHeight: 1.6 }}
          >
            The route you're trying to reach doesn't exist, has been moved, or is temporarily unavailable. Double-check the URL or choose a path below.
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
              Back to Home
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
