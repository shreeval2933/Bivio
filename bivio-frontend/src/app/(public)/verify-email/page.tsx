'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useVerifyEmailMutation, useResendVerificationMutation } from '@/store/api/authApi';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: isResending }] = useResendVerificationMutation();

  const [status, setStatus] = useState<'AWAITING' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>('AWAITING');
  const [email, setEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email');
      if (urlEmail) {
        setEmail(urlEmail);
      }
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        setStatus('VERIFYING');
        verifyEmail({ token })
          .unwrap()
          .then(() => setStatus('SUCCESS'))
          .catch(() => setStatus('ERROR'));
      }
    }
  }, [verifyEmail]);

  const handleResend = async () => {
    if (!email) return;
    try {
      await resendVerification({ email }).unwrap();
      setResendSuccess(true);
      setCountdown(60);
    } catch (err) {
      console.warn('Failed to resend email verification:', err);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8, md: 10 } }}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 }, textAlign: 'center' }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <MarkEmailReadIcon sx={{ color: 'primary.main', fontSize: 64 }} />
          </Box>

          {status === 'AWAITING' && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Verify your email
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                We sent a verification link to your email address{email ? ` (${email})` : ''}. Please click the link in the email to complete registration.
              </Typography>

              {email && (
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleResend}
                    disabled={countdown > 0 || isResending}
                    fullWidth
                  >
                    {countdown > 0 ? `Resend email in ${countdown}s` : 'Resend verification email'}
                  </Button>
                  {resendSuccess && (
                    <Alert severity="success" sx={{ textAlign: 'left' }}>
                      Verification email resent! Please check your inbox (and spam folder).
                    </Alert>
                  )}
                </Stack>
              )}
            </>
          )}

          {status === 'VERIFYING' && (
            <Box sx={{ py: 4 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Verifying token...
              </Typography>
            </Box>
          )}

          {status === 'SUCCESS' && (
            <>
              <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
                Your email has been verified successfully!
              </Alert>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Account Activated
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Thank you for verifying your email. You can now log in to access your dashboard.
              </Typography>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => router.push('/login')}
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'ERROR' && (
            <>
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                The verification link is invalid or has expired.
              </Alert>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => setStatus('AWAITING')}
              >
                Try Again
              </Button>
            </>
          )}

          <Box sx={{ mt: 4 }}>
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
