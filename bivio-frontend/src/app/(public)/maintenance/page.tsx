'use client';

import {
  Container,
  Box,
  Typography,
  Paper,
  Stack,
  LinearProgress,
  Button,
} from '@mui/material';
import EngineeringIcon from '@mui/icons-material/Engineering';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

export default function MaintenancePage() {
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
          right: '10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
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
              bgcolor: 'rgba(13, 148, 136, 0.08)',
              color: 'secondary.main',
              mb: 3,
            }}
          >
            <EngineeringIcon sx={{ fontSize: 48 }} />
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
            Under Scheduled Maintenance
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, px: { xs: 0, sm: 2 }, lineHeight: 1.6 }}
          >
            We are performing essential system upgrades to Bivio to enhance our talent-matching engines and wallet security protocols. We will be back online shortly. Thank you for your patience!
          </Typography>

          <Box sx={{ width: '100%', mb: 4, px: { xs: 0, sm: 4 } }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                System Upgrade Progress
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                75% Completed
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={75}
              color="secondary"
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(13, 148, 136, 0.08)',
              }}
            />
          </Box>

          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
            <Button
              href="mailto:support@bivio.com"
              variant="outlined"
              color="inherit"
              startIcon={<MailOutlineIcon />}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 2,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'text.secondary',
                  bgcolor: 'rgba(0, 0, 0, 0.02)',
                },
              }}
            >
              Contact Support
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
