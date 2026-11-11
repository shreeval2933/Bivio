'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error(error);
  }, [error]);

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
        py: 6,
      }}
    >
      {/* Background Accent Blurs */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.05) 0%, rgba(255, 255, 255, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, rgba(255, 255, 255, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
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
            <ReportProblemIcon sx={{ fontSize: 48 }} />
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
            Something Went Wrong!
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}
          >
            Our servers encountered an unexpected issue while rendering this page. The engineering team has been automatically notified. Please try reloading the page or head back to safety.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            <Button
              onClick={() => reset()}
              variant="contained"
              color="primary"
              size="large"
              startIcon={<RefreshIcon />}
              sx={{ px: 4, py: 1.5, borderRadius: 2.5 }}
            >
              Try Again
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
                '&:hover': {
                  borderColor: 'text.secondary',
                  bgcolor: 'rgba(0, 0, 0, 0.02)',
                },
              }}
            >
              Go to Home Page
            </Button>
          </Stack>

          {/* Diagnostic Details for debugging */}
          <Accordion
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '12px !important',
              bgcolor: '#f8fafc',
              textAlign: 'left',
              overflow: 'hidden',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ px: 3, py: 0.5 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Show Diagnostics Details
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: 'error.main',
                  fontSize: '0.85rem',
                  bgcolor: 'rgba(239, 68, 68, 0.03)',
                  p: 2,
                  borderRadius: 2,
                  border: '1px dashed rgba(239, 68, 68, 0.2)',
                }}
              >
                {error.message || 'Unknown application error'}
                {error.digest && `\nDigest ID: ${error.digest}`}
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>
      </Container>
    </Box>
  );
}
