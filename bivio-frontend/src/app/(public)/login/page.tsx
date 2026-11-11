'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container, Card, CardContent, Typography, TextField, Button,
  Stack, Divider, Alert, Chip, Box,
} from '@mui/material';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useLoginMutation, useGoogleLoginMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setCredentials } from '@/store/slices/authSlice';
import type { Role } from '@/types';
import { GoogleMockPopup } from '@/components/common/GoogleMockPopup';

const HOME_BY_ROLE: Record<Role, string> = {
  CANDIDATE: '/dashboard',
  RECRUITER: '/recruiter/dashboard',
  ADMIN: '/admin/dashboard',
};

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading, isError }] = useLoginMutation();
  const [googleLogin, { isLoading: isGoogleLoading }] = useGoogleLoginMutation();

  const [role, setRole] = useState<'CANDIDATE' | 'RECRUITER'>('CANDIDATE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleOpen, setGoogleOpen] = useState(false);

  const handleGoogleSelect = async (credential: string) => {
    try {
      const result = await googleLogin({ credential, role }).unwrap();
      dispatch(setCredentials(result));
      router.push(HOME_BY_ROLE[result.user.role]);
    } catch (err: any) {
      console.warn('Google login failed:', err);
    }
  };

  const doLogin = async (loginEmail: string) => {
    try {
      const result = await login({ email: loginEmail, password: password || 'demo' }).unwrap();
      dispatch(setCredentials(result));
      router.push(HOME_BY_ROLE[result.user.role]);
    } catch (err: any) {
      console.warn('Failed to login:', err);
      const message = err?.data?.message || err?.message || '';
      if (message.toLowerCase().includes('verify your email')) {
        router.push(`/verify-email?email=${encodeURIComponent(loginEmail)}`);
      }
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8, md: 10 } }}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <ForkRightIcon sx={{ color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Log in to Bivio
            </Typography>
          </Stack>

          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Could not log in. Check your details and try again.
            </Alert>
          )}

          <Stack
            component="form"
            spacing={2}
            onSubmit={(e) => {
              e.preventDefault();
              if (email) void doLogin(email);
            }}
          >
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={role}
              onChange={(_e, v) => v && setRole(v)}
              sx={{ mb: 1 }}
            >
              <ToggleButton value="CANDIDATE">
                <PersonSearchIcon sx={{ mr: 1 }} fontSize="small" />
                Candidate
              </ToggleButton>
              <ToggleButton value="RECRUITER">
                <BusinessCenterIcon sx={{ mr: 1 }} fontSize="small" />
                Recruiter
              </ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
              <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                  Forgot password?
                </Typography>
              </Link>
            </Box>
            <Button type="submit" variant="contained" size="large" disabled={isLoading}>
              {isLoading ? 'Logging in…' : 'Log In'}
            </Button>
          </Stack>

          {role === 'CANDIDATE' && (
            <>
              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  or continue with
                </Typography>
              </Divider>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={() => setGoogleOpen(true)}
                disabled={isGoogleLoading}
                startIcon={
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9577 15.8195L12.0491 13.5614C11.2418 14.1027 10.2109 14.4273 9 14.4273C6.65591 14.4273 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                    <path d="M9 3.57273C10.3214 3.57273 11.5077 4.02955 12.4405 4.92136L15.0218 2.34C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57273 9 3.57273Z" fill="#EA4335"/>
                  </svg>
                }
                sx={{
                  borderColor: 'divider',
                  fontWeight: 600,
                  py: 1.25,
                  '&:hover': {
                    bgcolor: '#f8fafc',
                    borderColor: 'text.secondary',
                  },
                }}
              >
                {isGoogleLoading ? 'Connecting…' : 'Sign in with Google'}
              </Button>
            </>
          )}


          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              New here?{' '}
              <Link href="/register" style={{ fontWeight: 700 }}>
                Create an account
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <GoogleMockPopup
        open={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onSelect={handleGoogleSelect}
      />
    </Container>
  );
}
