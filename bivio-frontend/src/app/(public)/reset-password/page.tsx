'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  LinearProgress,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useResetPasswordMutation } from '@/store/api/authApi';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [resetPassword, { isLoading, isError }] = useResetPasswordMutation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [token, setToken] = useState('');

  // Extract reset token from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, []);

  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const getStrengthColor = (score: number) => {
    if (score <= 25) return 'error';
    if (score <= 75) return 'warning';
    return 'success';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      await resetPassword({ token: token || 'mock-reset-token', password }).unwrap();
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Invalid or expired reset token.');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8, md: 10 } }}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <LockIcon sx={{ color: 'primary.main', fontSize: 64 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, textAlign: 'center', mb: 1 }}>
            Set new password
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
            Please choose a strong password that is at least 8 characters long.
          </Typography>

          {success ? (
            <Stack spacing={3}>
              <Alert severity="success">
                Your password has been reset successfully! You can now log in with your new credentials.
              </Alert>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => router.push('/login')}
              >
                Go to Login
              </Button>
            </Stack>
          ) : (
            <Stack component="form" spacing={3} onSubmit={handleSubmit}>
              {(isError || errorMsg) && (
                <Alert severity="error">
                  {errorMsg || 'Failed to reset password. Please try requesting a new reset link.'}
                </Alert>
              )}

              <TextField
                label="New Password"
                type="password"
                required
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {password && (
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Password strength
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {getPasswordStrength() <= 25 ? 'Weak' : getPasswordStrength() <= 75 ? 'Medium' : 'Strong'}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={getPasswordStrength()}
                    color={getStrengthColor(getPasswordStrength())}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}

              <TextField
                label="Confirm Password"
                type="password"
                required
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button type="submit" variant="contained" size="large" disabled={isLoading}>
                {isLoading ? 'Resetting password...' : 'Reset password'}
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
