'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Box,
  Alert,
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useForgotPasswordMutation } from '@/store/api/authApi';

export default function ForgotPasswordPage() {
  const [forgotPassword, { isLoading, isError }] = useForgotPasswordMutation();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      await forgotPassword({ email }).unwrap();
      setSubmitted(true);
    } catch {
      // Mock router always succeeds
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8, md: 10 } }}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <LockOpenIcon sx={{ color: 'primary.main', fontSize: 64 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, textAlign: 'center', mb: 1 }}>
            Forgot password?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
            No worries! Enter your email below and we will send you a link to reset your password.
          </Typography>

          {submitted ? (
            <Stack spacing={3}>
              <Alert severity="success">
                A password reset link has been sent to <strong>{email}</strong>. Please check your inbox and spam folders.
              </Alert>
              {/* Simulate Reset Link Click button removed */}
            </Stack>
          ) : (
            <Stack component="form" spacing={3} onSubmit={handleSubmit}>
              {isError && (
                <Alert severity="error">
                  An error occurred. Please verify your email and try again.
                </Alert>
              )}

              <TextField
                label="Email Address"
                type="email"
                required
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button type="submit" variant="contained" size="large" disabled={isLoading}>
                {isLoading ? 'Sending link...' : 'Send reset link'}
              </Button>
            </Stack>
          )}

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              <KeyboardArrowLeftIcon fontSize="small" color="primary" />
              <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                Back to login
              </Typography>
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
